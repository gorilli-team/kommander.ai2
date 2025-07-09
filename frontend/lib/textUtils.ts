/**
 * Capitalizza automaticamente la prima lettera di ogni frase
 * @param text - Il testo da capitalizzare
 * @returns Il testo con la prima lettera di ogni frase capitalizzata
 */
export function capitalizeFirstLetter(text: string): string {
  if (!text) return text;
  
  // Capitalizza la prima lettera se è una lettera
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * Capitalizza automaticamente la prima lettera di ogni frase in un testo
 * @param text - Il testo da processare
 * @returns Il testo con tutte le frasi capitalizzate
 */
export function capitalizeSentences(text: string): string {
  if (!text) return text;
  
  // Regex per identificare l'inizio di una frase (dopo . ! ? o all'inizio)
  return text.replace(/(^|[.!?]\s+)([a-z])/g, (match, prefix, letter) => {
    return prefix + letter.toUpperCase();
  });
}

/**
 * Applica capitalizzazione in tempo reale mentre l'utente scrive
 * @param text - Il testo corrente
 * @param previousText - Il testo precedente per confronto
 * @returns Il testo con capitalizzazione applicata
 */
export function applyRealtimeCapitalization(text: string, previousText: string = ''): string {
  if (!text) return text;
  
  // Se è il primo carattere, capitalizzalo
  if (text.length === 1 && /^[a-z]$/.test(text)) {
    return text.toUpperCase();
  }
  
  // Capitalizza dopo punteggiatura seguita da spazio
  return text.replace(/(^|[.!?]\s+)([a-z])/g, (match, prefix, letter) => {
    return prefix + letter.toUpperCase();
  });
}
