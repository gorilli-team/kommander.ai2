import Sentiment from 'sentiment';
import natural from 'natural';

const sentiment = new Sentiment();

interface SentimentResult {
  score: number;
  comparative: number;
  label: 'positive' | 'neutral' | 'negative';
  confidence: number;
}

interface ConversationAnalysis {
  id: string;
  userId: string;
  sentiment: SentimentResult;
  topics: string[];
  categories: string[];
  messageCount: number;
  averageResponseTime: number;
  satisfactionScore?: number;
}

// Predefined categories for conversation classification
const CONVERSATION_CATEGORIES = [
  'technical_support',
  'product_inquiry',
  'billing_question',
  'feature_request',
  'complaint',
  'compliment',
  'general_info',
  'troubleshooting'
];

// Keywords for topic extraction
const TOPIC_KEYWORDS = {
  'payment': ['payment', 'billing', 'charge', 'cost', 'price', 'subscription'],
  'technical': ['error', 'bug', 'issue', 'problem', 'not working', 'broken'],
  'feature': ['feature', 'functionality', 'enhancement', 'improvement', 'suggestion'],
  'account': ['account', 'profile', 'login', 'password', 'access'],
  'integration': ['integration', 'api', 'connect', 'sync', 'export', 'import'],
  'performance': ['slow', 'fast', 'speed', 'performance', 'lag', 'loading']
};

export class SentimentAnalysisService {
  private tokenizer: any;

  constructor() {
    this.tokenizer = new natural.WordTokenizer();
  }

  /**
   * Analyze sentiment of a single message
   */
  analyzeMessage(text: string): SentimentResult {
    const result = sentiment.analyze(text);
    
    let label: 'positive' | 'neutral' | 'negative';
    if (result.score > 0) {
      label = 'positive';
    } else if (result.score < 0) {
      label = 'negative';
    } else {
      label = 'neutral';
    }

    // Calculate confidence based on comparative score and number of tokens
    const confidence = Math.min(Math.abs(result.comparative) * 100, 100);

    return {
      score: result.score,
      comparative: result.comparative,
      label,
      confidence
    };
  }

  /**
   * Analyze sentiment of entire conversation
   */
  analyzeConversation(messages: Array<{ content: string; role: string; timestamp: Date }>): SentimentResult {
    const userMessages = messages.filter(msg => msg.role === 'user');
    const allText = userMessages.map(msg => msg.content).join(' ');
    
    if (!allText.trim()) {
      return {
        score: 0,
        comparative: 0,
        label: 'neutral',
        confidence: 0
      };
    }

    return this.analyzeMessage(allText);
  }

  /**
   * Extract topics from conversation
   */
  extractTopics(messages: Array<{ content: string; role: string }>): string[] {
    const userMessages = messages.filter(msg => msg.role === 'user');
    const allText = userMessages.map(msg => msg.content.toLowerCase()).join(' ');
    
    const detectedTopics: string[] = [];
    
    Object.entries(TOPIC_KEYWORDS).forEach(([topic, keywords]) => {
      const hasKeyword = keywords.some(keyword => allText.includes(keyword.toLowerCase()));
      if (hasKeyword) {
        detectedTopics.push(topic);
      }
    });

    return detectedTopics.length > 0 ? detectedTopics : ['general'];
  }

  /**
   * Classify conversation into categories
   */
  classifyConversation(messages: Array<{ content: string; role: string }>, sentiment: SentimentResult): string[] {
    const userMessages = messages.filter(msg => msg.role === 'user');
    const allText = userMessages.map(msg => msg.content.toLowerCase()).join(' ');
    
    const categories: string[] = [];

    // Rule-based classification
    if (allText.includes('thank') || allText.includes('great') || sentiment.label === 'positive') {
      categories.push('compliment');
    }
    
    if (allText.includes('problem') || allText.includes('issue') || allText.includes('error')) {
      categories.push('technical_support');
    }
    
    if (allText.includes('price') || allText.includes('cost') || allText.includes('billing')) {
      categories.push('billing_question');
    }
    
    if (allText.includes('feature') || allText.includes('suggest') || allText.includes('add')) {
      categories.push('feature_request');
    }
    
    if (sentiment.label === 'negative' && !categories.includes('technical_support')) {
      categories.push('complaint');
    }
    
    if (allText.includes('how') || allText.includes('what') || allText.includes('when')) {
      categories.push('general_info');
    }

    return categories.length > 0 ? categories : ['general_info'];
  }

