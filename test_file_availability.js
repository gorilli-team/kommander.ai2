#!/usr/bin/env node

/**
 * Script per testare quanto tempo impiegano i file caricati 
 * per essere disponibili nella knowledge base del chatbot
 */

const fs = require('fs');
const path = require('path');
const { MongoClient, ObjectId, GridFSBucket } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/kommander';
const TEST_USER_ID = process.env.TEST_USER_ID || 'test-user-123';

// Crea un file di test temporaneo
function createTestFile() {
    const testContent = `Test Document - ${new Date().toISOString()}

Questo è un documento di test creato per verificare i tempi di disponibilità
nella knowledge base. 

Contenuto importante:
- Data di creazione: ${new Date().toISOString()}
- ID sessione: ${Math.random().toString(36).substring(7)}
- Informazione specifica: MAGIC_KEYWORD_${Date.now()}

Questo documento dovrebbe essere disponibile immediatamente dopo il caricamento
per essere utilizzato dal chatbot nelle risposte.`;

    const fileName = `test_file_${Date.now()}.txt`;
    const filePath = path.join(__dirname, fileName);
    
    fs.writeFileSync(filePath, testContent, 'utf8');
    
    return {
        path: filePath,
        name: fileName,
        content: testContent,
        size: Buffer.byteLength(testContent, 'utf8')
    };
}

// Carica il file tramite la funzione di upload
async function uploadTestFile(client, testFile) {
    console.log('📁 Caricamento file di test...');
    const startTime = Date.now();
    
    try {
        const db = client.db();
        const bucket = new GridFSBucket(db, { bucketName: 'fs' });
        
        // Simula il caricamento come fa uploadFileAndProcess
        const uploadStream = bucket.openUploadStream(testFile.name, {
            contentType: 'text/plain',
            metadata: { 
                originalName: testFile.name, 
                uploadedBy: TEST_USER_ID, 
                userId: TEST_USER_ID 
            }
        });
        
        // Scrivi il contenuto del file
        uploadStream.end(Buffer.from(testFile.content, 'utf8'));
        
        // Aspetta che il caricamento sia completato
        await new Promise((resolve, reject) => {
            uploadStream.on('finish', resolve);
            uploadStream.on('error', reject);
        });
        
        // Salva i metadati come fa la funzione originale
        const fileMetaDoc = {
            userId: TEST_USER_ID,
            fileName: testFile.name,
            originalFileType: 'text/plain',
            length: testFile.size,
            gridFsFileId: uploadStream.id,
            uploadedAt: new Date(),
        };
        
        await db.collection('raw_files_meta').insertOne(fileMetaDoc);
        
        // Crea un riassunto come fa la funzione originale
        const summary = `Test document creato il ${new Date().toISOString()}.`;
        await db.collection('file_summaries').insertOne({
            userId: TEST_USER_ID,
            gridFsFileId: uploadStream.id,
            fileName: testFile.name,
            summary,
            createdAt: new Date(),
        });
        
        const uploadTime = Date.now() - startTime;
        console.log(`✅ File caricato in ${uploadTime}ms`);
        console.log(`   GridFS ID: ${uploadStream.id}`);
        console.log(`   Metadata ID: ${fileMetaDoc._id}`);
        
        return {
            gridFsFileId: uploadStream.id,
            metadataId: fileMetaDoc._id,
            uploadTime
        };
        
    } catch (error) {
        console.error('❌ Errore durante il caricamento:', error);
        throw error;
    }
}

