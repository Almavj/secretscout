// SecretScout Pro — Secret Verification
// Live validation of discovered credentials against their respective APIs.
// Only performs safe, read-only, single-attempt checks.

export interface VerificationResult {
  verified: boolean;
  provider: string;
  checkType: string;
  note: string;
  responseTimeMs: number;
}

const TIMEOUT_MS = 10000;

function timeoutFetch(url: string, options: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timer));
}

export async function verifySecret(
  ruleId: string,
  matchedValue: string
): Promise<VerificationResult> {
  const startTime = Date.now();

  try {
    switch (ruleId) {
      case 'rule-aws-access-key':
        return await verifyAWS(matchedValue, startTime);
      case 'stripe-secret-key':
        return await verifyStripe(matchedValue, startTime);
      case 'github-pat':
      case 'github-app-token':
      case 'github-oauth':
        return await verifyGitHub(matchedValue, startTime);
      case 'slack-token':
        return await verifySlack(matchedValue, startTime);
      case 'sendgrid-api-key':
        return await verifySendGrid(matchedValue, startTime);
      case 'google-api-key':
        return await verifyGoogleAPI(matchedValue, startTime);
      default:
        return { verified: false, provider: 'unknown', checkType: 'none', note: 'No live verification available for this credential type', responseTimeMs: Date.now() - startTime };
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { verified: false, provider: 'error', checkType: 'error', note: `Verification failed: ${message}`, responseTimeMs: Date.now() - startTime };
  }
}

async function verifyAWS(accessKeyId: string, startTime: number): Promise<VerificationResult> {
  const secretKeyPattern = /aws[_\-]?secret[_\-]?access[_\-]?key\s*[:=]\s*['"]?([A-Za-z0-9/+=]{40})['"]?/i;
  const note = 'AWS key detected. Requires secret key for live verification (not available from code search). Tagged for manual verification.';
  return { verified: false, provider: 'aws', checkType: 'sts:GetCallerIdentity', note, responseTimeMs: Date.now() - startTime };
}

async function verifyStripe(secretKey: string, startTime: number): Promise<VerificationResult> {
  try {
    const res = await timeoutFetch('https://api.stripe.com/v1/balance', {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${secretKey}` },
    });

    if (res.status === 200) {
      return { verified: true, provider: 'stripe', checkType: 'GET /v1/balance', note: 'Stripe key is LIVE and has access to balance endpoint', responseTimeMs: Date.now() - startTime };
    }
    if (res.status === 401) {
      return { verified: false, provider: 'stripe', checkType: 'GET /v1/balance', note: 'Stripe key is invalid or revoked', responseTimeMs: Date.now() - startTime };
    }
    return { verified: false, provider: 'stripe', checkType: 'GET /v1/balance', note: `Stripe API returned ${res.status}`, responseTimeMs: Date.now() - startTime };
  } catch {
    return { verified: false, provider: 'stripe', checkType: 'GET /v1/balance', note: 'Could not reach Stripe API', responseTimeMs: Date.now() - startTime };
  }
}

async function verifyGitHub(token: string, startTime: number): Promise<VerificationResult> {
  try {
    const res = await timeoutFetch('https://api.github.com/user', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'SecretScout-Pro/1.0',
      },
    });

    if (res.status === 200) {
      const data = await res.json();
      return { verified: true, provider: 'github', checkType: 'GET /user', note: `GitHub token is LIVE — belongs to: ${data.login} (${data.type})`, responseTimeMs: Date.now() - startTime };
    }
    if (res.status === 401) {
      return { verified: false, provider: 'github', checkType: 'GET /user', note: 'GitHub token is invalid or revoked', responseTimeMs: Date.now() - startTime };
    }
    return { verified: false, provider: 'github', checkType: 'GET /user', note: `GitHub API returned ${res.status}`, responseTimeMs: Date.now() - startTime };
  } catch {
    return { verified: false, provider: 'github', checkType: 'GET /user', note: 'Could not reach GitHub API', responseTimeMs: Date.now() - startTime };
  }
}

async function verifySlack(token: string, startTime: number): Promise<VerificationResult> {
  try {
    const res = await timeoutFetch('https://slack.com/api/auth.test', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    const data = await res.json();
    if (data.ok) {
      return { verified: true, provider: 'slack', checkType: 'auth.test', note: `Slack token is LIVE — workspace: ${data.team}, user: ${data.user}`, responseTimeMs: Date.now() - startTime };
    }
    return { verified: false, provider: 'slack', checkType: 'auth.test', note: `Slack token invalid: ${data.error}`, responseTimeMs: Date.now() - startTime };
  } catch {
    return { verified: false, provider: 'slack', checkType: 'auth.test', note: 'Could not reach Slack API', responseTimeMs: Date.now() - startTime };
  }
}

async function verifySendGrid(apiKey: string, startTime: number): Promise<VerificationResult> {
  try {
    const res = await timeoutFetch('https://api.sendgrid.com/v3/user/profile', {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${apiKey}` },
    });

    if (res.status === 200) {
      const data = await res.json();
      return { verified: true, provider: 'sendgrid', checkType: 'GET /v3/user/profile', note: `SendGrid key is LIVE — account: ${data.email || 'verified'}`, responseTimeMs: Date.now() - startTime };
    }
    if (res.status === 401) {
      return { verified: false, provider: 'sendgrid', checkType: 'GET /v3/user/profile', note: 'SendGrid key is invalid or revoked', responseTimeMs: Date.now() - startTime };
    }
    return { verified: false, provider: 'sendgrid', checkType: 'GET /v3/user/profile', note: `SendGrid API returned ${res.status}`, responseTimeMs: Date.now() - startTime };
  } catch {
    return { verified: false, provider: 'sendgrid', checkType: 'GET /v3/user/profile', note: 'Could not reach SendGrid API', responseTimeMs: Date.now() - startTime };
  }
}

async function verifyGoogleAPI(apiKey: string, startTime: number): Promise<VerificationResult> {
  try {
    const res = await timeoutFetch(`https://www.googleapis.com/discovery/v1/apis?key=${apiKey}`, {});
    if (res.status === 200) {
      return { verified: true, provider: 'google', checkType: 'discovery API', note: 'Google API key is LIVE and has access to Discovery API', responseTimeMs: Date.now() - startTime };
    }
    if (res.status === 403) {
      return { verified: false, provider: 'google', checkType: 'discovery API', note: 'Google API key is invalid or restricted', responseTimeMs: Date.now() - startTime };
    }
    return { verified: false, provider: 'google', checkType: 'discovery API', note: `Google API returned ${res.status}`, responseTimeMs: Date.now() - startTime };
  } catch {
    return { verified: false, provider: 'google', checkType: 'discovery API', note: 'Could not reach Google API', responseTimeMs: Date.now() - startTime };
  }
}
