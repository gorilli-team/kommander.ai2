export interface FaqQueryResult {
  isFaqMatch: boolean;
  similarity?: number;
  faqId?: string | null;
  answer: string;
}

export async function handleFAQQuery(query: string): Promise<FaqQueryResult> {
  // Placeholder implementation: no FAQ DB context here.
  // Returns no match by default to allow scripts to run without failing types.
  return {
    isFaqMatch: false,
    similarity: 0,
    faqId: null,
    answer: ''
  };
}