// Verifica se il file è disponibile per il recupero
async function checkFileAvailability(client, gridFsFileId) {
    console.log('🔍 Verifica disponibilità file...');
    const startTime = Date.now();
    
    try {
        const db = client.db();
        
        // Verifica i metadati
        const metaDoc = await db.collection('raw_files_meta').findOne({ 
            gridFsFileId: gridFsFileId, 
            userId: TEST_USER_ID 
        });
        
        if (!metaDoc) {
            throw new Error('Metadati del file non trovati');
        }
        
        // Verifica il file in GridFS
        const bucket = new GridFSBucket(db, { bucketName: 'fs' });
        const files = await bucket.find({ _id: gridFsFileId }).toArray();
        
        if (files.length === 0) {
            throw new Error('File non trovato in GridFS');
        }
        
        // Prova a scaricare il contenuto
        const downloadStream = bucket.openDownloadStream(gridFsFileId);
        const chunks = [];
        
        await new Promise((resolve, reject) => {
            downloadStream.on('data', (chunk) => chunks.push(chunk));
            downloadStream.on('error', reject);
            downloadStream.on('end', resolve);
        });
        
        const content = Buffer.concat(chunks).toString('utf8');
        const checkTime = Date.now() - startTime;
        
        console.log(`✅ File disponibile in ${checkTime}ms`);
        console.log(`   Dimensione contenuto: ${content.length} caratteri`);
        
        return {
            available: true,
            checkTime,
            contentLength: content.length,
            content: content.substring(0, 200) + '...' // Primi 200 caratteri
        };
        
    } catch (error) {
        const checkTime = Date.now() - startTime;
        console.log(`❌ File non disponibile dopo ${checkTime}ms: ${error.message}`);
        return {
            available: false,
            checkTime,
            error: error.message
        };
    }
}

// Simula la query del chatbot per verificare se il file viene utilizzato
async function simulateChatbotQuery(client, testFile) {
    console.log('🤖 Simulazione query chatbot...');
    const startTime = Date.now();
    
    try {
        const db = client.db();
        
        // Recupera i file come fa generateChatResponse
        const allUploadedFilesMeta = await db.collection('raw_files_meta')
            .find({ userId: TEST_USER_ID })
            .project({ fileName: 1, originalFileType: 1, gridFsFileId: 1, uploadedAt: 1 })
            .sort({ uploadedAt: -1 })
            .toArray();
        
        console.log(`📋 Trovati ${allUploadedFilesMeta.length} file nell'archivio`);
        
        // Verifica se il nostro file di test è tra i primi 3 (come fa l'API)
        const maxFiles = 3;
        const filesToProcess = allUploadedFilesMeta.slice(0, maxFiles);
        
        const ourFile = filesToProcess.find(f => f.fileName === testFile.name);
        
        if (!ourFile) {
            const queryTime = Date.now() - startTime;
            console.log(`⚠️  File test non tra i primi ${maxFiles} file (${queryTime}ms)`);
            return {
                included: false,
                queryTime,
                totalFiles: allUploadedFilesMeta.length,
                processedFiles: filesToProcess.length
            };
        }
        
        // Recupera i riassunti
        const selectedIds = filesToProcess.map(f => f.gridFsFileId);
        const summariesFromDb = await db.collection('file_summaries')
            .find({ userId: TEST_USER_ID, gridFsFileId: { $in: selectedIds } })
            .project({ gridFsFileId: 1, summary: 1 })
            .toArray();
        
        const ourSummary = summariesFromDb.find(s => 
            s.gridFsFileId.toString() === ourFile.gridFsFileId.toString()
        );
        
        const queryTime = Date.now() - startTime;
        console.log(`✅ File test trovato nella query chatbot (${queryTime}ms)`);
        console.log(`   Posizione: ${filesToProcess.indexOf(ourFile) + 1}/${filesToProcess.length}`);
        console.log(`   Riassunto disponibile: ${ourSummary ? 'Sì' : 'No'}`);
        
        return {
            included: true,
            queryTime,
            position: filesToProcess.indexOf(ourFile) + 1,
            totalFiles: allUploadedFilesMeta.length,
            processedFiles: filesToProcess.length,
            summaryAvailable: !!ourSummary,
            summary: ourSummary?.summary
        };
        
    } catch (error) {
        const queryTime = Date.now() - startTime;
        console.error(`❌ Errore nella simulazione chatbot (${queryTime}ms):`, error);
        return {
            included: false,
            queryTime,
            error: error.message
        };
    }
}

