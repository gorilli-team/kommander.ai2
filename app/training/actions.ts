
'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { connectToDatabase, getGridFSBucket } from '@/backend/lib/mongodb';
import { FaqSchema, type Faq } from '@/backend/schemas/faq';
import { ObjectId, type GridFSFile } from 'mongodb';
import { Readable } from 'stream';
import { auth } from '@/frontend/auth'; // Import auth for session

// FAQ Types
export type FaqDisplayItem = Omit<Faq, 'createdAt' | 'updatedAt' | 'userId'> & {
  createdAt?: string;
  updatedAt?: string;
  // userId is implicitly handled by server actions
};

// Raw File Metadata Type for GridFS
export type DocumentDisplayItem = {
  id: string; // MongoDB _id of the metadata document
  fileName: string;
  originalFileType: string;
  uploadedAt?: string;
  gridFsFileId: string; // ObjectId of the file in GridFS, as string
  length: number; // File size
  // userId is implicitly handled by server actions
};


// FAQ Actions
export async function createFaq(data: unknown) {
  console.log('[app/training/actions.ts] createFaq: Received data:', data);
  
  const session = await auth();
  if (!session?.user?.id) {
    console.error('[app/training/actions.ts] createFaq: User not authenticated.');
    return { error: 'User not authenticated. Please log in.' };
  }
  const userId = session.user.id;

  // We don't expect userId from the client, so we parse without it first
  const clientDataSchema = FaqSchema.omit({ userId: true });
  const validatedClientFields = clientDataSchema.safeParse(data);

  if (!validatedClientFields.success) {
    console.error('[app/training/actions.ts] createFaq: Validation failed:', validatedClientFields.error.flatten().fieldErrors);
    return { error: 'Invalid fields.', details: validatedClientFields.error.flatten().fieldErrors };
  }

  const { question, answer } = validatedClientFields.data;
  console.log('[app/training/actions.ts] createFaq: Validated data for user:', userId, { question, answer });

  try {
    const { db } = await connectToDatabase();
    console.log('[app/training/actions.ts] createFaq: Connected to database.');
    const result = await db.collection<Omit<Faq, 'id'>>('faqs').insertOne({
      userId, // Add userId
      question,
      answer,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    console.log('[app/training/actions.ts] createFaq: FAQ inserted with ID:', result.insertedId, 'for user:', userId);
    revalidatePath('/training');
    return { success: 'FAQ created successfully.', id: result.insertedId.toString() };
  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown database error during FAQ creation.';
    console.error('[app/training/actions.ts] createFaq: Database error for user', userId, ':', errorMessage);
    return { error: `Database error: Failed to create FAQ. ${errorMessage}` };
  }
}

export async function getFaqs(): Promise<FaqDisplayItem[]> {
  console.log('[app/training/actions.ts] getFaqs: Fetching FAQs...');
  
  const session = await auth();
  if (!session?.user?.id) {
    console.error('[app/training/actions.ts] getFaqs: User not authenticated.');
    return []; // Return empty if not authenticated
  }
  const userId = session.user.id;
  console.log('[app/training/actions.ts] getFaqs: Fetching FAQs for user:', userId);

  try {
    const { db } = await connectToDatabase();
    const faqsFromDb = await db.collection('faqs').find({ userId: userId }).sort({ createdAt: -1 }).toArray();
    console.log(`[app/training/actions.ts] getFaqs: Fetched ${faqsFromDb.length} FAQs for user: ${userId}.`);
    
    return faqsFromDb.map(faqDbObject => {
      const plainFaq: FaqDisplayItem = {
        id: faqDbObject._id.toString(),
        question: faqDbObject.question,
        answer: faqDbObject.answer,
      };
      if (faqDbObject.createdAt && faqDbObject.createdAt instanceof Date) {
        plainFaq.createdAt = faqDbObject.createdAt.toISOString();
      }
      if (faqDbObject.updatedAt && faqDbObject.updatedAt instanceof Date) {
        plainFaq.updatedAt = faqDbObject.updatedAt.toISOString();
      }
      return plainFaq;
    });
  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error fetching FAQs.';
    console.error('[app/training/actions.ts] getFaqs: Error fetching FAQs for user', userId, ':', errorMessage);
    return [];
  }
}

export async function updateFaq(id: string, data: unknown) {
  console.log(`[app/training/actions.ts] updateFaq: Updating FAQ with ID: ${id}`, data);
  
  const session = await auth();
  if (!session?.user?.id) {
    console.error('[app/training/actions.ts] updateFaq: User not authenticated.');
    return { error: 'User not authenticated. Please log in.' };
  }
  const userId = session.user.id;

  if (!ObjectId.isValid(id)) {
    console.error('[app/training/actions.ts] updateFaq: Invalid FAQ ID.');
    return { error: 'Invalid FAQ ID.' };
  }
  const clientDataSchema = FaqSchema.omit({ userId: true }); // Client doesn't send userId
  const validatedFields = clientDataSchema.safeParse(data);


  if (!validatedFields.success) {
    console.error('[app/training/actions.ts] updateFaq: Validation failed:', validatedFields.error.flatten().fieldErrors);
    return { error: 'Invalid fields.', details: validatedFields.error.flatten().fieldErrors };
  }

  const { question, answer } = validatedFields.data;
  console.log('[app/training/actions.ts] updateFaq: Validated data for user:', userId, { question, answer });

  try {
    const { db } = await connectToDatabase();
    const result = await db.collection('faqs').updateOne(
      { _id: new ObjectId(id), userId: userId }, // Ensure FAQ belongs to the user
      { $set: { question, answer, updatedAt: new Date() } }
    );

    if (result.matchedCount === 0) {
      console.warn(`[app/training/actions.ts] updateFaq: FAQ not found or user ${userId} not authorized to update ID ${id}.`);
      return { error: 'FAQ not found or you are not authorized to update it.' };
    }

    console.log('[app/training/actions.ts] updateFaq: FAQ updated successfully for user:', userId);
    revalidatePath('/training');
    return { success: 'FAQ updated successfully.' };
  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown database error during FAQ update.';
    console.error(`[app/training/actions.ts] updateFaq: Database error for ID ${id}, user ${userId}:`, errorMessage);
    return { error: `Database error: Failed to update FAQ. ${errorMessage}` };
  }
}

export async function deleteFaq(id: string) {
  console.log(`[app/training/actions.ts] deleteFaq: Deleting FAQ with ID: ${id}`);
  
  const session = await auth();
  if (!session?.user?.id) {
    console.error('[app/training/actions.ts] deleteFaq: User not authenticated.');
    return { error: 'User not authenticated. Please log in.' };
  }
  const userId = session.user.id;

   if (!ObjectId.isValid(id)) {
    console.error('[app/training/actions.ts] deleteFaq: Invalid FAQ ID.');
    return { error: 'Invalid FAQ ID.' };
  }
  try {
    const { db } = await connectToDatabase();
    const result = await db.collection('faqs').deleteOne({ _id: new ObjectId(id), userId: userId }); // Ensure FAQ belongs to the user

    if (result.deletedCount === 0) {
      console.warn(`[app/training/actions.ts] deleteFaq: FAQ not found or user ${userId} not authorized to delete ID ${id}.`);
      return { error: 'FAQ not found or you are not authorized to delete it.' };
    }

    console.log('[app/training/actions.ts] deleteFaq: FAQ deleted successfully for user:', userId);
    revalidatePath('/training');
    return { success: 'FAQ deleted successfully.' };
  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown database error during FAQ deletion.';
    console.error(`[app/training/actions.ts] deleteFaq: Database error for ID ${id}, user ${userId}:`, errorMessage);
    return { error: `Database error: Failed to delete FAQ. ${errorMessage}` };
  }
}

// Document Actions - GridFS based
const MaxFileSize = 5 * 1024 * 1024; // 5MB
const AcceptedFileTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];

export async function uploadFileAndProcess(formData: FormData): Promise<{ success?: string; error?: string; fileId?: string }> {
  console.log('[app/training/actions.ts] uploadFileAndProcess (GridFS): BEGIN.');
  
  const session = await auth();
  if (!session?.user?.id) {
    console.error('[app/training/actions.ts] uploadFileAndProcess: User not authenticated.');
    return { error: 'User not authenticated. Please log in.' };
  }
  const userId = session.user.id;

  const file = formData.get('file') as File | null;

  if (!file) {
    console.error('[app/training/actions.ts] uploadFileAndProcess (GridFS): No file uploaded.');
    return { error: 'No file uploaded.' };
  }
  console.log(`[app/training/actions.ts] uploadFileAndProcess (GridFS): File received for user ${userId}: ${file.name}, Type: ${file.type}, Size: ${file.size}`);

  if (file.size > MaxFileSize) {
    console.error(`[app/training/actions.ts] uploadFileAndProcess (GridFS): File size exceeds limit for user ${userId}: ${file.size}`);
    return { error: `File size exceeds ${MaxFileSize / (1024 * 1024)}MB limit.` };
  }

  if (!AcceptedFileTypes.includes(file.type)) {
    console.error(`[app/training/actions.ts] uploadFileAndProcess (GridFS): Invalid file type for user ${userId}: ${file.type}`);
    return { error: 'Invalid file type. Only PDF, DOCX, TXT are allowed.' };
  }
  
  try {
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const bucket = await getGridFSBucket();
    const readableStream = new Readable();
    readableStream.push(fileBuffer);
    readableStream.push(null); 

    const uploadStream = bucket.openUploadStream(file.name, {
      contentType: file.type,
      metadata: { originalName: file.name, uploadedBy: userId, userId: userId } // Add userId to metadata
    });
    
    await new Promise<void>((resolve, reject) => {
      readableStream.pipe(uploadStream)
        .on('error', (err) => reject(err))
        .on('finish', () => resolve());
    });
    
    const { db } = await connectToDatabase();
    const fileMetaDoc = {
        userId, // Add userId
        fileName: file.name,
        originalFileType: file.type,
        length: file.size,
        gridFsFileId: uploadStream.id,
        uploadedAt: new Date(),
    };

    await db.collection('raw_files_meta').insertOne(fileMetaDoc);
    
    revalidatePath('/training');
    console.log(`[app/training/actions.ts] uploadFileAndProcess (GridFS): END - Success for user ${userId}.`);
    return { success: `File "${file.name}" uploaded and metadata stored.`, fileId: uploadStream.id.toString() };

  } catch (error: any) { 
    const errorMessage = error instanceof Error ? error.message : `Unknown error during file upload for ${file?.name || 'unknown file'}.`;
    console.error(`[app/training/actions.ts] EXCEPTION in uploadFileAndProcess (GridFS) for user ${userId}, file ${file?.name || 'unknown file'}:`, error);
    return { error: `Server error processing ${file?.name || 'unknown file'}: ${errorMessage}` };
  }
}

export async function getUploadedFiles(): Promise<DocumentDisplayItem[]> {
  console.log('[app/training/actions.ts] getUploadedFiles (GridFS): Fetching uploaded files metadata...');
  
  const session = await auth();
  if (!session?.user?.id) {
    console.error('[app/training/actions.ts] getUploadedFiles: User not authenticated.');
    return [];
  }
  const userId = session.user.id;
  console.log('[app/training/actions.ts] getUploadedFiles (GridFS): Fetching files for user:', userId);

  try {
    const { db } = await connectToDatabase();
    const filesFromDb = await db.collection('raw_files_meta')
      .find({ userId: userId }) // Filter by userId
      .project({ fileName: 1, originalFileType: 1, uploadedAt: 1, gridFsFileId: 1, length: 1 })
      .sort({ uploadedAt: -1 })
      .toArray();
    console.log(`[app/training/actions.ts] getUploadedFiles (GridFS): Fetched ${filesFromDb.length} file metadata records for user: ${userId}.`);
    
    return filesFromDb.map(doc => ({
      id: doc._id.toString(),
      fileName: doc.fileName,
      originalFileType: doc.originalFileType,
      uploadedAt: doc.uploadedAt instanceof Date ? doc.uploadedAt.toISOString() : undefined,
      gridFsFileId: doc.gridFsFileId.toString(),
      length: doc.length,
    }));
  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error fetching uploaded files metadata.';
    console.error('[app/training/actions.ts] getUploadedFiles (GridFS): Error fetching files metadata for user', userId, ':', errorMessage);
    return [];
  }
}

export async function deleteDocument(id: string) { 
  console.log(`[app/training/actions.ts] deleteDocument (GridFS): Deleting document metadata with ID: ${id}`);
  
  const session = await auth();
  if (!session?.user?.id) {
    console.error('[app/training/actions.ts] deleteDocument: User not authenticated.');
    return { error: 'User not authenticated. Please log in.' };
  }
  const userId = session.user.id;

  if (!ObjectId.isValid(id)) {
    console.error('[app/training/actions.ts] deleteDocument (GridFS): Invalid metadata document ID.');
    return { error: 'Invalid document ID.' };
  }
  try {
    const { db } = await connectToDatabase();
    // Find the metadata document, ensuring it belongs to the current user
    const metaDoc = await db.collection('raw_files_meta').findOne({ _id: new ObjectId(id), userId: userId });

    if (!metaDoc) {
      console.warn(`[app/training/actions.ts] deleteDocument (GridFS): Metadata document not found for ID: ${id} and user: ${userId}`);
      return { error: 'Document metadata not found or you are not authorized to delete it.' };
    }
    
    const gridFsFileIdToDelete = metaDoc.gridFsFileId as ObjectId;
    console.log(`[app/training/actions.ts] deleteDocument (GridFS): Found GridFS file ID: ${gridFsFileIdToDelete} for metadata ID: ${id}, user: ${userId}`);

    const bucket = await getGridFSBucket();
    try {
      await bucket.delete(gridFsFileIdToDelete);
      console.log(`[app/training/actions.ts] deleteDocument (GridFS): File with GridFS ID ${gridFsFileIdToDelete} deleted from GridFS.`);
    } catch (gridFsError: any) {
        console.warn(`[app/training/actions.ts] deleteDocument (GridFS): Error deleting file from GridFS (ID: ${gridFsFileIdToDelete}), but will proceed to delete metadata: ${gridFsError.message}`);
        if (gridFsError.code !== 'ENOENT' && !gridFsError.message?.includes('File not found')) {
           // If it's not a "file not found" error, maybe we shouldn't delete metadata? For now, we proceed.
        }
    }
    
    // Delete the metadata document (already confirmed it belongs to the user)
    await db.collection('raw_files_meta').deleteOne({ _id: new ObjectId(id), userId: userId });
    console.log(`[app/training/actions.ts] deleteDocument (GridFS): Document metadata with ID ${id} deleted successfully for user ${userId}.`);
    revalidatePath('/training');
    return { success: 'Document and its metadata deleted successfully.' };
  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown database/GridFS error during document deletion.';
    console.error(`[app/training/actions.ts] deleteDocument (GridFS): Database/GridFS error for ID ${id}, user ${userId}:`, errorMessage);
    return { error: `Database error: Failed to delete document. ${errorMessage}` };
  }
}

export async function getFileContent(gridFsFileIdString: string, userId: string): Promise<Buffer | { error: string }> {
  console.log(`[app/training/actions.ts] getFileContent: Attempting to retrieve file with GridFS ID: ${gridFsFileIdString} for user: ${userId}`);
  
  if (!userId) {
    return { error: 'User ID is required to retrieve file content.' };
  }
  if (!ObjectId.isValid(gridFsFileIdString)) {
    return { error: 'Invalid file identifier format.' };
  }
  
  const gridFsFileId = new ObjectId(gridFsFileIdString);

  try {
    // First, verify the file belongs to the user by checking raw_files_meta
    const { db } = await connectToDatabase();
    const metaDoc = await db.collection('raw_files_meta').findOne({ gridFsFileId: gridFsFileId, userId: userId });

    if (!metaDoc) {
      console.warn(`[app/training/actions.ts] getFileContent: File with GridFS ID ${gridFsFileIdString} not found for user ${userId}, or user not authorized.`);
      return { error: 'File not found or you are not authorized to access it.' };
    }
    console.log(`[app/training/actions.ts] getFileContent: User ${userId} authorized for file ${metaDoc.fileName}. Proceeding with GridFS download.`);

    const bucket = await getGridFSBucket();    
    const files = await bucket.find({ _id: gridFsFileId }).toArray(); // GridFS stores _id as ObjectId
    if (files.length === 0) {
      // This case should be rare if metaDoc was found, but good for safety
      return { error: 'File not found in GridFS.' };
    }

    const downloadStream = bucket.openDownloadStream(gridFsFileId);
    
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      downloadStream.on('data', (chunk) => chunks.push(chunk));
      downloadStream.on('error', (err: any) => reject({ error: `Failed to download file: ${err.message}` }));
      downloadStream.on('end', () => resolve(Buffer.concat(chunks)));
    });
  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error retrieving file content.';
    console.error(`[app/training/actions.ts] getFileContent: Exception for user ${userId}, file ID ${gridFsFileIdString}:`, errorMessage);
    return { error: `Error retrieving file: ${errorMessage}` };
  }
}
