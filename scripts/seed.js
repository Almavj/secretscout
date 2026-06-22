const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

function hashStr(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h).toString(16).padStart(64, '0');
}

function daysAgo(d) { return new Date(Date.now() - d * 86400000); }
function hoursAgo(h) { return new Date(Date.now() - h * 3600000); }

async function seed() {
  console.log('Seeding SecretScout Pro...');
  await db.findingEvent.deleteMany();
  await db.finding.deleteMany();
  await db.scan.deleteMany();
  await db.detectionRule.deleteMany();
  await db.dorkTemplate.deleteMany();
  await db.tokenPool.deleteMany();
  await db.sourceProvider.deleteMany();
  await db.scopeEntry.deleteMany();
  await db.orgMember.deleteMany();
  await db.integration.deleteMany();
  await db.organization.deleteMany();
  await db.user.deleteMany();

  const sarah = await db.user.create({ data: { email: 'admin@acme.com', name: 'Sarah Chen' } });
  const james = await db.user.create({ data: { email: 'dev@acme.com', name: 'James Wilson' } });
  const maria = await db.user.create({ data: { email: 'security@acme.com', name: 'Maria Rodriguez' } });

  const org = await db.organization.create({
    data: {
      name: 'Acme Corp', slug: 'acme-corp', plan: 'enterprise',
      members: { create: [
        { userId: sarah.id, role: 'admin' },
        { userId: james.id, role: 'editor' },
        { userId: maria.id, role: 'admin' },
      ]},
      scopeEntries: { create: [
        { targetType: 'github_org', targetValue: 'acme-corp', accessLevel: 'admin' },
        { targetType: 'github_org', targetValue: 'acme-infrastructure', accessLevel: 'write' },
        { targetType: 'repo_allowlist', targetValue: 'acme-corp/core-api', accessLevel: 'admin' },
        { targetType: 'repo_allowlist', targetValue: 'acme-corp/mobile-app', accessLevel: 'write' },
        { targetType: 'gitlab_group', targetValue: 'acme-internal', accessLevel: 'write' },
      ]},
      integrations: { create: [
        { type: 'slack', name: 'Security Alerts', enabled: true, config: JSON.stringify({ webhookUrl: 'https://hooks.slack.com/services/T00/B00/xxx', channel: '#security-alerts', mentionChannel: '@security-team', severityFilter: ['critical', 'high'] }) },
        { type: 'pagerduty', name: 'Critical Escalation', enabled: true, config: JSON.stringify({ routingKey: 'pd-key-xxx', severityFilter: ['critical'] }) },
        { type: 'webhook', name: 'Jira Ticket Creator', enabled: false, config: JSON.stringify({ url: 'https://acme.atlassian.net/rest/api/2/issue', headers: { Authorization: 'Bearer xxx' }, secret: 'whsec-xxx' }) },
      ]}
    }
  });

  const ghProvider = await db.sourceProvider.create({
    data: {
      organizationId: org.id, type: 'github', name: 'GitHub Enterprise', enabled: true,
      config: JSON.stringify({ apiEndpoint: 'https://api.github.com', scanForks: true }),
      tokenPools: { create: [
        { label: 'GitHub App #1 (Primary)', tokenType: 'github_app', tokenValue: 'ghs_app1_xxx', rateLimitRemaining: 28, lastUsedAt: hoursAgo(0.5) },
        { label: 'GitHub App #2 (Secondary)', tokenType: 'github_app', tokenValue: 'ghs_app2_xxx', rateLimitRemaining: 30 },
        { label: 'PAT - CI Scanner Bot', tokenType: 'pat', tokenValue: 'ghp_ciscanner_xxx', rateLimitRemaining: 15, lastUsedAt: hoursAgo(2) },
        { label: 'PAT - Security Team', tokenType: 'pat', tokenValue: 'ghp_secteam_xxx', rateLimitRemaining: 30 },
      ]}
    }
  });

  const glProvider = await db.sourceProvider.create({
    data: {
      organizationId: org.id, type: 'gitlab', name: 'GitLab Self-Hosted', enabled: true,
      config: JSON.stringify({ apiEndpoint: 'https://gitlab.acme.com/api/v4' }),
      tokenPools: { create: [
        { label: 'GitLab Token - Security', tokenType: 'gitlab_token', tokenValue: 'glpat-sec-xxx' },
        { label: 'GitLab Token - CI', tokenType: 'gitlab_token', tokenValue: 'glpat-ci-xxx' },
      ]}
    }
  });

  const dorks = await Promise.all([
    db.dorkTemplate.create({ data: { providerId: ghProvider.id, name: 'DotEnv Files', description: 'Finds .env files that may contain secrets', queryTemplate: 'filename:.env org:{org}', category: 'config_file', severity: 'critical', isBuiltin: true, lastRunAt: hoursAgo(2) } }),
    db.dorkTemplate.create({ data: { providerId: ghProvider.id, name: 'PEM Certificates', description: 'Finds PEM-encoded certificates and keys', queryTemplate: 'extension:pem org:{org}', category: 'certificate', severity: 'critical', isBuiltin: true, lastRunAt: hoursAgo(2) } }),
    db.dorkTemplate.create({ data: { providerId: ghProvider.id, name: 'AWS Keys in JSON', description: 'Finds AWS access key patterns in JSON files', queryTemplate: '"AKIA" AND extension:json org:{org}', category: 'aws', severity: 'critical', isBuiltin: true } }),
    db.dorkTemplate.create({ data: { providerId: ghProvider.id, name: 'Private Keys', description: 'Finds BEGIN PRIVATE KEY blocks', queryTemplate: '"BEGIN PRIVATE KEY" org:{org}', category: 'certificate', severity: 'critical', isBuiltin: true, lastRunAt: daysAgo(1) } }),
    db.dorkTemplate.create({ data: { providerId: ghProvider.id, name: 'NPMRC Files', description: 'Finds .npmrc files with auth tokens', queryTemplate: 'filename:.npmrc org:{org}', category: 'config_file', severity: 'high', isBuiltin: true } }),
    db.dorkTemplate.create({ data: { providerId: ghProvider.id, name: 'AWS Credentials File', description: 'Finds AWS credentials files', queryTemplate: 'filename:credentials extension:* org:{org}', category: 'aws', severity: 'critical', isBuiltin: true } }),
    db.dorkTemplate.create({ data: { providerId: ghProvider.id, name: 'Stripe Live Keys', description: 'Finds Stripe live secret keys', queryTemplate: 'sk_live_ org:{org}', category: 'api_key', severity: 'critical' } }),
    db.dorkTemplate.create({ data: { providerId: ghProvider.id, name: 'Custom Config Secrets', description: 'Finds custom secrets config files', queryTemplate: 'path:config filename:secrets.{json,yaml,yml} org:{org}', category: 'generic_secret', severity: 'high' } }),
  ]);

  const rules = await Promise.all([
    db.detectionRule.create({ data: { organizationId: org.id, name: 'AWS Access Key ID', description: 'Matches AWS IAM access key IDs starting with AKIA', pattern: 'AKIA[0-9A-Z]{16}', category: 'aws', severity: 'critical', isBuiltin: true, isAstAware: true, isDiffAware: true } }),
    db.detectionRule.create({ data: { organizationId: org.id, name: 'AWS Secret Access Key', description: 'Matches AWS secret access keys', pattern: '(?:A3T[A-Z0-9]|ABIA|ACCA|AGPA|AIDA|AIPA|ANPA|ANVA|APKA|AROA|ASCA|ASIA)[A-Z0-9]{16}', category: 'aws', severity: 'critical', isBuiltin: true, isDiffAware: true } }),
    db.detectionRule.create({ data: { organizationId: org.id, name: 'GitHub PAT', description: 'Matches GitHub personal access tokens', pattern: 'ghp_[A-Za-z0-9_]{36}', category: 'github', severity: 'critical', isBuiltin: true, isAstAware: true, isDiffAware: true } }),
    db.detectionRule.create({ data: { organizationId: org.id, name: 'GitHub OAuth Token', description: 'Matches GitHub OAuth access tokens', pattern: 'gho_[A-Za-z0-9_]{36}', category: 'github', severity: 'critical', isBuiltin: true, isDiffAware: true } }),
    db.detectionRule.create({ data: { organizationId: org.id, name: 'Stripe Secret Key', description: 'Matches Stripe live secret keys', pattern: 'sk_live_[0-9a-zA-Z]{24,}', category: 'stripe', severity: 'critical', isBuiltin: true, isAstAware: true, isDiffAware: true } }),
    db.detectionRule.create({ data: { organizationId: org.id, name: 'Stripe Publishable Key', description: 'Matches Stripe publishable keys', pattern: 'pk_live_[0-9a-zA-Z]{24,}', category: 'stripe', severity: 'high', isBuiltin: true, isDiffAware: true } }),
    db.detectionRule.create({ data: { organizationId: org.id, name: 'Generic API Key', description: 'Matches common API key assignment patterns', pattern: '(?i)(api[_-]?key|apikey|api[_-]?secret)', category: 'generic_secret', severity: 'high', isBuiltin: true, isAstAware: true } }),
    db.detectionRule.create({ data: { organizationId: org.id, name: 'Generic Secret/Password', description: 'Matches common password/secret assignment patterns', pattern: '(?i)(secret|password|passwd|pwd)', category: 'generic_secret', severity: 'high', isBuiltin: true, isAstAware: true } }),
    db.detectionRule.create({ data: { organizationId: org.id, name: 'RSA Private Key', description: 'Matches PEM-encoded RSA private keys', pattern: '-----BEGIN (?:RSA )?PRIVATE KEY-----', category: 'private_key', severity: 'critical', isBuiltin: true, isDiffAware: true } }),
    db.detectionRule.create({ data: { organizationId: org.id, name: 'Slack Token', description: 'Matches Slack bot/user tokens', pattern: 'xox[baprs]-[0-9]{10,13}-[0-9a-zA-Z]{24,}', category: 'custom', severity: 'high', isDiffAware: true } }),
    db.detectionRule.create({ data: { organizationId: org.id, name: 'SendGrid API Key', description: 'Matches SendGrid API keys', pattern: 'SG\\.[A-Za-z0-9_\\-]{22}\\.[A-Za-z0-9_\\-]{43}', category: 'custom', severity: 'high', isDiffAware: true } }),
    db.detectionRule.create({ data: { organizationId: org.id, name: 'JWT Token Pattern', description: 'Matches JWT token patterns', pattern: 'eyJ[a-zA-Z0-9_-]*\\.eyJ[a-zA-Z0-9_-]*\\.[a-zA-Z0-9_-]*', category: 'custom', severity: 'medium', isDiffAware: true } }),
  ]);

  const scans = await Promise.all([
    db.scan.create({ data: { organizationId: org.id, providerId: ghProvider.id, dorkTemplateId: dorks[0].id, status: 'completed', scanType: 'scheduled_dork', scopeMode: 'restricted', startedAt: hoursAgo(2.5), completedAt: hoursAgo(2), statsTotal: 150, statsNew: 12, statsDuplicate: 138 } }),
    db.scan.create({ data: { organizationId: org.id, providerId: ghProvider.id, status: 'completed', scanType: 'realtime_event', scopeMode: 'restricted', startedAt: hoursAgo(1), completedAt: hoursAgo(0.75), statsTotal: 3, statsNew: 3, statsDuplicate: 0 } }),
    db.scan.create({ data: { organizationId: org.id, providerId: ghProvider.id, status: 'completed', scanType: 'gharchive_bulk', scopeMode: 'restricted', startedAt: daysAgo(1.2), completedAt: daysAgo(1), statsTotal: 500, statsNew: 45, statsDuplicate: 455 } }),
    db.scan.create({ data: { organizationId: org.id, providerId: ghProvider.id, status: 'completed', scanType: 'fork_walk', scopeMode: 'restricted', startedAt: daysAgo(2.5), completedAt: daysAgo(2), statsTotal: 20, statsNew: 5, statsDuplicate: 15 } }),
    db.scan.create({ data: { organizationId: org.id, providerId: ghProvider.id, status: 'running', scanType: 'manual', scopeMode: 'restricted', startedAt: hoursAgo(0.1), statsTotal: 47, statsNew: 2, statsDuplicate: 45 } }),
    db.scan.create({ data: { organizationId: org.id, providerId: ghProvider.id, dorkTemplateId: dorks[2].id, status: 'queued', scanType: 'scheduled_dork', scopeMode: 'restricted' } }),
    db.scan.create({ data: { organizationId: org.id, providerId: ghProvider.id, status: 'completed', scanType: 'gharchive_bulk', scopeMode: 'public_discovery', startedAt: daysAgo(3.5), completedAt: daysAgo(3), statsTotal: 2000, statsNew: 200, statsDuplicate: 1800 } }),
    db.scan.create({ data: { organizationId: org.id, providerId: ghProvider.id, status: 'failed', scanType: 'gharchive_bulk', scopeMode: 'restricted', startedAt: daysAgo(5.2), completedAt: daysAgo(5.1), errorMessage: 'BigQuery quota exceeded. Retry after 2026-06-28T00:00:00Z.' } }),
  ]);

  const findings = [
    { ri: 0, secret: 'AWS Access Key', matched: 'AKIAIOSFODNN7EXAMPLE', file: '.env.production', repo: 'acme-corp/core-api', commit: 'a1b2c3d4', author: 'sarah-chen', msg: 'fix: update production env', sev: 'critical', st: 'remediated', v: true, ast: true, fork: false, h: 1.5, mttr: 1.5, ln: 12 },
    { ri: 1, secret: 'AWS Secret Key', matched: 'wJalrXUtnFEMI/K7MDENG...', file: 'config/credentials.json', repo: 'acme-corp/core-api', commit: 'a1b2c3d4', author: 'sarah-chen', msg: 'fix: update production env', sev: 'critical', st: 'remediated', v: true, ast: true, fork: false, h: 1.5, mttr: 1.5, ln: 5 },
    { ri: 4, secret: 'Stripe Secret Key', matched: 'sk_live_51Hxxx...fullkey', file: '.env.production', repo: 'acme-corp/payment-service', commit: 'e4f5g6h7', author: 'james-wilson', msg: 'feat: add stripe integration', sev: 'critical', st: 'open', v: true, ast: true, fork: false, h: 0.5, mttr: null, ln: 8 },
    { ri: 8, secret: 'RSA Private Key', matched: '-----BEGIN RSA PRIVATE KEY-----', file: 'deploy/ssh-key.pem', repo: 'acme-corp/infra-terraform', commit: 'i7j8k9l0', author: 'deploy-bot', msg: 'ci: add deployment key', sev: 'critical', st: 'acknowledged', v: true, ast: false, fork: false, h: 4, mttr: null, ln: 1 },
    { ri: 0, secret: 'AWS Access Key', matched: 'AKIAI44QH8DHBEXAMPLE', file: 'k8s/secrets.yml', repo: 'acme-corp/infra-terraform', commit: 'm1n2o3p4', author: 'deploy-bot', msg: 'fix: update k8s manifests', sev: 'critical', st: 'open', v: false, ast: false, fork: false, h: 6, mttr: null, ln: 15 },
    { ri: 2, secret: 'GitHub PAT', matched: 'ghp_xxxxxxxxxxxxxxxxxxxx', file: '.github/workflows/deploy.yml', repo: 'acme-corp/core-api', commit: 'q4r5s6t7', author: 'sarah-chen', msg: 'ci: update workflow tokens', sev: 'critical', st: 'remediated', v: true, ast: true, fork: false, h: 2, mttr: 2, ln: 22 },
    { ri: 6, secret: 'Generic API Key', matched: 'SENDGRID_API_KEY=SG.xxx...', file: 'src/config/email.ts', repo: 'acme-corp/core-api', commit: 'u7v8w9x0', author: 'james-wilson', msg: 'feat: add email notifications', sev: 'high', st: 'open', v: false, ast: true, fork: false, h: 12, mttr: null, ln: 4 },
    { ri: 7, secret: 'Database Password', matched: 'DB_PASSWORD=S3cur3P@ss', file: '.env.production', repo: 'acme-corp/mobile-app', commit: 'y0z1a2b3', author: 'james-wilson', msg: 'feat: add backend config', sev: 'high', st: 'remediated', v: true, ast: true, fork: false, h: 8, mttr: 8, ln: 5 },
    { ri: 3, secret: 'GitHub OAuth Token', matched: 'gho_xxxxxxxxxxxxxxxxxxxx', file: 'src/auth/config.ts', repo: 'acme-corp/core-api', commit: 'c3d4e5f6', author: 'sarah-chen', msg: 'feat: OAuth integration', sev: 'critical', st: 'open', v: false, ast: true, fork: false, h: 1, mttr: null, ln: 10 },
    { ri: 5, secret: 'Stripe Publishable Key', matched: 'pk_live_51Hxxx...', file: 'public/config.js', repo: 'acme-corp/payment-service', commit: 'f6g7h8i9', author: 'james-wilson', msg: 'feat: stripe checkout', sev: 'high', st: 'accepted_risk', v: true, ast: false, fork: false, h: 24, mttr: null, ln: 3 },
    { ri: 9, secret: 'Slack Bot Token', matched: 'xoxb-123456789012-XXXX', file: '.env.staging', repo: 'acme-corp/core-api', commit: 'j9k0l1m2', author: 'sarah-chen', msg: 'feat: add slack bot', sev: 'high', st: 'remediated', v: true, ast: true, fork: false, h: 3, mttr: 3, ln: 11 },
    { ri: 6, secret: 'Generic API Key', matched: 'TWILIO_ACCOUNT_SID=ACxxx...', file: 'terraform/variables.tf', repo: 'acme-corp/infra-terraform', commit: 'n2o3p4q5', author: 'deploy-bot', msg: 'infra: add twilio config', sev: 'high', st: 'open', v: false, ast: true, fork: false, h: 18, mttr: null, ln: 8 },
    { ri: 7, secret: 'Redis Password', matched: 'REDIS_PASSWORD=r3d1s_s3cr3t', file: 'docker-compose.yml', repo: 'acme-corp/legacy-monolith', commit: 'r5s6t7u8', author: 'ci-bot', msg: 'ci: update compose config', sev: 'high', st: 'false_positive', v: false, ast: true, fork: false, h: 48, mttr: null, ln: 25 },
    { ri: 0, secret: 'AWS Access Key (Fork)', matched: 'AKIAIOSFODNN7EXAMPLE', file: '.env.production', repo: 'external-user/core-api-fork', commit: 'v8w9x0y1', author: 'external-contrib', msg: 'update env', sev: 'critical', st: 'open', v: false, ast: false, fork: true, upstream: 'acme-corp/core-api', h: 72, mttr: null, ln: 12 },
    { ri: 4, secret: 'Stripe Key (Fork)', matched: 'sk_live_51Hxxx...fullkey', file: '.env', repo: 'demo-user/payment-fork', commit: 'z1a2b3c4', author: 'demo-dev', msg: 'copy prod env', sev: 'critical', st: 'open', v: false, ast: false, fork: true, upstream: 'acme-corp/payment-service', h: 96, mttr: null, ln: 3 },
    { ri: 11, secret: 'JWT Token', matched: 'eyJhbGciOiJIUzI1NiIs...', file: 'tests/auth.test.ts', repo: 'acme-corp/core-api', commit: 'd4e5f6g7', author: 'james-wilson', msg: 'test: add auth tests', sev: 'medium', st: 'false_positive', v: false, ast: false, fork: false, h: 36, mttr: null, ln: 45 },
    { ri: 10, secret: 'SendGrid API Key', matched: 'SG.xxx...', file: 'src/services/notification.ts', repo: 'acme-corp/legacy-monolith', commit: 'h7i8j9k0', author: 'james-wilson', msg: 'feat: sendgrid notifications', sev: 'high', st: 'acknowledged', v: true, ast: true, fork: false, h: 20, mttr: null, ln: 7 },
    { ri: 7, secret: 'Example in Docs', matched: 'password=example_pass_123', file: 'docs/setup.md', repo: 'acme-corp/core-api', commit: 'l0m1n2o3', author: 'sarah-chen', msg: 'docs: update setup guide', sev: 'low', st: 'accepted_risk', v: false, ast: true, fork: false, h: 120, mttr: null, ln: 34 },
    { ri: 0, secret: 'AWS Key in Example', matched: 'AKIAIOSFODNN7EXAMPLE', file: 'config.example.json', repo: 'acme-corp/core-api', commit: 'p3q4r5s6', author: 'sarah-chen', msg: 'docs: add example config', sev: 'low', st: 'accepted_risk', v: false, ast: true, fork: false, h: 96, mttr: null, ln: 3 },
    { ri: 8, secret: 'Test Fixture Key', matched: '-----BEGIN PRIVATE KEY-----', file: 'tests/fixtures/test-key.pem', repo: 'acme-corp/core-api', commit: 't6u7v8w9', author: 'james-wilson', msg: 'test: add crypto tests', sev: 'medium', st: 'false_positive', v: false, ast: true, fork: false, h: 72, mttr: null, ln: 1 },
  ];

  for (const fd of findings) {
    const rule = rules[fd.ri];
    const si = fd.fork ? 6 : (fd.h < 1 ? 1 : 0);
    const scan = scans[si];
    const dh = hashStr(`${fd.file}${rule.pattern}${fd.commit}`);
    const discAt = hoursAgo(fd.h);
    const remAt = fd.mttr ? new Date(discAt.getTime() + fd.mttr * 3600000) : null;

    const f = await db.finding.create({
      data: {
        organizationId: org.id, scanId: scan.id, ruleId: rule.id, dedupHash: dh,
        secretType: fd.secret, matchedPattern: rule.pattern, matchedValue: fd.matched,
        fileUrl: `https://github.com/${fd.repo}/blob/${fd.commit}/${fd.file}`,
        filePath: fd.file, repoName: fd.repo, repoUrl: `https://github.com/${fd.repo}`,
        commitHash: fd.commit, commitUrl: `https://github.com/${fd.repo}/commit/${fd.commit}`,
        commitMessage: fd.msg, commitAuthor: fd.author, commitDate: discAt,
        lineNumber: fd.ln, severity: fd.sev, isVerified: fd.v,
        verificationNote: fd.v ? `Verified live via ${rule.category} API.` : '',
        verifiedAt: fd.v ? new Date(discAt.getTime() + 600000) : null,
        isAstFiltered: fd.ast, isStillPresent: fd.st === 'open' || fd.st === 'acknowledged',
        isForkMatch: fd.fork, upstreamRepo: fd.upstream || null,
        status: fd.st, assignedTo: (fd.st !== 'false_positive' && fd.st !== 'accepted_risk') ? 'security@acme.com' : null,
        remediatedAt: remAt, mttrHours: fd.mttr,
        remediationNote: fd.st === 'remediated' ? 'Secret rotated and removed from repository.' : (fd.st === 'false_positive' ? 'Test fixture / documentation example.' : ''),
        discoveredAt: discAt,
      }
    });

    await db.findingEvent.create({ data: { findingId: f.id, eventType: 'discovered', actor: 'system', note: `Found by ${rule.name}` } });
    if (fd.v) await db.findingEvent.create({ data: { findingId: f.id, eventType: 'verified', actor: 'system', note: 'Credential verified active.' } });
    if (fd.st === 'acknowledged') await db.findingEvent.create({ data: { findingId: f.id, eventType: 'acknowledged', actor: 'security@acme.com', note: 'Triaged. Remediation in progress.' } });
    if (fd.st === 'remediated') await db.findingEvent.create({ data: { findingId: f.id, eventType: 'remediated', actor: fd.author, note: 'Secret rotated and commit force-pushed.' } });
    if (fd.st === 'false_positive') await db.findingEvent.create({ data: { findingId: f.id, eventType: 'false_positive', actor: 'security@acme.com', note: 'Confirmed as test/doc example.' } });
  }

  console.log('Seed complete! 1 org, 3 users, 5 scope entries, 2 providers, 8 dorks, 12 rules, 8 scans, 20 findings, 3 integrations');
}

seed().catch(console.error).finally(() => db.$disconnect());