  /**
   * Calculate satisfaction score based on sentiment and conversation flow
   */
  calculateSatisfactionScore(
    messages: Array<{ content: string; role: string; timestamp: Date }>,
    sentiment: SentimentResult
  ): number {
    // Base score from sentiment
    let score = 50; // Neutral baseline
    
    if (sentiment.label === 'positive') {
      score += Math.min(sentiment.confidence, 30);
    } else if (sentiment.label === 'negative') {
      score -= Math.min(sentiment.confidence, 30);
    }

    // Adjust based on conversation length (longer conversations might indicate complexity)
    const messageCount = messages.length;
    if (messageCount > 10) {
      score -= 5; // Slightly lower satisfaction for very long conversations
    } else if (messageCount < 3) {
      score += 5; // Higher satisfaction for quick resolutions
    }

    // Look for explicit satisfaction indicators
    const userMessages = messages.filter(msg => msg.role === 'user');
    const lastUserMessage = userMessages[userMessages.length - 1]?.content.toLowerCase() || '';
    
    if (lastUserMessage.includes('thank') || lastUserMessage.includes('perfect') || lastUserMessage.includes('solved')) {
      score += 15;
    } else if (lastUserMessage.includes('not helpful') || lastUserMessage.includes('still') || lastUserMessage.includes('doesn\'t work')) {
      score -= 15;
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Full conversation analysis
   */
  async analyzeFullConversation(
    conversationId: string,
    userId: string,
    messages: Array<{ content: string; role: string; timestamp: Date }>
  ): Promise<ConversationAnalysis> {
    const sentiment = this.analyzeConversation(messages);
    const topics = this.extractTopics(messages);
    const categories = this.classifyConversation(messages, sentiment);
    const satisfactionScore = this.calculateSatisfactionScore(messages, sentiment);

    // Calculate average response time (simplified)
    const responseTimes: number[] = [];
    for (let i = 1; i < messages.length; i++) {
      if (messages[i].role === 'assistant' && messages[i-1].role === 'user') {
        const timeDiff = messages[i].timestamp.getTime() - messages[i-1].timestamp.getTime();
        responseTimes.push(timeDiff / 1000); // Convert to seconds
      }
    }
    
    const averageResponseTime = responseTimes.length > 0 
      ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length 
      : 0;

    return {
      id: conversationId,
      userId,
      sentiment,
      topics,
      categories,
      messageCount: messages.length,
      averageResponseTime,
      satisfactionScore
    };
  }

  /**
   * Batch analyze multiple conversations
   */
  async batchAnalyzeConversations(
    conversations: Array<{
      id: string;
      userId: string;
      messages: Array<{ content: string; role: string; timestamp: Date }>;
    }>
  ): Promise<ConversationAnalysis[]> {
    const analyses: ConversationAnalysis[] = [];

    for (const conversation of conversations) {
      try {
        const analysis = await this.analyzeFullConversation(
          conversation.id,
          conversation.userId,
          conversation.messages
        );
        analyses.push(analysis);
      } catch (error) {
        console.error(`Error analyzing conversation ${conversation.id}:`, error);
      }
    }

    return analyses;
  }

  /**
   * Generate sentiment trends over time
   */
  generateSentimentTrends(
    analyses: ConversationAnalysis[],
    timeframe: 'day' | 'week' | 'month'
  ): Array<{
    date: string;
    positive: number;
    neutral: number;
    negative: number;
    averageSatisfaction: number;
  }> {
    // Group analyses by date based on timeframe
    const grouped = new Map<string, ConversationAnalysis[]>();
    
    analyses.forEach(analysis => {
      // This is simplified - you'd need actual conversation dates
      const date = new Date().toISOString().split('T')[0];
      if (!grouped.has(date)) {
        grouped.set(date, []);
      }
      grouped.get(date)!.push(analysis);
    });

    return Array.from(grouped.entries()).map(([date, dayAnalyses]) => {
      const sentimentCounts = {
        positive: dayAnalyses.filter(a => a.sentiment.label === 'positive').length,
        neutral: dayAnalyses.filter(a => a.sentiment.label === 'neutral').length,
        negative: dayAnalyses.filter(a => a.sentiment.label === 'negative').length,
      };

      const averageSatisfaction = dayAnalyses.reduce((sum, a) => sum + (a.satisfactionScore || 0), 0) / dayAnalyses.length;

      return {
        date,
        ...sentimentCounts,
        averageSatisfaction: Math.round(averageSatisfaction)
      };
    });
  }
}

export const sentimentAnalysisService = new SentimentAnalysisService();
