import { connectToDatabase } from './mongodb';
import { NextRequest } from 'next/server';
import DOMPurify from 'isomorphic-dompurify';

export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
  keyGenerator?: (request: NextRequest) => string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

export interface SecurityConfig {
  enableRateLimit: boolean;
  enableInputSanitization: boolean;
  enableAuditLogging: boolean;
  maxInputLength: number;
  blockedPatterns: string[];
}

export interface AuditLogEntry {
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  action: string;
  resource: string;
  timestamp: Date;
  success: boolean;
  errorMessage?: string;
  metadata?: any;
}

const DEFAULT_SECURITY_CONFIG: SecurityConfig = {
  enableRateLimit: true,
  enableInputSanitization: true,
  enableAuditLogging: true,
  maxInputLength: 10000,
  blockedPatterns: [
    // SQL injection patterns
    'SELECT.*FROM',
    'INSERT.*INTO',
    'UPDATE.*SET',
    'DELETE.*FROM',
    'DROP.*TABLE',
    'CREATE.*TABLE',
    // XSS patterns
    '<script[^>]*>',
    'javascript:',
    'on\\w+\\s*=',
    'expression\\s*\\(',
    // Command injection patterns
    '\\|\\s*(cat|ls|pwd|id|whoami)',
    ';\\s*(cat|ls|pwd|id|whoami)',
    '&&\\s*(cat|ls|pwd|id|whoami)',
    // Path traversal
    '\\.\\./.*\\.\\.',
    '/etc/passwd',
    '/etc/shadow',
    // Known attack vectors
    'eval\\s*\\(',
    'exec\\s*\\(',
    'system\\s*\\(',
  ]
};

export class SecurityService {
  private db: any;
  private config: SecurityConfig;

  constructor(config: Partial<SecurityConfig> = {}) {
    this.config = { ...DEFAULT_SECURITY_CONFIG, ...config };
    this.initializeDb();
  }

  private async initializeDb() {
    const { db } = await connectToDatabase();
    this.db = db;
    
    // Create indexes for efficient querying
    await this.createIndexes();
  }

  private async createIndexes() {
    if (!this.db) return;
    
    try {
      // Index for rate limiting - separate indexes for TTL
      await this.db.collection('rate_limits').createIndex({ key: 1 });
      await this.db.collection('rate_limits').createIndex(
        { timestamp: 1 },
        { expireAfterSeconds: 3600 } // Auto-delete after 1 hour
      );
      
      // Index for audit logs
      await this.db.collection('audit_logs').createIndex({ timestamp: -1 });
      await this.db.collection('audit_logs').createIndex({ userId: 1, timestamp: -1 });
      await this.db.collection('audit_logs').createIndex({ ipAddress: 1, timestamp: -1 });
    } catch (error) {
      console.error('Failed to create security indexes:', error);
    }
  }

  async checkRateLimit(
    key: string, 
    config: RateLimitConfig = { windowMs: 60000, maxRequests: 100 }
  ): Promise<{ allowed: boolean; resetTime?: Date; remaining?: number }> {
    if (!this.config.enableRateLimit || !this.db) {
      return { allowed: true };
    }

    const now = new Date();
    const windowStart = new Date(now.getTime() - config.windowMs);

    try {
      // Clean up old entries
      await this.db.collection('rate_limits').deleteMany({
        key,
        windowStart: { $lt: windowStart }
      });

      // Count current requests in window
      const currentCount = await this.db.collection('rate_limits').countDocuments({
        key,
        windowStart: { $gte: windowStart }
      });

      if (currentCount >= config.maxRequests) {
        return {
          allowed: false,
          resetTime: new Date(now.getTime() + config.windowMs),
          remaining: 0
        };
      }

      // Record this request
      await this.db.collection('rate_limits').insertOne({
        key,
        windowStart: now,
        timestamp: now
      });

      return {
        allowed: true,
        remaining: config.maxRequests - currentCount - 1
      };
    } catch (error) {
      console.error('Rate limit check failed:', error);
      // Fail open for availability
      return { allowed: true };
    }
  }

  sanitizeInput(input: string): string {
    if (!this.config.enableInputSanitization) {
      return input;
    }

    // Length check
    if (input.length > this.config.maxInputLength) {
      throw new Error(`Input too long. Maximum ${this.config.maxInputLength} characters allowed.`);
    }

    // Check for blocked patterns
    for (const pattern of this.config.blockedPatterns) {
      const regex = new RegExp(pattern, 'gi');
      if (regex.test(input)) {
        throw new Error('Input contains potentially malicious content');
      }
    }

    // HTML sanitization
    const sanitized = DOMPurify.sanitize(input, {
      ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li'],
      ALLOWED_ATTR: ['href', 'title'],
      FORBID_SCRCIPT: true,
      FORBID_TAGS: ['script', 'object', 'embed', 'form', 'input'],
      FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover']
    });

    return sanitized;
  }

