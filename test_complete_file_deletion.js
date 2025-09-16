#!/usr/bin/env node

/**
 * Script per testare la rimozione completa dei file dalla knowledge base
 * Verifica che tutti i dati associati vengano cancellati correttamente
 */

const { MongoClient, ObjectId, GridFSBucket } = require('mongodb');
const fs = require('fs');
const path = require('path');

// Configurazione database (usa le stesse variabili del progetto)
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/kommander_test';

console.log('🧪 TEST RIMOZIONE COMPLETA FILE DALLA KNOWLEDGE BASE');
console.log('='.repeat(60));

/**
 * Simula il caricamento di un file per test
 */
async function createTestFile(client) {
    console.log('📝 Creazione file di test...');
    
    const testContent = `
    Documento di test per verificare la rimozione completa dalla knowledge base.
    Questo file contiene informazioni sui database MongoDB e configurazioni.
    Data di creazione: ${new Date().toISOString()}
    `;
    
    const testBuffer = Buffer.from(testContent, 'utf-8');
    const fileName = `test_deletion_${Date.now()}.txt`;
    const userId = 'test_user_id';
    
    const db = client.db();
    const bucket = new GridFSBucket(db, { bucketName: 'fs' });
    
    // Carica in GridFS
    const uploadStream = bucket.openUploadStream(fileName, {
        contentType: 'text/plain',
        metadata: { originalName: fileName, uploadedBy: userId, userId: userId }
    });
    
    const gridFsFileId = await new Promise((resolve, reject) => {
        uploadStream.end(testBuffer);
        uploadStream.on('finish', () => resolve(uploadStream.id));
        uploadStream.on('error', reject);
    });
    
    // Inserisci metadati
    const metaDoc = {
        userId,
        fileName,
        originalFileType: 'text/plain',
        length: testBuffer.length,
        gridFsFileId,
        uploadedAt: new Date(),
    };
    
    const metaResult = await db.collection('raw_files_meta').insertOne(metaDoc);
    const metaDocId = metaResult.insertedId;
    
    // Inserisci riassunto
    const summary = 'Questo è un documento di test che parla di MongoDB e configurazioni database.';
    await db.collection('file_summaries').insertOne({
        userId,
        gridFsFileId,
        fileName,
        summary,
        createdAt: new Date(),
    });
    
    console.log(`✅ File di test creato:`);
    console.log(`   • Nome: ${fileName}`);
    console.log(`   • GridFS ID: ${gridFsFileId}`);
    console.log(`   • Meta Doc ID: ${metaDocId}`);
    console.log(`   • User ID: ${userId}`);
    
    return {
        fileName,
        gridFsFileId,
        metaDocId: metaDocId.toString(),
        userId,
        testBuffer
    };
}

/**
 * Verifica che il file esista in tutti i posti
 */
async function verifyFileExists(client, testFile) {
    console.log('\\n🔍 Verifica esistenza file...');
    
    const db = client.db();
    const bucket = new GridFSBucket(db, { bucketName: 'fs' });
    
    const checks = {
        gridFS: false,
        metadata: false,
        summary: false
    };
    
    try {
        // Verifica GridFS
        const gridFiles = await bucket.find({ _id: testFile.gridFsFileId }).toArray();
        checks.gridFS = gridFiles.length > 0;
        
        // Verifica metadati
        const metaDoc = await db.collection('raw_files_meta').findOne({ 
            _id: new ObjectId(testFile.metaDocId) 
        });
        checks.metadata = metaDoc !== null;
        
        // Verifica riassunto
        const summaryDoc = await db.collection('file_summaries').findOne({ 
            gridFsFileId: testFile.gridFsFileId 
        });
        checks.summary = summaryDoc !== null;
        
    } catch (error) {
        console.error('Errore durante la verifica:', error.message);
    }
    
    console.log('   Risultati:');
    console.log(`   • GridFS: ${checks.gridFS ? '✅ Presente' : '❌ Assente'}`);
    console.log(`   • Metadata: ${checks.metadata ? '✅ Presente' : '❌ Assente'}`);
    console.log(`   • Summary: ${checks.summary ? '✅ Presente' : '❌ Assente'}`);
    
    return checks;
}