// Test principale
async function runAvailabilityTest() {
    console.log('🚀 Inizio test disponibilità file nella knowledge base\n');
    
    let client;
    let testFile;
    let uploadResult;
    
    try {
        // Connessione al database
        console.log('🔌 Connessione al database...');
        client = new MongoClient(MONGODB_URI);
        await client.connect();
        console.log('✅ Connesso a MongoDB\n');
        
        // Crea file di test
        console.log('📝 Creazione file di test...');
        testFile = createTestFile();
        console.log(`✅ File creato: ${testFile.name} (${testFile.size} bytes)\n`);
        
        // Test immediato della disponibilità (dovrebbe fallire)
        console.log('⏱️  Test disponibilità PRIMA del caricamento:');
        const preUploadCheck = await checkFileAvailability(client, new ObjectId());
        console.log('');
        
        // Carica il file
        uploadResult = await uploadTestFile(client, testFile);
        console.log('');
        
        // Test immediato dopo il caricamento
        console.log('⏱️  Test disponibilità IMMEDIATAMENTE dopo il caricamento:');
        const immediateCheck = await checkFileAvailability(client, uploadResult.gridFsFileId);
        console.log('');
        
        // Test con piccoli ritardi
        const delays = [100, 500, 1000, 2000];
        
        for (const delay of delays) {
            console.log(`⏱️  Test disponibilità dopo ${delay}ms:`)
            await new Promise(resolve => setTimeout(resolve, delay));
            await checkFileAvailability(client, uploadResult.gridFsFileId);
            console.log('');
        }
        
        // Test query chatbot
        console.log('⏱️  Test inclusione nella query chatbot:');
        const chatbotQuery = await simulateChatbotQuery(client, testFile);
        console.log('');
        
        // Riepilogo risultati
        console.log('📊 RIEPILOGO TEST:');
        console.log('='.repeat(50));
        console.log(`File di test: ${testFile.name}`);
        console.log(`Tempo caricamento: ${uploadResult.uploadTime}ms`);
        console.log(`Disponibilità immediata: ${immediateCheck.available ? 'SÌ' : 'NO'}`);
        if (immediateCheck.available) {
            console.log(`Tempo controllo disponibilità: ${immediateCheck.checkTime}ms`);
        }
        console.log(`Incluso in query chatbot: ${chatbotQuery.included ? 'SÌ' : 'NO'}`);
        if (chatbotQuery.included) {
            console.log(`Tempo query chatbot: ${chatbotQuery.queryTime}ms`);
            console.log(`Posizione in lista: ${chatbotQuery.position}/${chatbotQuery.processedFiles}`);
        }
        console.log('='.repeat(50));
        
        if (immediateCheck.available && chatbotQuery.included) {
            console.log('🎉 SUCCESSO: Il file è immediatamente disponibile dopo il caricamento!');
            console.log(`⚡ Tempo totale: caricamento (${uploadResult.uploadTime}ms) + verifica (${immediateCheck.checkTime}ms) = ${uploadResult.uploadTime + immediateCheck.checkTime}ms`);
        } else {
            console.log('⚠️  ATTENZIONE: Il file non è immediatamente disponibile');
        }
        
    } catch (error) {
        console.error('💥 Errore durante il test:', error);
    } finally {
        // Pulizia
        if (uploadResult && client) {
            console.log('\n🧹 Pulizia file di test...');
            try {
                const db = client.db();
                const bucket = new GridFSBucket(db, { bucketName: 'fs' });
                
                // Rimuovi file da GridFS
                await bucket.delete(uploadResult.gridFsFileId);
                
                // Rimuovi metadati
                await db.collection('raw_files_meta').deleteOne({ 
                    gridFsFileId: uploadResult.gridFsFileId 
                });
                
                // Rimuovi riassunto
                await db.collection('file_summaries').deleteOne({ 
                    gridFsFileId: uploadResult.gridFsFileId 
                });
                
                console.log('✅ File di test rimosso dal database');
            } catch (cleanupError) {
                console.error('⚠️  Errore durante la pulizia:', cleanupError.message);
            }
        }
        
        if (testFile && fs.existsSync(testFile.path)) {
            fs.unlinkSync(testFile.path);
            console.log('✅ File di test rimosso dal filesystem');
        }
        
        if (client) {
            await client.close();
            console.log('✅ Connessione database chiusa');
        }
    }
}

// Esecuzione se chiamato direttamente
if (require.main === module) {
    runAvailabilityTest().catch(console.error);
}

module.exports = {
    runAvailabilityTest,
    createTestFile,
    uploadTestFile,
    checkFileAvailability,
    simulateChatbotQuery
};
