#!/usr/bin/env node

/**
 * Tool di diagnosi per problemi di estrazione PDF
 * Verifica perché alcuni PDF non vengono estratti correttamente
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 DIAGNOSI ESTRAZIONE PDF - TROUBLESHOOTING');
console.log('='.repeat(55));

// Simula i problemi comuni con PDF
function analyzePdfExtractionIssues() {
    console.log('\n📋 PROBLEMI COMUNI ESTRAZIONE PDF:');
    console.log('─'.repeat(45));
    
    const issues = [
        {
            problem: '📄 PDF Scansionato (solo immagini)',
            symptoms: 'Testo estratto vuoto o molto poco',
            solution: 'Serve OCR (Optical Character Recognition)',
            code: 'if (!rawText.trim()) return "PDF senza testo selezionabile"'
        },
        {
            problem: '🔒 PDF Protetto/Criptato', 
            symptoms: 'Errore durante parsing o accesso negato',
            solution: 'Rimuovere protezioni o usare password',
            code: 'Error: Password required'
        },
        {
            problem: '💥 PDF Corrotto',
            symptoms: 'Eccezione durante pdf-parse',
            solution: 'Riparare file o usare backup',
            code: 'Error: Invalid PDF structure'
        },
        {
            problem: '🎨 PDF con Layout Complesso',
            symptoms: 'Testo estratto disordinato',
            solution: 'Post-processing del testo estratto',
            code: 'Text order might be scrambled'
        },
        {
            problem: '📏 PDF con Font Embedded',
            symptoms: 'Caratteri strani o mancanti',
            solution: 'Verificare encoding del testo',
            code: 'Character encoding issues'
        }
    ];
    
    issues.forEach((issue, index) => {
        console.log(`\n${index + 1}. ${issue.problem}`);
        console.log(`   Sintomi: ${issue.symptoms}`);
        console.log(`   Soluzione: ${issue.solution}`);
        console.log(`   Codice: ${issue.code}`);
    });
    
    return issues;
}

// Analizza il messaggio di errore specifico
function analyzeErrorMessage() {
    console.log('\n🚨 ANALISI ERRORE SPECIFICO:');
    console.log('─'.repeat(45));
    
    const errorMessage = `"Mi dispiace, ma non posso fornire informazioni su "gorillionaire" in questo momento poiché il testo estratto dal documento "Gorillionaire - DeltaV by Monad.pdf" non è disponibile."`;
    
    console.log('Messaggio ricevuto:');
    console.log(`"${errorMessage}"`);
    
    console.log('\n🔍 Analisi:');
    console.log('   ✅ Il file è stato TROVATO nel database');
    console.log('   ✅ Il sistema sa che esiste "Gorillionaire - DeltaV by Monad.pdf"');
    console.log('   ❌ L\'estrazione del testo è FALLITA');
    console.log('   ❌ Il contenuto restituito è vuoto o errore');
    
    console.log('\n🎯 Diagnosi più probabile:');
    console.log('   1. PDF scansionato (solo immagini)');
    console.log('   2. PDF con protezioni');
    console.log('   3. Errore nella libreria pdf-parse');
    
    return {
        fileFound: true,
        extractionFailed: true,
        mostLikelyIssue: 'PDF scansionato o protetto'
    };
}

// Propone soluzioni
function proposeSolutions() {
    console.log('\n💡 SOLUZIONI CONSIGLIATE:');
    console.log('─'.repeat(45));
    
    const solutions = [
        {
            solution: '🔧 SOLUZIONE IMMEDIATA',
            steps: [
                '1. Apri il PDF e verifica se il testo è selezionabile',
                '2. Se non è selezionabile → è una scansione',
                '3. Converti in testo usando OCR online',
                '4. Salva come nuovo file .txt o .pdf con testo'
            ]
        },
        {
            solution: '🛠️ SOLUZIONE TECNICA',
            steps: [
                '1. Implementare fallback OCR nel sistema',
                '2. Usare librerie come Tesseract.js',
                '3. Aggiungere supporto per PDF protetti',
                '4. Migliorare error handling'
            ]
        },
        {
            solution: '🎯 SOLUZIONE ALTERNATIVA',
            steps: [
                '1. Estrarre manualmente il contenuto importante',
                '2. Creare FAQ con le info principali',
                '3. Caricare come file .txt',
                '4. Il sistema userà il contenuto nelle risposte'
            ]
        }
    ];
    
    solutions.forEach(solution => {
        console.log(`\n${solution.solution}:`);
        solution.steps.forEach(step => {
            console.log(`   ${step}`);
        });
    });
    
    return solutions;
}

// Migliora il SmartFileManager per gestire questi casi
function proposeCodeImprovements() {
    console.log('\n🔧 MIGLIORAMENTI CODICE PROPOSTI:');
    console.log('─'.repeat(45));
    
    console.log('\n1. MIGLIORE ERROR HANDLING:');
    console.log('```typescript');
    console.log(`async function extractTextFromBuffer(buffer: Buffer, fileType: string, fileName: string): Promise<string> {
  try {
    if (fileType === 'application/pdf') {
      const pdfParse = (await import('pdf-parse')).default;
      const data = await pdfParse(buffer);
      const text = data.text.trim();
      
      if (!text || text.length < 10) {
        return \`[\${fileName}] PDF potrebbe essere scansionato o protetto. 
Per usare questo contenuto:
1. Verifica se il testo è selezionabile nel PDF
2. Se no, usa OCR online per convertirlo
3. Carica il testo estratto come file .txt\`;
      }
      return text;
    }
    // ... altri tipi
  } catch (error) {
    return \`[\${fileName}] Errore estrazione: \${error.message}. 
Prova a convertire il file in formato .txt\`;
  }
}`);
    
    console.log('\n2. FALLBACK INTELLIGENTE:');
    console.log('```typescript');
    console.log(`if (file.content.includes('Errore estrazione') || file.content.includes('PDF senza testo')) {
  // Non includere questo file nel context, ma menziona che esiste
  context += \`Nota: Il file "\${file.fileName}" è presente ma richiede conversione manuale.\\n\`;
}`);
    
    console.log('\n3. SUGGERIMENTI UTENTE:');
    console.log('```typescript');
    console.log(`if (smartFiles.some(f => f.content.includes('scansionato'))) {
  context += \`\\nNOTA: Alcuni file PDF sembrano essere scansioni. 
Per migliorare le risposte, converti questi file in testo usando OCR.\\n\`;
}`);
    
    return {
        errorHandling: 'Migliorato con messaggi chiari',
        fallback: 'Continua funzionamento anche con file problematici',
        userGuidance: 'Suggerimenti per risolvere il problema'
    };
}

// Test principale
function runPdfDiagnostics() {
    console.log('\n🏁 RIEPILOGO DIAGNOSI:');
    console.log('='.repeat(55));
    
    const issues = analyzePdfExtractionIssues();
    const errorAnalysis = analyzeErrorMessage();
    const solutions = proposeSolutions();
    const improvements = proposeCodeImprovements();
    
    console.log('\n✅ STATO ATTUALE:');
    console.log('   • SmartFileManager: ✅ Implementato');
    console.log('   • File detection: ✅ Funziona');
    console.log('   • PDF extraction: ❌ Fallisce per alcuni file');
    console.log('   • Error handling: ⚠️  Può essere migliorato');
    
    console.log('\n🎯 AZIONI IMMEDIATE:');
    console.log('   1. Verifica se "Gorillionaire - DeltaV by Monad.pdf" è selezionabile');
    console.log('   2. Se scansionato → converti con OCR');
    console.log('   3. Implementa i miglioramenti error handling');
    console.log('   4. Testa con diversi tipi di PDF');
    
    // Salva report
    const report = {
        timestamp: new Date().toISOString(),
        issues,
        errorAnalysis,
        solutions,
        improvements,
        recommendations: [
            'Implement OCR fallback',
            'Improve error messages',
            'Add user guidance for problematic files',
            'Test with various PDF types'
        ]
    };
    
    fs.writeFileSync(
        path.join(__dirname, 'pdf_extraction_diagnosis.json'),
        JSON.stringify(report, null, 2),
        'utf8'
    );
    
    console.log('\n📄 Diagnosi completa salvata in: pdf_extraction_diagnosis.json');
    
    return report;
}

// Esecuzione
if (require.main === module) {
    runPdfDiagnostics();
}

module.exports = {
    analyzePdfExtractionIssues,
    analyzeErrorMessage,
    proposeSolutions,
    proposeCodeImprovements,
    runPdfDiagnostics
};
