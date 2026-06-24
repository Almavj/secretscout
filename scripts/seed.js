// SecretScout Pro — Production Seed Script
// Seeds only: 1 org, 1 user, builtin detection rules, builtin dork templates
// NO demo findings, NO demo scans, NO fake data

const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

async function main() {
  console.log('[Seed] Starting production seed...');

  // Clean existing data (order matters due to FK constraints)
  await db.findingEvent.deleteMany();
  await db.finding.deleteMany();
  await db.scan.deleteMany();
  await db.dorkTemplate.deleteMany();
  await db.detectionRule.deleteMany();
  await db.tokenPool.deleteMany();
  await db.sourceProvider.deleteMany();
  await db.scopeEntry.deleteMany();
  await db.integration.deleteMany();
  await db.orgMember.deleteMany();
  await db.user.deleteMany();
  await db.organization.deleteMany();

  // Create organization
  const org = await db.organization.create({
    data: {
      id: 'org-default',
      name: 'My Organization',
      slug: 'default',
      plan: 'team',
    },
  });
  console.log(`[Seed] Created org: ${org.name} (${org.id})`);

  // Create admin user
  const user = await db.user.create({
    data: {
      id: 'user-admin',
      email: 'admin@localhost',
      name: 'Admin',
    },
  });

  await db.orgMember.create({
    data: {
      organizationId: org.id,
      userId: user.id,
      role: 'admin',
    },
  });
  console.log(`[Seed] Created user: ${user.email}`);

  // Create GitHub source provider
  const githubProvider = await db.sourceProvider.create({
    data: {
      id: 'provider-github',
      organizationId: org.id,
      type: 'github',
      name: 'GitHub',
      enabled: true,
      config: JSON.stringify({
        apiEndpoint: 'https://api.github.com',
        scanForks: false,
        maxConcurrentRequests: 5,
      }),
    },
  });
  console.log(`[Seed] Created provider: ${githubProvider.name}`);

  // Seed builtin detection rules (gitleaks baseline — 20 rules)
  const rules = [
    { id: 'rule-aws-access-key', name: 'AWS Access Key ID', description: 'Detects AWS Access Key IDs (starts with AKIA)', pattern: '(?:A3T[A-Z0-9]|ABIA|ACCA|AGPA|AIDA|AIPA|ANPA|ANVA|APKA|AROA|ASCA|ASIA)[A-Z0-9]{16}', secretGroup: 0, category: 'cloud', severity: 'critical', isAstAware: true, isDiffAware: true },
    { id: 'aws-secret-key', name: 'AWS Secret Access Key', description: 'Detects 40-character AWS secret keys', pattern: '(?i)aws[_\\-]?secret[_\\-]?access[_\\-]?key\\s*[:=]\\s*[\'\\"]?[A-Za-z0-9/+=]{40}', secretGroup: 0, category: 'cloud', severity: 'critical', isAstAware: true, isDiffAware: true },
    { id: 'github-pat', name: 'GitHub Personal Access Token', description: 'Detects GitHub PATs (ghp_, gho_, ghu_, ghs_, ghr_)', pattern: 'ghp_[A-Za-z0-9_]{36,255}|gho_[A-Za-z0-9_]{36,255}|ghu_[A-Za-z0-9_]{36,255}|ghs_[A-Za-z0-9_]{36,255}|ghr_[A-Za-z0-9_]{36,255}', secretGroup: 0, category: 'git_platform', severity: 'critical', isAstAware: true, isDiffAware: true },
    { id: 'github-oauth', name: 'GitHub OAuth Access Token', description: 'Detects GitHub OAuth tokens', pattern: 'gho_[A-Za-z0-9_]{36,255}', secretGroup: 0, category: 'git_platform', severity: 'critical', isAstAware: true, isDiffAware: true },
    { id: 'github-app-token', name: 'GitHub App Token', description: 'Detects GitHub App installation tokens', pattern: '(?:ghs|ghr)_[A-Za-z0-9_]{36,255}', secretGroup: 0, category: 'git_platform', severity: 'critical', isAstAware: true, isDiffAware: true },
    { id: 'stripe-secret-key', name: 'Stripe Secret Key', description: 'Detects Stripe live secret keys', pattern: 'sk_live_[A-Za-z0-9]{24,99}', secretGroup: 0, category: 'payment', severity: 'critical', isAstAware: true, isDiffAware: true },
    { id: 'stripe-publishable-key', name: 'Stripe Publishable Key', description: 'Detects Stripe publishable keys', pattern: 'pk_live_[A-Za-z0-9]{24,99}', secretGroup: 0, category: 'payment', severity: 'medium', isAstAware: false, isDiffAware: true },
    { id: 'private-key-rsa', name: 'Private Key (RSA)', description: 'Detects RSA private keys in PEM format', pattern: '-----BEGIN RSA PRIVATE KEY-----', secretGroup: 0, category: 'crypto', severity: 'critical', isAstAware: true, isDiffAware: true },
    { id: 'private-key-generic', name: 'Private Key (Generic)', description: 'Detects generic private keys in PEM format', pattern: '-----BEGIN (?:EC |DSA |OPENSSH )?PRIVATE KEY-----', secretGroup: 0, category: 'crypto', severity: 'critical', isAstAware: true, isDiffAware: true },
    { id: 'slack-token', name: 'Slack Token', description: 'Detects Slack bot/user tokens', pattern: 'xox[bapr]-[A-Za-z0-9-]{10,255}', secretGroup: 0, category: 'messaging', severity: 'high', isAstAware: true, isDiffAware: true },
    { id: 'slack-webhook', name: 'Slack Webhook URL', description: 'Detects Slack webhook URLs', pattern: 'https://hooks\\.slack\\.com/services/T[A-Z0-9]+/B[A-Z0-9]+/[A-Za-z0-9]+', secretGroup: 0, category: 'messaging', severity: 'high', isAstAware: true, isDiffAware: true },
    { id: 'sendgrid-api-key', name: 'SendGrid API Key', description: 'Detects SendGrid API keys', pattern: 'SG\\.[A-Za-z0-9_\\-]{22,66}\\.[A-Za-z0-9_\\-]{22,66}', secretGroup: 0, category: 'email', severity: 'high', isAstAware: true, isDiffAware: true },
    { id: 'twilio-api-key', name: 'Twilio API Key', description: 'Detects Twilio API keys', pattern: 'SK[0-9a-fA-F]{32}', secretGroup: 0, category: 'communication', severity: 'high', isAstAware: true, isDiffAware: true },
    { id: 'google-api-key', name: 'Google API Key', description: 'Detects Google API keys', pattern: 'AIza[0-9A-Za-z_-]{35}', secretGroup: 0, category: 'cloud', severity: 'high', isAstAware: true, isDiffAware: true },
    { id: 'google-oauth', name: 'Google OAuth Token', description: 'Detects Google OAuth access tokens', pattern: 'ya29\\.[A-Za-z0-9_-]+', secretGroup: 0, category: 'cloud', severity: 'high', isAstAware: true, isDiffAware: true },
    { id: 'heroku-api-key', name: 'Heroku API Key', description: 'Detects Heroku API keys', pattern: '(?i)heroku[a-z0-9_ .\\-]{0,24}(?:key|token|api)[a-z0-9_ .\\-]{0,24}[\\s:=][\'\\"]?[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}', secretGroup: 0, category: 'platform', severity: 'high', isAstAware: false, isDiffAware: true },
    { id: 'mongodb-uri', name: 'MongoDB Connection URI', description: 'Detects MongoDB connection strings with credentials', pattern: 'mongodb(?:\\+srv)?:\\/\\/[^:\\s]+:[^@\\s]+@[^\\s]+', secretGroup: 0, category: 'database', severity: 'critical', isAstAware: true, isDiffAware: true },
    { id: 'postgres-uri', name: 'PostgreSQL Connection URI', description: 'Detects PostgreSQL connection strings', pattern: 'postgres(?:ql)?:\\/\\/[^:\\s]+:[^@\\s]+@[^\\s]+', secretGroup: 0, category: 'database', severity: 'critical', isAstAware: true, isDiffAware: true },
    { id: 'generic-api-key-assignment', name: 'Generic API Key (Assignment)', description: 'Detects generic API key assignments in code', pattern: '(?i)(?:api[_\\-]?key|apikey|secret[_\\-]?key|access[_\\-]?key|auth[_\\-]?token|private[_\\-]?key|password|passwd|pwd)\\s*[:=]\\s*[\'\\"]([^\'"]{8,120})[\'\\"]', secretGroup: 1, category: 'generic', severity: 'high', isAstAware: true, isDiffAware: true },
    { id: 'jwt-token', name: 'JSON Web Token (JWT)', description: 'Detects JSON Web Tokens', pattern: 'eyJ[A-Za-z0-9_-]{10,}\\.eyJ[A-Za-z0-9_-]{10,}\\.[A-Za-z0-9_-]{10,}', secretGroup: 0, category: 'auth', severity: 'medium', isAstAware: false, isDiffAware: true },
  ];

  for (const rule of rules) {
    await db.detectionRule.create({
      data: {
        ...rule,
        organizationId: org.id,
        isBuiltin: true,
        enabled: true,
        tomlConfig: '',
      },
    });
  }
  console.log(`[Seed] Created ${rules.length} builtin detection rules`);

  // Seed builtin dork templates (12 templates)
  const dorks = [
    { name: 'AWS Keys in Env Files', queryTemplate: '{org} filename:.env AKIA', category: 'cloud', severity: 'critical', description: 'AWS access key patterns in .env files' },
    { name: 'GitHub PATs in Config', queryTemplate: '{org} filename:config ghp_', category: 'git_platform', severity: 'critical', description: 'GitHub PATs in config files' },
    { name: 'Stripe Keys in Source', queryTemplate: '{org} sk_live_', category: 'payment', severity: 'critical', description: 'Live Stripe secret keys' },
    { name: 'Private Keys in Code', queryTemplate: '{org} "BEGIN PRIVATE KEY"', category: 'crypto', severity: 'critical', description: 'PEM-encoded private keys' },
    { name: 'Slack Tokens', queryTemplate: '{org} xoxb-', category: 'messaging', severity: 'high', description: 'Slack bot tokens' },
    { name: 'Database URIs', queryTemplate: '{org} "mongodb://" password OR "postgres://" password', category: 'database', severity: 'critical', description: 'Database connection strings with credentials' },
    { name: 'Generic API Key Assignments', queryTemplate: '{org} "api_key" = OR "API_KEY" =', category: 'generic', severity: 'high', description: 'Generic API key assignments' },
    { name: 'Secrets in Dockerfiles', queryTemplate: '{org} filename:Dockerfile ENV SECRET OR ENV KEY OR ENV TOKEN', category: 'infrastructure', severity: 'high', description: 'Secrets hardcoded in Dockerfiles' },
    { name: 'SendGrid Keys', queryTemplate: '{org} SG.', category: 'email', severity: 'high', description: 'SendGrid API keys' },
    { name: 'Google API Keys', queryTemplate: '{org} AIza', category: 'cloud', severity: 'high', description: 'Google API keys' },
    { name: 'JWT Tokens', queryTemplate: '{org} eyJhbGci', category: 'auth', severity: 'medium', description: 'JSON Web Tokens' },
    { name: 'Heroku Config Vars', queryTemplate: '{org} HEROKU_API_KEY', category: 'platform', severity: 'high', description: 'Heroku API keys' },
  ];

  for (const dork of dorks) {
    await db.dorkTemplate.create({
      data: {
        ...dork,
        providerId: githubProvider.id,
        isBuiltin: true,
        enabled: true,
        scheduleCron: '0 */6 * * *',
      },
    });
  }
  console.log(`[Seed] Created ${dorks.length} builtin dork templates`);

  console.log('[Seed] Production seed complete. No demo data seeded.');
  console.log('[Seed] Next steps:');
  console.log('  1. Add a GitHub PAT in Settings > Token Pool');
  console.log('  2. Add scope entries (orgs/repos) in Settings > Scope Allowlist');
  console.log('  3. Trigger a scan from Discovery > Start Scan');
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());