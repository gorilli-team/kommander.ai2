#!/usr/bin/env node

/**
 * Debug PDF parsing - testa la libreria pdf-parse
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 DEBUG PDF-PARSE - TEST ESTRAZIONE');
console.log('='.repeat(40));

async function testPdfParse() {
    console.log('\n📦 Test installazione pdf-parse...');
    
    try {
        // Test import
        const pdfParse = require('pdf-parse');
        console.log('✅ pdf-parse importato correttamente');
        
        // Test con buffer semplice
        console.log('\n🧪 Test con PDF di esempio...');
        
        // Crea un PDF di test molto semplice
        const simplePdfBuffer = Buffer.from(
            `%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj
3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]/Contents 4 0 R>>endobj
4 0 obj<</Length 44>>stream
BT /F1 12 Tf 100 700 Td (Hello World Test) Tj ET
endstream endobj
xref
0 5
0000000000 65535 f 
0000000010 00000 n 
0000000053 00000 n 
0000000104 00000 n 
0000000188 00000 n 
trailer<</Size 5/Root 1 0 R>>
startxref
280
%%EOF`
        );
        
        try {
            const result = await pdfParse(simplePdfBuffer);
            console.log('✅ PDF parsing funziona!');
            console.log(`   Testo estratto: "${result.text}"`);
            console.log(`   Numero pagine: ${result.numpages}`);
        } catch (testError) {
            console.log('❌ Errore nel parsing di test:', testError.message);
        }
        
    } catch (error) {
        console.log('❌ Errore importando pdf-parse:', error.message);
        console.log('\n🔧 Soluzione: npm install pdf-parse');
        return false;
    }
    
    return true;
}

async function checkPdfParseVersion() {
    console.log('\n📋 Controllo versione pdf-parse...');
    
    try {
        const packageJson = require('./node_modules/pdf-parse/package.json');
        console.log(`✅ Versione pdf-parse: ${packageJson.version}`);
        
        if (packageJson.version.startsWith('1.1.')) {
            console.log('✅ Versione compatibile');
        } else {
            console.log('⚠️  Versione potenzialmente problematica');
        }
    } catch (error) {
        console.log('❌ Non riesco a leggere versione pdf-parse');
    }
}

async function simulateSmartFileManagerExtraction() {
    console.log('\n🔍 Test simulazione SmartFileManager...');
    
    // Simula la funzione di estrazione
    async function extractTextFromBuffer(buffer, fileType, fileName) {
        console.log(`[DEBUG] Estrazione per ${fileName}, tipo: ${fileType}`);
        
        try {
            if (fileType === 'application/pdf') {
                const pdfParse = require('pdf-parse');
                
                console.log(`[DEBUG] Buffer length: ${buffer.length} bytes`);
                
                const data = await pdfParse(buffer, {
                    // Opzioni per migliorare parsing
                    max: 0, // Nessun limite di pagine
                    version: 'v1.10.100' // Forza versione specifica
                });
                
                console.log(`[DEBUG] Estrazione completata:`);
                console.log(`   - Pagine: ${data.numpages}`);
                console.log(`   - Testo length: ${data.text.length}`);
                console.log(`   - Info: ${JSON.stringify(data.info)}`);
                
                const text = data.text.trim();
                
                if (!text) {
                    console.log('⚠️  Testo vuoto estratto!');
                    return `[${fileName}] PDF parsing riuscito ma testo vuoto. Possibili cause:
1. PDF con testo in immagini (scansione)
2. Font/encoding non supportati
3. Layout complesso che confonde il parser`;
                }
                
                console.log(`✅ Testo estratto (primi 100 char): "${text.substring(0, 100)}..."`);
                return text;
            }
        } catch (error) {
            console.log(`❌ Errore parsing: ${error.message}`);
            console.log(`   Stack: ${error.stack}`);
            
            return `[${fileName}] Errore estrazione PDF: ${error.message}
Possibili soluzioni:
1. Verifica che il PDF non sia corrotto
2. Prova a re-salvare il PDF
3. Converti in formato compatibile`;
        }
    }
    
    // Test con buffer fittizio
    const mockBuffer = Buffer.from('Mock PDF content for testing');
    const result = await extractTextFromBuffer(mockBuffer, 'application/pdf', 'test.pdf');
    console.log('Risultato simulazione:', result);
}

async function proposeImprovements() {
    console.log('\n💡 MIGLIORAMENTI PROPOSTI:');
    console.log('─'.repeat(40));
    
    console.log('\n1. 🔧 OPZIONI PDF-PARSE AVANZATE:');
    console.log(`const options = {
  max: 0,        // Nessun limite pagine
  version: 'v1.10.100',
  normalizeWhitespace: false,
  disableCombineTextItems: false
};
const data = await pdfParse(buffer, options);`);
    
    console.log('\n2. 🛡️ FALLBACK MULTIPLI:');
    console.log(`try {
  // Prova metodo standard
  const data = await pdfParse(buffer);
  return data.text;
} catch (error1) {
  try {
    // Prova con opzioni diverse
    const data = await pdfParse(buffer, { max: 1 });
    return data.text;
  } catch (error2) {
    // Fallback finale
    return 'Errore estrazione PDF: ' + error2.message;
  }
}`);
    
    console.log('\n3. 📝 LOGGING DETTAGLIATO:');
    console.log(`console.log('PDF info:', {
  numpages: data.numpages,
  textLength: data.text.length,
  metadata: data.metadata,
  version: data.version
});`);
    
    console.log('\n4. 🔄 RETRY LOGIC:');
    console.log(`let attempts = 0;
const maxAttempts = 3;
while (attempts < maxAttempts) {
  try {
    const result = await pdfParse(buffer);
    return result.text;
  } catch (error) {
    attempts++;
    if (attempts === maxAttempts) throw error;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}`);
}

async function generateImprovedExtractor() {
    console.log('\n🚀 CODICE MIGLIORATO:');
    console.log('─'.repeat(40));
    
    const improvedCode = `
async function extractTextFromBuffer(buffer: Buffer, fileType: string, fileName: string): Promise<string> {
  console.log(\`[SmartFileManager] Estrazione \${fileName}, tipo: \${fileType}, size: \${buffer.length}\`);
  
  try {
    if (fileType === 'application/pdf') {
      const pdfParse = (await import('pdf-parse')).default;
      
      // Opzioni ottimizzate per il parsing
      const options = {
        max: 0, // Nessun limite di pagine
        normalizeWhitespace: false,
        disableCombineTextItems: false
      };
      
      console.log(\`[SmartFileManager] Inizio parsing PDF: \${fileName}\`);
      const startTime = Date.now();
      
      const data = await pdfParse(buffer, options);
      const parseTime = Date.now() - startTime;
      
      console.log(\`[SmartFileManager] PDF parsed in \${parseTime}ms:\`, {
        pages: data.numpages,
        textLength: data.text?.length || 0,
        hasMetadata: !!data.metadata,
        version: data.version
      });
      
      const text = data.text?.trim() || '';
      
      if (!text || text.length < 10) {
        console.warn(\`[SmartFileManager] Testo vuoto/corto per \${fileName}\`);
        
        // Prova metodi alternativi
        try {
          const fallbackData = await pdfParse(buffer, { max: 1 });
          if (fallbackData.text?.trim()) {
            console.log(\`[SmartFileManager] Fallback riuscito per \${fileName}\`);
            return fallbackData.text.trim();
          }
        } catch (fallbackError) {
          console.warn(\`[SmartFileManager] Fallback fallito: \${fallbackError.message}\`);
        }
        
        return \`[\${fileName}] PDF elaborato ma contenuto limitato. 
Dettagli: \${data.numpages} pagine, \${text.length} caratteri estratti.
Se il PDF contiene testo visibile, prova a ri-salvarlo o convertirlo.\`;
      }
      
      console.log(\`[SmartFileManager] Estrazione completata per \${fileName}: \${text.length} caratteri\`);
      return text;
      
    } else if (fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      const mammoth = (await import('mammoth')).default;
      const result = await mammoth.extractRawText({ buffer });
      return result.value.trim();
      
    } else if (fileType === 'text/plain' || fileType === 'text/csv') {
      return buffer.toString('utf-8').trim();
      
    } else if (fileType === 'application/json') {
      const text = buffer.toString('utf-8');
      try {
        const json = JSON.parse(text);
        return JSON.stringify(json, null, 2);
      } catch {
        return text;
      }
      
    } else {
      console.warn(\`[SmartFileManager] Tipo file non supportato: \${fileType}\`);
      return \`[\${fileName}] Tipo file non supportato per l'estrazione del testo: \${fileType}\`;
    }
  } catch (error: any) {
    console.error(\`[SmartFileManager] Errore estrazione \${fileName}:\`, {
      message: error.message,
      stack: error.stack?.split('\\n')[0]
    });
    
    return \`[\${fileName}] Errore durante l'estrazione: \${error.message}
Suggerimenti:
1. Verifica che il file non sia corrotto
2. Prova a ri-salvare il file in formato standard
3. Se possibile, converti in formato .txt\`;
  }
}`;
    
    console.log(improvedCode);
    
    // Salva il codice migliorato
    fs.writeFileSync(
        path.join(__dirname, 'improved_pdf_extractor.ts'),
        improvedCode,
        'utf8'
    );
    
    console.log('\n📄 Codice migliorato salvato in: improved_pdf_extractor.ts');
}

async function runFullDebug() {
    console.log('\n🏁 DEBUG COMPLETO PDF-PARSE');
    console.log('='.repeat(40));
    
    const pdfParseWorks = await testPdfParse();
    await checkPdfParseVersion();
    await simulateSmartFileManagerExtraction();
    await proposeImprovements();
    await generateImprovedExtractor();
    
    console.log('\n✅ DIAGNOSI COMPLETATA');
    console.log('\n🎯 AZIONI IMMEDIATE:');
    if (pdfParseWorks) {
        console.log('   1. ✅ pdf-parse funziona');
        console.log('   2. 🔧 Implementa codice migliorato');
        console.log('   3. 🧪 Testa con PDF reale');
        console.log('   4. 📊 Monitora logging dettagliato');
    } else {
        console.log('   1. ❌ Reinstalla pdf-parse: npm install pdf-parse');
        console.log('   2. 🔧 Verifica compatibilità Node.js');
        console.log('   3. 🧪 Test nuovamente');
    }
    
    console.log('\n📄 Files generati:');
    console.log('   • improved_pdf_extractor.ts');
    console.log('   • Pronto per integrazione in SmartFileManager');
}

// Esecuzione
if (require.main === module) {
    runFullDebug().catch(console.error);
}

module.exports = {
    testPdfParse,
    checkPdfParseVersion,
    simulateSmartFileManagerExtraction,
    runFullDebug
};
