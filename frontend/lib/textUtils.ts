/**
 * Automatically capitalize the first letter of each sentence
 * @param text - The text to capitalize
 * @returns The text with the first letter of each sentence capitalized
 */
export function capitalizeFirstLetter(text: string): string {
  if (!text) return text;
  
  // Capitalize the first letter if it is a letter
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * Automatically capitalize the first letter of each sentence in a text
 * @param text - The text to process
 * @returns The text with all sentences capitalized
 */
export function capitalizeSentences(text: string): string {
  if (!text) return text;
  
  // Regex to identify the beginning of a sentence (after . ! ? or at the start)
  return text.replace(/(^|[.!?]\s+)([a-z])/g, (match, prefix, letter) = {
    return prefix + letter.toUpperCase();
  });
}

/**
 * Apply capitalization in real time as the user writes
 * @param text - The current text
 * @param previousText - The previous text for comparison
 * @returns The text with applied capitalization
 */
export function applyRealtimeCapitalization(text: string, previousText: string = ''): string {
  if (!text) return text;
  
  // If it is the first character, capitalize it
  if (text.length === 1 && /^[a-z]$/.test(text)) {
    return text.toUpperCase();
  }
  
  // Capitalize after punctuation followed by space
  return text.replace(/(^|[.!?]\s+)([a-z])/g, (match, prefix, letter) => {
    return prefix + letter.toUpperCase();
  });
}