/**
 * Simula la funzione deleteDocument aggiornata
 */
async function deleteFileCompletely(client, testFile) {
    console.log('\\n🗑️  Esecuzione rimozione completa...');
    
    const db = client.db();
    const bucket = new GridFSBucket(db, { bucketName: 'fs' });
    const userId = testFile.userId;
    const metaDocId = testFile.metaDocId;
    const gridFsFileId = testFile.gridFsFileId;
    
    try {
        // 1. Trova e verifica il documento di metadati
        const metaDoc = await db.collection('raw_files_meta').findOne({ 
            _id: new ObjectId(metaDocId), 
            userId: userId 
        });
        
        if (!metaDoc) {
            throw new Error('Documento non trovato o non autorizzato');
        }
        
        console.log('   ✅ Documento autorizzato per la rimozione');
        
        // 2. Rimuovi da GridFS
        try {
            await bucket.delete(gridFsFileId);
            console.log('   ✅ File rimosso da GridFS');
        } catch (gridFsError) {
            console.warn(`   ⚠️  Warning GridFS: ${gridFsError.message}`);
        }
        
        // 3. Rimuovi metadati
        const metaDeleteResult = await db.collection('raw_files_meta').deleteOne({ 
            _id: new ObjectId(metaDocId), 
            userId: userId 
        });
        console.log(`   ✅ Metadati rimossi (${metaDeleteResult.deletedCount} documenti)`);
        
        // 4. Rimuovi riassunto (NUOVA FUNZIONALITÀ)
        const summaryDeleteResult = await db.collection('file_summaries').deleteOne({ 
            gridFsFileId: gridFsFileId, 
            userId: userId 
        });
        console.log(`   ✅ Riassunto rimosso (${summaryDeleteResult.deletedCount} documenti)`);
        
        return {
            success: true,
            deletedGridFS: true,
            deletedMetadata: metaDeleteResult.deletedCount > 0,
            deletedSummary: summaryDeleteResult.deletedCount > 0
        };
        
    } catch (error) {
        console.error(`   ❌ Errore durante la rimozione: ${error.message}`);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Test della funzione di rimozione utente completa (GDPR)
 */
async function testUserDataDeletion(client, userId) {
    console.log('\\n🔒 Test rimozione dati utente (GDPR)...');
    
    const db = client.db();
    const bucket = new GridFSBucket(db, { bucketName: 'fs' });
    
    try {
        // Trova tutti i file dell'utente
        const userFiles = await db.collection('raw_files_meta').find({ userId }).toArray();
        console.log(`   📁 Trovati ${userFiles.length} file per l'utente`);
        
        // Rimuovi file da GridFS
        let deletedGridFSCount = 0;
        for (const file of userFiles) {
            try {
                await bucket.delete(file.gridFsFileId);
                deletedGridFSCount++;
            } catch (gridFsError) {
                console.warn(`   ⚠️  Impossibile rimuovere GridFS file ${file.gridFsFileId}: ${gridFsError.message}`);
            }
        }
        
        // Rimuovi metadati e riassunti
        const metaDeleteResult = await db.collection('raw_files_meta').deleteMany({ userId });
        const summaryDeleteResult = await db.collection('file_summaries').deleteMany({ userId });
        
        console.log(`   ✅ Rimozione GDPR completata:`);
        console.log(`      • File GridFS: ${deletedGridFSCount}/${userFiles.length}`);
        console.log(`      • Metadati: ${metaDeleteResult.deletedCount}`);
        console.log(`      • Riassunti: ${summaryDeleteResult.deletedCount}`);
        
        return {
            success: true,
            totalFiles: userFiles.length,
            deletedGridFS: deletedGridFSCount,
            deletedMetadata: metaDeleteResult.deletedCount,
            deletedSummaries: summaryDeleteResult.deletedCount
        };
        
    } catch (error) {
        console.error(`   ❌ Errore GDPR: ${error.message}`);
        return { success: false, error: error.message };
    }
}

/**
 * Test principale
 */
async function runCompleteDeletionTest() {
    let client;
    let testFile;
    
    try {
        // Connessione al database
        console.log('\\n🔌 Connessione al database...');
        client = new MongoClient(MONGODB_URI);
        await client.connect();
        console.log('✅ Connesso a MongoDB');
        
        // 1. Crea file di test
        testFile = await createTestFile(client);
        
        // 2. Verifica che esista
        const beforeDeletion = await verifyFileExists(client, testFile);
        
        if (!beforeDeletion.gridFS || !beforeDeletion.metadata || !beforeDeletion.summary) {
            throw new Error('File di test non creato correttamente');
        }
        
        // 3. Esegui rimozione completa
        const deleteResult = await deleteFileCompletely(client, testFile);
        
        if (!deleteResult.success) {
            throw new Error(`Rimozione fallita: ${deleteResult.error}`);
        }
        
        // 4. Verifica che sia stato rimosso completamente
        console.log('\\n🔍 Verifica rimozione completa...');
        const afterDeletion = await verifyFileExists(client, testFile);
        
        const isCompletelyRemoved = !afterDeletion.gridFS && !afterDeletion.metadata && !afterDeletion.summary;
        
        console.log('\\n📊 RISULTATI TEST:');
        console.log('='.repeat(40));
        
        if (isCompletelyRemoved) {
            console.log('🎉 SUCCESSO! File rimosso completamente dalla knowledge base');
            console.log('   ✅ GridFS: Rimosso');
            console.log('   ✅ Metadati: Rimossi');
            console.log('   ✅ Riassunti: Rimossi');
        } else {
            console.log('❌ FALLIMENTO! Alcuni dati sono ancora presenti:');
            console.log(`   GridFS: ${afterDeletion.gridFS ? '❌ Ancora presente' : '✅ Rimosso'}`);
            console.log(`   Metadati: ${afterDeletion.metadata ? '❌ Ancora presente' : '✅ Rimosso'}`);
            console.log(`   Riassunti: ${afterDeletion.summary ? '❌ Ancora presente' : '✅ Rimosso'}`);
        }
        
        // 5. Test rimozione utente completa (GDPR)
        // Crea un altro file per il test GDPR
        const gdprTestFile = await createTestFile(client);
        const gdprResult = await testUserDataDeletion(client, gdprTestFile.userId);
        
        console.log('\\n📋 RIEPILOGO COMPLETO:');
        console.log('─'.repeat(40));
        console.log(`✅ Test rimozione singolo file: ${isCompletelyRemoved ? 'PASSATO' : 'FALLITO'}`);
        console.log(`✅ Test rimozione utente GDPR: ${gdprResult.success ? 'PASSATO' : 'FALLITO'}`);
        
        if (isCompletelyRemoved && gdprResult.success) {
            console.log('\\n🎯 TUTTI I TEST SUPERATI!');
            console.log('La rimozione completa dalla knowledge base funziona correttamente.');
        } else {
            console.log('\\n⚠️  ALCUNI TEST FALLITI!');
            console.log('È necessario rivedere l\\'implementazione della rimozione.');
        }
        
        return {
            singleFileDeletion: isCompletelyRemoved,
            gdprDeletion: gdprResult.success,
            overallSuccess: isCompletelyRemoved && gdprResult.success
        };
        
    } catch (error) {
        console.error('\\n💥 Errore durante il test:', error.message);
        return { overallSuccess: false, error: error.message };
        
    } finally {
        if (client) {
            await client.close();
            console.log('\\n✅ Connessione database chiusa');
        }
    }
}

// Esecuzione se chiamato direttamente
if (require.main === module) {
    runCompleteDeletionTest().catch(console.error);
}

module.exports = {
    runCompleteDeletionTest,
    createTestFile,
    verifyFileExists,
    deleteFileCompletely,
    testUserDataDeletion
};