  async logAuditEvent(entry: AuditLogEntry): Promise<void> {
    if (!this.config.enableAuditLogging || !this.db) {
      return;
    }

    try {
      await this.db.collection('audit_logs').insertOne({
        ...entry,
        timestamp: new Date(entry.timestamp)
      });
    } catch (error) {
      console.error('Failed to log audit event:', error);
      // Don't throw - audit logging shouldn't break main flow
    }
  }

  async getAuditLogs(
    userId?: string,
    startDate?: Date,
    endDate?: Date,
    limit: number = 100
  ): Promise<AuditLogEntry[]> {
    if (!this.db) return [];

    const query: any = {};
    
    if (userId) {
      query.userId = userId;
    }
    
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = startDate;
      if (endDate) query.timestamp.$lte = endDate;
    }

    try {
      const logs = await this.db.collection('audit_logs')
        .find(query)
        .sort({ timestamp: -1 })
        .limit(limit)
        .toArray();

      return logs.map(log => ({
        ...log,
        timestamp: new Date(log.timestamp)
      }));
    } catch (error) {
      console.error('Failed to fetch audit logs:', error);
      return [];
    }
  }

  validateApiKey(apiKey: string): boolean {
    // Basic API key validation
    if (!apiKey || typeof apiKey !== 'string') {
      return false;
    }

    // Check format (should be 32+ characters, alphanumeric)
    const apiKeyRegex = /^[a-zA-Z0-9]{32,}$/;
    return apiKeyRegex.test(apiKey);
  }

  generateSecureId(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 32; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  // Get client IP address from request
  getClientIp(request: NextRequest): string {
    const forwarded = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    const remoteAddr = request.headers.get('remote-addr');
    
    if (forwarded) {
      return forwarded.split(',')[0].trim();
    }
    
    return realIp || remoteAddr || 'unknown';
  }

  // Generate rate limit key
  generateRateLimitKey(request: NextRequest, prefix: string = 'api'): string {
    const ip = this.getClientIp(request);
    const userAgent = request.headers.get('user-agent') || 'unknown';
    const route = new URL(request.url).pathname;
    
    return `${prefix}:${ip}:${route}`;
  }

  // Check if input contains sensitive information
  containsSensitiveInfo(input: string): boolean {
    const sensitivePatterns = [
      // Credit card patterns
      /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/,
      // SSN patterns
      /\b\d{3}[-]?\d{2}[-]?\d{4}\b/,
      // Email with password patterns
      /\S+@\S+\.\S+.*password/i,
      // API key patterns
      /api[_-]?key["\']?\s*[:=]\s*["\']?[a-zA-Z0-9]{20,}/i,
      // Token patterns
      /token["\']?\s*[:=]\s*["\']?[a-zA-Z0-9]{20,}/i,
    ];

    return sensitivePatterns.some(pattern => pattern.test(input));
  }
}

// Singleton instance
export const securityService = new SecurityService();

// Middleware helper for rate limiting
export async function withRateLimit(
  request: NextRequest,
  config?: RateLimitConfig
): Promise<{ allowed: boolean; headers: Record<string, string> }> {
  const key = securityService.generateRateLimitKey(request);
  const result = await securityService.checkRateLimit(key, config);
  
  const headers: Record<string, string> = {
    'X-RateLimit-Limit': config?.maxRequests?.toString() || '100',
    'X-RateLimit-Remaining': result.remaining?.toString() || '0',
  };
  
  if (result.resetTime) {
    headers['X-RateLimit-Reset'] = result.resetTime.toISOString();
  }
  
  return { allowed: result.allowed, headers };
}

// Middleware helper for input sanitization
export function withInputSanitization(input: any): any {
  if (typeof input === 'string') {
    return securityService.sanitizeInput(input);
  }
  
  if (Array.isArray(input)) {
    return input.map(item => withInputSanitization(item));
  }
  
  if (input && typeof input === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(input)) {
      sanitized[key] = withInputSanitization(value);
    }
    return sanitized;
  }
  
  return input;
}

// Middleware helper for audit logging
export async function withAuditLog(
  request: NextRequest,
  action: string,
  resource: string,
  userId?: string,
  success: boolean = true,
  errorMessage?: string,
  metadata?: any
): Promise<void> {
  await securityService.logAuditEvent({
    userId,
    ipAddress: securityService.getClientIp(request),
    userAgent: request.headers.get('user-agent') || undefined,
    action,
    resource,
    timestamp: new Date(),
    success,
    errorMessage,
    metadata
  });
}
