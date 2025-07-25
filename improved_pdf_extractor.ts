
async function extractTextFromBuffer(buffer: Buffer, fileType: string, fileName: string): Promise<string> {
  console.log(`[SmartFileManager] Estrazione ${fileName}, tipo: ${fileType}, size: ${buffer.length}`);
  
  try {
    if (fileType === 'application/pdf') {
      const pdfParse = (await import('pdf-parse')).default;
      
      // Opzioni ottimizzate per il parsing
      const options = {
        max: 0, // Nessun limite di pagine
        normalizeWhitespace: false,
        disableCombineTextItems: false
      };
      
      console.log(`[SmartFileManager] Inizio parsing PDF: ${fileName}`);
      const startTime = Date.now();
      
      const data = await pdfParse(buffer, options);
      const parseTime = Date.now() - startTime;
      
      console.log(`[SmartFileManager] PDF parsed in ${parseTime}ms:`, {
        pages: data.numpages,
        textLength: data.text?.length || 0,
        hasMetadata: !!data.metadata,
        version: data.version
      });
      
      const text = data.text?.trim() || '';
      
      if (!text || text.length < 10) {
        console.warn(`[SmartFileManager] Testo vuoto/corto per ${fileName}`);
        
        // Prova metodi alternativi
        try {
          const fallbackData = await pdfParse(buffer, { max: 1 });
          if (fallbackData.text?.trim()) {
            console.log(`[SmartFileManager] Fallback riuscito per ${fileName}`);
            return fallbackData.text.trim();
          }
        } catch (fallbackError) {
          console.warn(`[SmartFileManager] Fallback fallito: ${fallbackError.message}`);
        }
        
        return `[${fileName}] PDF elaborato ma contenuto limitato. 
Dettagli: ${data.numpages} pagine, ${text.length} caratteri estratti.
Se il PDF contiene testo visibile, prova a ri-salvarlo o convertirlo.`;
      }
      
      console.log(`[SmartFileManager] Estrazione completata per ${fileName}: ${text.length} caratteri`);
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
      console.warn(`[SmartFileManager] Tipo file non supportato: ${fileType}`);
      return `[${fileName}] Tipo file non supportato per l'estrazione del testo: ${fileType}`;
    }
  } catch (error: any) {
    console.error(`[SmartFileManager] Errore estrazione ${fileName}:`, {
      message: error.message,
      stack: error.stack?.split('\n')[0]
    });
    
    return `[${fileName}] Errore durante l'estrazione: ${error.message}
Suggerimenti:
1. Verifica che il file non sia corrotto
2. Prova a ri-salvare il file in formato standard
3. Se possibile, converti in formato .txt`;
  }
}