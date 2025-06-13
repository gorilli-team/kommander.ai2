import { format as formatFns, isValid } from 'date-fns';

export function formatDate(date: Date | string | number | undefined, formatString: string = 'PPpp'): string {
  if (!date) return '';
  const dateObj = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  if (!isValid(dateObj)) return 'Invalid Date';
  
  try {
    return formatFns(dateObj, formatString);
  } catch (error) {
    console.error("Error formatting date:", error);
    return 'Invalid Date';
  }
}

export function formatTimestamp(timestamp?: number | Date): string {
  if (timestamp === undefined) return '';
  const date = typeof timestamp === 'number' ? new Date(timestamp) : timestamp;
  if (!isValid(date)) return 'Invalid Date';
  return formatFns(date, 'HH:mm');
}
