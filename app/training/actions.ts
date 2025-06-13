
'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { connectToDatabase, getGridFSBucket } from '@/backend/lib/mongodb'; // Assumes this path resolves to either root backend or src/backend
import { FaqSchema, type Faq } from '@/backend/schemas/faq'; // Assumes this path resolves
import { ObjectId, type GridFSFile } from 'mongodb';
import { Readable } from 'stream';

// FAQ Types
export type FaqDisplayItem = Omit<Faq, 'createdAt' | 'updatedAt'> & {
  createdAt?: string;
  updatedAt?: string;
};

// Raw File Metadata Type for GridFS
export type DocumentDisplayItem = {
  id: string; // MongoDB _id of the metadata document
  fileName: string;
  originalFileType: string;
  uploadedAt?: string;
  gridFsFileId: string; // ObjectId of the file in GridFS, as string
  length: number; // File size
};


// FAQ Actions
export async function createFaq(data: unknown) {
  console.log('[app/training/actions.ts] createFaq: Received data:', data);
  const validatedFields = FaqSchema.safeParse(data);

  if (!validatedFields.success) {
    console.error('[app/training/actions.ts] createFaq: Validation failed:', validatedFields.error.flatten().fieldErrors);
    return { error: 'Invalid fields.', details: validatedFields.error.flatten().fieldErrors };
  }

  const { question, answer } = validatedFields.data;
  console.log('[app/training/actions.ts] createFaq: Validated data:', { question, answer });

  try {
    const { db } = await connectToDatabase();
    console.log('[app/training/actions.ts] createFaq: Connected to database.');
    const result = await db.collection<Omit<Faq, 'id'>>('faqs').insertOne({
      question,
      answer,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    console.log('[app/training/actions.ts] createFaq: FAQ inserted with ID:', result.insertedId);
    revalidatePath('/training');
    return { success: 'FAQ created successfully.', id: result.insertedId.toString() };
  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown database error during FAQ creation.';
    console.error('[app/training/actions.ts] createFaq: Database error:', errorMessage, error.stack);
    return { error: `Database error: Failed to create FAQ. ${errorMessage}` };
  }
}

export async function getFaqs(): Promise<FaqDisplayItem[]> {
  console.log('[app/training/actions.ts] getFaqs: Fetching FAQs...');
  try {
    const { db } = await connectToDatabase();
    const faqsFromDb = await db.collection('faqs').find({}).sort({ createdAt: -1 }).toArray();
    console.log(`[app/training/actions.ts] getFaqs: Fetched ${faqsFromDb.length} FAQs.`);
    
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
    console.error('[app/training/actions.ts] getFaqs: Error fetching FAQs:', errorMessage, error.stack);
    return [];
  }
}

export async function updateFaq(id: string, data: unknown) {
  console.log(`[app/training/actions.ts] updateFaq: Updating FAQ with ID: ${id}`, data);
  if (!ObjectId.isValid(id)) {
    console.error('[app/training/actions.ts] updateFaq: Invalid FAQ ID.');
    return { error: 'Invalid FAQ ID.' };
  }
  const validatedFields = FaqSchema.safeParse(data);

  if (!validatedFields.success) {
    console.error('[app/training/actions.ts] updateFaq: Validation failed:', validatedFields.error.flatten().fieldErrors);
    return { error: 'Invalid fields.', details: validatedFields.error.flatten().fieldErrors };
  }

  const { question, answer } = validatedFields.data;
  console.log('[app/training/actions.ts] updateFaq: Validated data:', { question, answer });

  try {
    const { db } = await connectToDatabase();
    await db.collection('faqs').updateOne(
      { _id: new ObjectId(id) },
      { $set: { question, answer, updatedAt: new Date() } }
    );
    console.log('[app/training/actions.ts] updateFaq: FAQ updated successfully.');
    revalidatePath('/training');
    return { success: 'FAQ updated successfully.' };
  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown database error during FAQ update.';
    console.error(`[app/training/actions.ts] updateFaq: Database error for ID ${id}:`, errorMessage, error.stack);
    return { error: `Database error: Failed to update FAQ. ${errorMessage}` };
  }
}

export async function deleteFaq(id: string) {
  console.log(`[app/training/actions.ts] deleteFaq: Deleting FAQ with ID: ${id}`);
   if (!ObjectId.isValid(id)) {
    console.error('[app/training/actions.ts] deleteFaq: Invalid FAQ ID.');
    return { error: 'Invalid FAQ ID.' };
  }
  try {
    const { db } = await connectToDatabase();
    await db.collection('faqs').deleteOne({ _id: new ObjectId(id) });
    console.log('[app/training/actions.ts] deleteFaq: FAQ deleted successfully.');
    revalidatePath('/training');
    return { success: 'FAQ deleted successfully.' };
  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown database error during FAQ deletion.';
    console.error(`[app/training/actions.ts] deleteFaq: Database error for ID ${id}:`, errorMessage, error.stack);
    return { error: `Database error: Failed to delete FAQ. ${errorMessage}` };
  }
}

// Document Actions - GridFS based
const MaxFileSize = 5 * 1024 * 1024; // 5MB
const AcceptedFileTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];

export async function uploadFileAndProcess(formData: FormData): Promise<{ success?: string; error?: string; fileId?: string }> {
  console.log('[app/training/actions.ts] uploadFileAndProcess (GridFS): Starting raw file upload.');
  const file = formData.get('file') as File | null;

  if (!file) {
    console.error('[app/training/actions.ts] uploadFileAndProcess (GridFS): No file uploaded.');
    return { error: 'No file uploaded.' };
  }
  console.log(`[app/training/actions.ts] uploadFileAndProcess (GridFS): File received: ${file.name}, Type: ${file.type}, Size: ${file.size}`);

  if (file.size > MaxFileSize) {
    console.error(`[app/training/actions.ts] uploadFileAndProcess (GridFS): File size exceeds limit: ${file.size}`);
    return { error: `File size exceeds ${MaxFileSize / (1024 * 1024)}MB limit.` };
  }

  if (!AcceptedFileTypes.includes(file.type)) {
    console.error(`[app/training/actions.ts] uploadFileAndProcess (GridFS): Invalid file type: ${file.type}`);
    return { error: 'Invalid file type. Only PDF, DOCX, TXT are allowed.' };
  }
  
  try {
    console.log('[app/training/actions.ts] uploadFileAndProcess (GridFS): Converting file to buffer...');
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    console.log(`[app/training/actions.ts] uploadFileAndProcess (GridFS): Buffer created, length: ${fileBuffer.length}.`);

    const bucket = await getGridFSBucket();
    console.log(`[app/training/actions.ts] uploadFileAndProcess (GridFS): GridFSBucket obtained for file: ${file.name}`);

    const readableStream = new Readable();
    readableStream.push(fileBuffer);
    readableStream.push(null); 

    const uploadStream = bucket.openUploadStream(file.name, {
      contentType: file.type,
      metadata: { originalName: file.name, uploadedBy: 'system_root_actions' } // Added distinguishing metadata
    });
    
    console.log(`[app/training/actions.ts] uploadFileAndProcess (GridFS): Opened GridFS upload stream for ${file.name} with ID: ${uploadStream.id}`);

    await new Promise<void>((resolve, reject) => {
      readableStream.pipe(uploadStream)
        .on('error', (err) => {
          console.error(`[app/training/actions.ts] uploadFileAndProcess (GridFS): GridFS stream pipe error for ${file.name}:`, err.message, err.stack);
          reject(err);
        })
        .on('finish', () => {
          console.log(`[app/training/actions.ts] uploadFileAndProcess (GridFS): GridFS stream finished for ${file.name}. File ID: ${uploadStream.id}`);
          resolve();
        });
    });
    
    const { db } = await connectToDatabase();
    const fileMetaDoc = {
        fileName: file.name,
        originalFileType: file.type,
        length: file.size,
        gridFsFileId: uploadStream.id,
        uploadedAt: new Date(),
    };

    const result = await db.collection('raw_files_meta').insertOne(fileMetaDoc);
    console.log(`[app/training/actions.ts] uploadFileAndProcess (GridFS): File metadata saved to 'raw_files_meta' for ${file.name}. Inserted ID: ${result.insertedId}`);
    
    revalidatePath('/training');
    return { success: `File "${file.name}" uploaded and metadata stored.`, fileId: uploadStream.id.toString() };

  } catch (error: any) { 
    const errorMessage = error instanceof Error ? error.message : `Unknown error during file upload for ${file?.name || 'unknown file'}.`;
    console.error(`[app/training/actions.ts] EXCEPTION in uploadFileAndProcess (GridFS) for ${file?.name || 'unknown file'}:`, errorMessage, error.stack);
    return { error: `Server error processing ${file?.name || 'unknown file'}: ${errorMessage}` };
  }
}

export async function getUploadedFiles(): Promise<DocumentDisplayItem[]> {
  console.log('[app/training/actions.ts] getUploadedFiles (GridFS): Fetching uploaded files metadata...');
  try {
    const { db } = await connectToDatabase();
    const filesFromDb = await db.collection('raw_files_meta')
      .find({})
      .project({ fileName: 1, originalFileType: 1, uploadedAt: 1, gridFsFileId: 1, length: 1 })
      .sort({ uploadedAt: -1 })
      .toArray();
    console.log(`[app/training/actions.ts] getUploadedFiles (GridFS): Fetched ${filesFromDb.length} file metadata records.`);
    
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
    console.error('[app/training/actions.ts] getUploadedFiles (GridFS): Error fetching uploaded files metadata:', errorMessage, error.stack);
    return [];
  }
}

export async function deleteDocument(id: string) { 
  console.log(`[app/training/actions.ts] deleteDocument (GridFS): Deleting document metadata with ID: ${id}`);
  if (!ObjectId.isValid(id)) {
    console.error('[app/training/actions.ts] deleteDocument (GridFS): Invalid metadata document ID.');
    return { error: 'Invalid document ID.' };
  }
  try {
    const { db } = await connectToDatabase();
    const metaDoc = await db.collection('raw_files_meta').findOne({ _id: new ObjectId(id) });

    if (!metaDoc) {
      console.warn(`[app/training/actions.ts] deleteDocument (GridFS): Metadata document not found for ID: ${id}`);
      return { error: 'Document metadata not found.' };
    }

    if (!metaDoc.gridFsFileId || !ObjectId.isValid(metaDoc.gridFsFileId.toString())) {
        console.error(`[app/training/actions.ts] deleteDocument (GridFS): Invalid or missing gridFsFileId for metadata ID: ${id}. Metadata GridFS ID was ${metaDoc.gridFsFileId}`);
        await db.collection('raw_files_meta').deleteOne({ _id: new ObjectId(id) });
        revalidatePath('/training');
        return { error: 'Document metadata deleted, but GridFS file ID was invalid or missing. The actual file in GridFS might not have been deleted.' };
    }
    
    const gridFsFileId = new ObjectId(metaDoc.gridFsFileId.toString());
    console.log(`[app/training/actions.ts] deleteDocument (GridFS): Found GridFS file ID: ${gridFsFileId} for metadata ID: ${id}`);

    const bucket = await getGridFSBucket();
    try {
      await bucket.delete(gridFsFileId);
      console.log(`[app/training/actions.ts] deleteDocument (GridFS): File with GridFS ID ${gridFsFileId} deleted from GridFS.`);
    } catch (gridFsError: any) {
        console.warn(`[app/training/actions.ts] deleteDocument (GridFS): Error deleting file from GridFS (ID: ${gridFsFileId}), but will proceed to delete metadata: ${gridFsError.message}`, gridFsError.stack);
    }
    
    const result = await db.collection('raw_files_meta').deleteOne({ _id: new ObjectId(id) });
    if (result.deletedCount === 0) {
        console.warn(`[app/training/actions.ts] deleteDocument (GridFS): Metadata document not found or already deleted for ID: ${id}, though GridFS file might have been deleted.`);
        return { error: 'Document metadata not found or already deleted.'}
    }
    console.log(`[app/training/actions.ts] deleteDocument (GridFS): Document metadata with ID ${id} deleted successfully.`);
    revalidatePath('/training');
    return { success: 'Document and its metadata deleted successfully.' };
  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown database/GridFS error during document deletion.';
    console.error(`[app/training/actions.ts] deleteDocument (GridFS): Database/GridFS error for ID ${id}:`, errorMessage, error.stack);
    return { error: `Database error: Failed to delete document. ${errorMessage}` };
  }
}

// Function to retrieve file content, potentially for chatbot use later
export async function getFileContent(gridFsFileIdString: string): Promise<Buffer | { error: string }> {
  console.log(`[app/training/actions.ts] getFileContent: Attempting to retrieve file with GridFS ID: ${gridFsFileIdString}`);
  if (!ObjectId.isValid(gridFsFileIdString)) {
    const errMessage = `[app/training/actions.ts] getFileContent: Invalid GridFSFileId format: ${gridFsFileIdString}.`;
    console.error(errMessage);
    return { error: 'Invalid file identifier format.' };
  }
  
  const gridFsFileId = new ObjectId(gridFsFileIdString);

  try {
    const bucket = await getGridFSBucket();
    console.log(`[app/training/actions.ts] getFileContent: GridFS bucket obtained. Opening download stream for ID: ${gridFsFileId}`);
    
    const files = await bucket.find({ _id: gridFsFileId }).toArray();
    if (files.length === 0) {
      const errMessage = `[app/training/actions.ts] getFileContent: File not found in GridFS with ID: ${gridFsFileId}.`;
      console.error(errMessage);
      return { error: 'File not found.' };
    }
    console.log(`[app/training/actions.ts] getFileContent: File found: ${files[0].filename}. Proceeding with download.`);

    const downloadStream = bucket.openDownloadStream(gridFsFileId);
    
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      downloadStream.on('data', (chunk) => {
        console.log(`[app/training/actions.ts] getFileContent: Received chunk of size ${chunk.length} for file ID: ${gridFsFileId}`);
        chunks.push(chunk);
      });
      downloadStream.on('error', (err: any) => {
        const errMessage = `[app/training/actions.ts] getFileContent: Error downloading file ${gridFsFileId}: ${err.message}`;
        console.error(errMessage, err.stack);
        reject({ error: `Failed to download file: ${err.message}` });
      });
      downloadStream.on('end', () => {
        const fullBuffer = Buffer.concat(chunks);
        console.log(`[app/training/actions.ts] getFileContent: File download complete for ID: ${gridFsFileId}. Total size: ${fullBuffer.length}`);
        resolve(fullBuffer);
      });
    });
  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error retrieving file content.';
    console.error(`[app/training/actions.ts] getFileContent: Exception while retrieving file ${gridFsFileId}:`, errorMessage, error.stack);
    return { error: `Error retrieving file: ${errorMessage}` };
  }
}
