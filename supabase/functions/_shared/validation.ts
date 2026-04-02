// Input validation utilities for edge functions
// Centralizes validation logic to ensure consistent security across all functions

// Maximum allowed lengths for different input types
export const INPUT_LIMITS = {
  ISSUE_KEY: 50,          // Jira issue keys like "PROJ-123"
  QUESTION: 10000,        // User questions (10KB max)
  BDD_CONTENT: 50000,     // Generated BDD content
  TITLE: 500,             // Document/connection titles
  NOTES: 20000,           // Project notes
  TAG: 100,               // Individual tag
  MAX_TAGS: 20,           // Maximum number of tags
  CONNECTION_ID: 36,      // UUID length
  URL: 2000,              // URLs
  EMAIL: 320,             // Email addresses
  CONVERSATION_HISTORY: 50, // Max conversation messages
} as const;

// Validate Jira issue key format (alphanumeric + dash only)
export function isValidIssueKey(key: string): boolean {
  if (!key || typeof key !== 'string') return false;
  if (key.length > INPUT_LIMITS.ISSUE_KEY) return false;
  // Format: PROJECT-123 (letters/numbers, dash, numbers)
  return /^[A-Z0-9]+-\d+$/i.test(key);
}

// Validate UUID format
export function isValidUUID(uuid: string): boolean {
  if (!uuid || typeof uuid !== 'string') return false;
  if (uuid.length !== INPUT_LIMITS.CONNECTION_ID) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uuid);
}

// Validate string length
export function isValidLength(value: string | undefined | null, maxLength: number): boolean {
  if (value === undefined || value === null) return true; // Optional fields
  if (typeof value !== 'string') return false;
  return value.length <= maxLength;
}

// Validate email format
export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  if (email.length > INPUT_LIMITS.EMAIL) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Validate URL format
export function isValidUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  if (url.length > INPUT_LIMITS.URL) return false;
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

// Validate array of strings
export function isValidStringArray(arr: unknown, maxItems: number, maxItemLength: number): boolean {
  if (!Array.isArray(arr)) return false;
  if (arr.length > maxItems) return false;
  return arr.every(item => typeof item === 'string' && item.length <= maxItemLength);
}

// Sanitize string for logging (remove potential injection characters)
export function sanitizeForLog(value: string, maxLength = 200): string {
  if (!value || typeof value !== 'string') return '[invalid]';
  return value
    .substring(0, maxLength)
    .replace(/[\n\r\t]/g, ' ')
    .replace(/[^\x20-\x7E]/g, ''); // Only printable ASCII
}

// Generic error messages for different error types
export const GENERIC_ERRORS = {
  AUTH_REQUIRED: 'Autenticação necessária',
  AUTH_INVALID: 'Sessão inválida ou expirada',
  FORBIDDEN: 'Acesso negado',
  NOT_FOUND: 'Recurso não encontrado',
  VALIDATION: 'Dados inválidos',
  RATE_LIMIT: 'Limite de requisições excedido. Tente novamente em alguns minutos.',
  CREDITS: 'Créditos esgotados. Adicione créditos à sua conta.',
  EXTERNAL_SERVICE: 'Erro ao conectar com serviço externo',
  INTERNAL: 'Erro interno. Tente novamente.',
  CONFIG: 'Serviço não configurado corretamente',
} as const;

// Log error details server-side only, return generic message
export function handleError(error: unknown, context: string): { message: string; status: number } {
  const errorDetails = error instanceof Error ? error.message : String(error);
  console.error(`[${context}] Error:`, errorDetails);
  
  // Map known error patterns to generic messages
  if (errorDetails.includes('401') || errorDetails.includes('Unauthorized')) {
    return { message: GENERIC_ERRORS.AUTH_INVALID, status: 401 };
  }
  if (errorDetails.includes('403') || errorDetails.includes('Forbidden')) {
    return { message: GENERIC_ERRORS.FORBIDDEN, status: 403 };
  }
  if (errorDetails.includes('404') || errorDetails.includes('Not Found')) {
    return { message: GENERIC_ERRORS.NOT_FOUND, status: 404 };
  }
  if (errorDetails.includes('429') || errorDetails.includes('rate limit')) {
    return { message: GENERIC_ERRORS.RATE_LIMIT, status: 429 };
  }
  if (errorDetails.includes('402') || errorDetails.includes('payment')) {
    return { message: GENERIC_ERRORS.CREDITS, status: 402 };
  }
  
  // Default to generic internal error
  return { message: GENERIC_ERRORS.INTERNAL, status: 500 };
}
