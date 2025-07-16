import { createHash } from 'crypto';
import { createEmbedding } from '@/backend/lib/openai';
import natural from 'natural';

export interface SimilarityResult {
  score: number;
  type: 'embedding' | 'keyword' | 'hash' | 'hybrid';
  explanation: string;
}

export interface MatchingOptions {
  similarityThreshold?: number;
  keywordWeight?: number;
  embeddingWeight?: number;
  exactMatchRequired?: boolean;
  maxResults?: number;
}

export class QuestionMatchingService {
  private readonly DEFAULT_OPTIONS: Required<MatchingOptions> = {
    similarityThreshold: 0.8,
    keywordWeight: 0.3,
    embeddingWeight: 0.7,
    exactMatchRequired: false,
    maxResults: 10,
  };

  /**
   * Genera embedding per una domanda usando OpenAI
   */
  async generateQuestionEmbedding(question: string): Promise<number[]> {
    try {
      // Normalizza la domanda
      const normalizedQuestion = this.normalizeQuestion(question);
      
      // Genera embedding usando OpenAI
      const embedding = await createEmbedding(normalizedQuestion);
      
      console.log(`[QuestionMatchingService] Generated embedding for question: "${normalizedQuestion.substring(0, 50)}..."`);
      return embedding;
    } catch (error) {
      console.error('[QuestionMatchingService] Error generating embedding:', error);
      throw new Error('Failed to generate question embedding');
    }
  }

  /**
   * Calcola similarity coseno tra due embedding
   */
  calculateCosineSimilarity(embedding1: number[], embedding2: number[]): number {
    if (embedding1.length !== embedding2.length) {
      throw new Error('Embeddings must have the same length');
    }

    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < embedding1.length; i++) {
      dotProduct += embedding1[i] * embedding2[i];
      norm1 += embedding1[i] * embedding1[i];
      norm2 += embedding2[i] * embedding2[i];
    }

    if (norm1 === 0 || norm2 === 0) {
      return 0;
    }

