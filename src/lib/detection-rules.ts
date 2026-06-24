// SecretScout Pro — Detection Rules (JSON-safe, no RegExp at module level)

export interface DetectionRuleDef {
  id: string; name: string; description: string;
  pattern: string; secretGroup: number; category: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  isAstAware: boolean; isDiffAware: boolean;
}

export const BUILTIN_RULES: DetectionRuleDef[] = [
  { id: 'rule-aws-access-key', name: 'AWS Access Key ID', description: 'AWS Access Key IDs', pattern: '(?:A3T[A-Z0-9]|ABIA|ACCA|AGPA|AIDA|AIPA|ANPA|ANVA|APKA|AROA|ASCA|ASIA)[A-Z0-9]{16}', secretGroup: 0, category: 'cloud', severity: 'critical', isAstAware: true, isDiffAware: true },
  { id: 'aws-secret-key', name: 'AWS Secret Access Key', description: '40-char AWS secret keys', pattern: '(?i)aws[_\\-]?secret[_\\-]?access[_\\-]?key\\s*[:=]\\s*[\'\\"]?[A-Za-z0-9/+=]{40}', secretGroup: 0, category: 'cloud', severity: 'critical', isAstAware: true, isDiffAware: true },
  { id: 'github-pat', name: 'GitHub PAT', description: 'GitHub PATs', pattern: 'gh[pousr]_[A-Za-z0-9_]{36,255}', secretGroup: 0, category: 'git_platform', severity: 'critical', isAstAware: true, isDiffAware: true },
  { id: 'stripe-secret-key', name: 'Stripe Secret Key', description: 'Stripe live secret keys', pattern: 'sk_live_[A-Za-z0-9]{24,99}', secretGroup: 0, category: 'payment', severity: 'critical', isAstAware: true, isDiffAware: true },
  { id: 'stripe-publishable-key', name: 'Stripe Publishable Key', description: 'Stripe publishable keys', pattern: 'pk_live_[A-Za-z0-9]{24,99}', secretGroup: 0, category: 'payment', severity: 'medium', isAstAware: false, isDiffAware: true },
  { id: 'private-key-rsa', name: 'Private Key (RSA)', description: 'RSA PEM private keys', pattern: '-----BEGIN RSA PRIVATE KEY-----', secretGroup: 0, category: 'crypto', severity: 'critical', isAstAware: true, isDiffAware: true },
  { id: 'private-key-generic', name: 'Private Key (Generic)', description: 'Generic PEM private keys', pattern: '-----BEGIN (?:EC |DSA |OPENSSH )?PRIVATE KEY-----', secretGroup: 0, category: 'crypto', severity: 'critical', isAstAware: true, isDiffAware: true },
  { id: 'slack-token', name: 'Slack Token', description: 'Slack tokens', pattern: 'xox[bapr]-[A-Za-z0-9-]{10,255}', secretGroup: 0, category: 'messaging', severity: 'high', isAstAware: true, isDiffAware: true },
  { id: 'slack-webhook', name: 'Slack Webhook', description: 'Slack webhook URLs', pattern: 'https://hooks\\.slack\\.com/services/T[A-Z0-9]+/B[A-Z0-9]+/[A-Za-z0-9]+', secretGroup: 0, category: 'messaging', severity: 'high', isAstAware: true, isDiffAware: true },
  { id: 'sendgrid-api-key', name: 'SendGrid API Key', description: 'SendGrid keys', pattern: 'SG\\.[A-Za-z0-9_\\-]{22,66}\\.[A-Za-z0-9_\\-]{22,66}', secretGroup: 0, category: 'email', severity: 'high', isAstAware: true, isDiffAware: true },
  { id: 'google-api-key', name: 'Google API Key', description: 'Google API keys', pattern: 'AIza[0-9A-Za-z_-]{35}', secretGroup: 0, category: 'cloud', severity: 'high', isAstAware: true, isDiffAware: true },
  { id: 'google-oauth', name: 'Google OAuth', description: 'Google OAuth tokens', pattern: 'ya29\\.[A-Za-z0-9_-]+', secretGroup: 0, category: 'cloud', severity: 'high', isAstAware: true, isDiffAware: true },
  { id: 'mongodb-uri', name: 'MongoDB URI', description: 'MongoDB URIs with creds', pattern: 'mongodb(?:\\+srv)?:\\/\\/[^:\\s]+:[^@\\s]+@[^\\s]+', secretGroup: 0, category: 'database', severity: 'critical', isAstAware: true, isDiffAware: true },
  { id: 'postgres-uri', name: 'PostgreSQL URI', description: 'PostgreSQL URIs', pattern: 'postgres(?:ql)?:\\/\\/[^:\\s]+:[^@\\s]+@[^\\s]+', secretGroup: 0, category: 'database', severity: 'critical', isAstAware: true, isDiffAware: true },
  { id: 'generic-api-key', name: 'Generic API Key', description: 'Generic key assignments', pattern: '(?i)(?:api[_\\-]?key|apikey|secret[_\\-]?key|access[_\\-]?key|auth[_\\-]?token|password)\\s*[:=]\\s*[\'\\"]([^\'"]{8,120})[\'\\"]', secretGroup: 1, category: 'generic', severity: 'high', isAstAware: true, isDiffAware: true },
  { id: 'jwt-token', name: 'JWT Token', description: 'JSON Web Tokens', pattern: 'eyJ[A-Za-z0-9_-]{10,}\\.eyJ[A-Za-z0-9_-]{10,}\\.[A-Za-z0-9_-]{10,}', secretGroup: 0, category: 'auth', severity: 'medium', isAstAware: false, isDiffAware: true },
  { id: 'heroku-api-key', name: 'Heroku API Key', description: 'Heroku API keys', pattern: '(?i)heroku[a-z0-9_ .\\-]{0,24}(?:key|token|api)[a-z0-9_ .\\-]{0,24}[\\s:=][\'\\"]?[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}', secretGroup: 0, category: 'platform', severity: 'high', isAstAware: false, isDiffAware: true },
  { id: 'twilio-api-key', name: 'Twilio API Key', description: 'Twilio keys', pattern: 'SK[0-9a-fA-F]{32}', secretGroup: 0, category: 'communication', severity: 'high', isAstAware: true, isDiffAware: true },
  { id: 'github-app-token', name: 'GitHub App Token', description: 'GitHub App tokens', pattern: '(?:ghs|ghr)_[A-Za-z0-9_]{36,255}', secretGroup: 0, category: 'git_platform', severity: 'critical', isAstAware: true, isDiffAware: true },
  { id: 'github-oauth', name: 'GitHub OAuth', description: 'GitHub OAuth tokens', pattern: 'gho_[A-Za-z0-9_]{36,255}', secretGroup: 0, category: 'git_platform', severity: 'critical', isAstAware: true, isDiffAware: true },
];

export function buildDedupHash(filePath: string, patternId: string, matchedValue: string, commitHash: string): string {
  const data = `${filePath}:${patternId}:${matchedValue}:${commitHash}`;
  let h1 = 5381, h2 = 52711;
  for (let i = 0; i < data.length; i++) { h1 = ((h1 << 5) + h1 + data.charCodeAt(i)) | 0; h2 = ((h2 << 5) + h2 + data.charCodeAt(i)) | 0; }
  return `${(h1 >>> 0).toString(16)}${(h2 >>> 0).toString(16)}`.padStart(32, '0');
}