    return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
  }

  /**
   * Estrae keywords significative da una domanda
   */
  extractKeywords(question: string): string[] {
    try {
      // Normalizza la domanda
      const normalizedQuestion = this.normalizeQuestion(question);
      
      // Tokenizza
      const tokens = natural.WordTokenizer.tokenize(normalizedQuestion) || [];
      
      // Rimuovi stopwords italiane e inglesi
      const stopwords = new Set([
        // Italiano
        'il', 'la', 'le', 'lo', 'gli', 'un', 'una', 'del', 'della', 'dei', 'delle',
        'di', 'da', 'in', 'con', 'su', 'per', 'tra', 'fra', 'a', 'ad', 'al', 'alla',
        'che', 'chi', 'cui', 'come', 'quando', 'dove', 'perché', 'perchè', 'cosa',
        'se', 'ma', 'però', 'anche', 'ancora', 'sempre', 'mai', 'già', 'non',
        'è', 'sono', 'sei', 'siamo', 'siete', 'era', 'erano', 'essere', 'avere',
        'ho', 'hai', 'ha', 'abbiamo', 'avete', 'hanno', 'aveva', 'avevano',
        'questo', 'questa', 'questi', 'queste', 'quello', 'quella', 'quelli', 'quelle',
        'molto', 'poco', 'tanto', 'troppo', 'più', 'meno', 'bene', 'male',
        // Inglese
        'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
        'of', 'with', 'by', 'from', 'up', 'about', 'into', 'through', 'during',
        'before', 'after', 'above', 'below', 'between', 'among', 'is', 'are',
        'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does',
        'did', 'will', 'would', 'could', 'should', 'may', 'might', 'can', 'must',
        'this', 'that', 'these', 'those', 'what', 'which', 'who', 'when', 'where',
        'why', 'how', 'all', 'any', 'both', 'each', 'few', 'more', 'most', 'other',
        'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than',
        'too', 'very', 'one', 'two', 'three', 'four', 'five'
      ]);

      // Filtra tokens
      const keywords = tokens
        .filter(token => {
          const lowerToken = token.toLowerCase();
          return (
            token.length > 2 && // Minimo 3 caratteri
            !stopwords.has(lowerToken) && // Non è stopword
            /^[a-zA-ZàáâäèéêëìíîïòóôöùúûüÀÁÂÄÈÉÊËÌÍÎÏÒÓÔÖÙÚÛÜ]+$/.test(token) // Solo lettere
          );
        })
        .map(token => token.toLowerCase());

      // Rimuovi duplicati e ordina per frequenza
      const keywordCount = keywords.reduce((acc, keyword) => {
        acc[keyword] = (acc[keyword] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const sortedKeywords = Object.entries(keywordCount)
        .sort(([, a], [, b]) => b - a)
        .map(([keyword]) => keyword)
        .slice(0, 10); // Massimo 10 keywords

      console.log(`[QuestionMatchingService] Extracted keywords: ${sortedKeywords.join(', ')}`);
      return sortedKeywords;
    } catch (error) {
      console.error('[QuestionMatchingService] Error extracting keywords:', error);
      return [];
    }
  }

  /**
   * Genera hash della domanda per ricerca veloce
   */
  generateQuestionHash(question: string): string {
    const normalizedQuestion = this.normalizeQuestion(question);
    return createHash('sha256').update(normalizedQuestion).digest('hex');
  }

  /**
   * Calcola similarity basata su keywords
   */
  calculateKeywordSimilarity(keywords1: string[], keywords2: string[]): number {
    if (keywords1.length === 0 || keywords2.length === 0) {
      return 0;
    }

    const set1 = new Set(keywords1);
    const set2 = new Set(keywords2);
    
    // Calcola intersezione
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    
    // Calcola unione
    const union = new Set([...set1, ...set2]);
    
    // Jaccard similarity
    const jaccardSimilarity = intersection.size / union.size;
    
    // Weighted overlap (considera anche la frequenza)
    const weightedOverlap = intersection.size / Math.min(set1.size, set2.size);
    
    // Combina i due score
    return (jaccardSimilarity * 0.4) + (weightedOverlap * 0.6);
  }

  /**
   * Calcola similarity ibrida (embedding + keyword)
   */
  calculateHybridSimilarity(
    embedding1: number[],
    embedding2: number[],
    keywords1: string[],
    keywords2: string[],
    options: MatchingOptions = {}
  ): SimilarityResult {
    const opts = { ...this.DEFAULT_OPTIONS, ...options };
    
    // Calcola similarity embedding
    const embeddingSimilarity = this.calculateCosineSimilarity(embedding1, embedding2);
    
    // Calcola similarity keyword
    const keywordSimilarity = this.calculateKeywordSimilarity(keywords1, keywords2);
    
    // Combina i due score
    const hybridScore = 
      (embeddingSimilarity * opts.embeddingWeight) + 
      (keywordSimilarity * opts.keywordWeight);
    
    const explanation = `Embedding: ${embeddingSimilarity.toFixed(3)}, Keywords: ${keywordSimilarity.toFixed(3)}, Hybrid: ${hybridScore.toFixed(3)}`;
    
    return {
      score: hybridScore,
      type: 'hybrid',
      explanation
    };
  }

  /**
   * Trova le domande più simili date embedding e keywords
   */
  findSimilarQuestions(
    questionEmbedding: number[],
    questionKeywords: string[],
    candidateQuestions: Array<{
      id: string;
      embedding?: number[];
      keywords: string[];
      question: string;
    }>,
    options: MatchingOptions = {}
  ): Array<{ id: string; similarity: SimilarityResult; question: string }> {
    const opts = { ...this.DEFAULT_OPTIONS, ...options };
    
    const results = candidateQuestions
      .map(candidate => {
        if (!candidate.embedding || candidate.embedding.length === 0) {
          // Fallback solo keyword
          const keywordSimilarity = this.calculateKeywordSimilarity(
            questionKeywords, 
            candidate.keywords
          );
          
          return {
            id: candidate.id,
            question: candidate.question,
            similarity: {
              score: keywordSimilarity,
              type: 'keyword' as const,
              explanation: `Keyword similarity: ${keywordSimilarity.toFixed(3)}`
            }
          };
        }

        // Calcola similarity ibrida
        const hybridSimilarity = this.calculateHybridSimilarity(
          questionEmbedding,
          candidate.embedding,
          questionKeywords,
          candidate.keywords,
          options
        );

        return {
          id: candidate.id,
          question: candidate.question,
          similarity: hybridSimilarity
        };
      })
      .filter(result => result.similarity.score >= opts.similarityThreshold)
      .sort((a, b) => b.similarity.score - a.similarity.score)
      .slice(0, opts.maxResults);

    console.log(`[QuestionMatchingService] Found ${results.length} similar questions above threshold ${opts.similarityThreshold}`);
    
    return results;
  }

  /**
   * Normalizza una domanda per il processing
   */
  private normalizeQuestion(question: string): string {
    return question
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ') // Normalizza spazi
      .replace(/[^\w\s\u00C0-\u017F]/g, '') // Rimuovi punteggiatura, mantieni caratteri accentati
      .replace(/\b(come|cosa|quando|dove|perché|perchè|chi|quale|quanto)\b/g, '') // Rimuovi question words
      .trim();
  }

  /**
   * Calcola confidence score basato su vari fattori
   */
  calculateConfidence(
    similarityScore: number,
    usageCount: number,
    effectiveness: number,
    approvalStatus: string
  ): number {
    let confidence = similarityScore * 0.4; // Base similarity
    
    // Boost per usage
    const usageBoost = Math.min(usageCount * 0.1, 0.2);
    confidence += usageBoost;
    
    // Boost per effectiveness
    confidence += effectiveness * 0.3;
    
    // Boost per approval
    if (approvalStatus === 'approved') {
      confidence += 0.1;
    } else if (approvalStatus === 'rejected') {
      confidence -= 0.2;
    }
    
    return Math.max(0, Math.min(1, confidence));
  }
}

// Singleton instance
export const questionMatchingService = new QuestionMatchingService();
