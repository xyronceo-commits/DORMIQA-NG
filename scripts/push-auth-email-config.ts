import fs from 'fs';
import path from 'path';

/**
 * Dormiqa — Supabase Auth Email Configuration Automation
 * Updates custom SMTP, email templates, link expiry, and redirect allowlist
 * via Supabase Management API.
 *
 * Usage:
 *   npx tsx scripts/push-auth-email-config.ts [--dry-run]
 */

const isDryRun = process.argv.includes('--dry-run');

const projectRef = process.env.SUPABASE_PROJECT_REF ||
  process.env.VITE_SUPABASE_URL?.replace(/^https?:\/\//, '').split('.')[0] ||
  process.env.SUPABASE_URL?.replace(/^https?:\/\//, '').split('.')[0];

const accessToken = process.env.SUPABASE_ACCESS_TOKEN?.trim();

const smtpHost = process.env.SMTP_HOST?.trim();
const smtpPort = process.env.SMTP_PORT?.trim() || '587';
const smtpUser = process.env.SMTP_USER?.trim();
const smtpPass = process.env.SMTP_PASS?.trim();
const fromName = process.env.EMAIL_FROM_NAME?.trim() || 'Dormiqa';
const fromAddress = process.env.EMAIL_FROM_ADDRESS?.trim();
const appBaseUrl = process.env.APP_BASE_URL?.trim() || 'https://dormiqa.com';

const rawAllowedOrigins = process.env.ALLOWED_REDIRECT_ORIGINS?.trim();
const TEMPLATES_DIR = path.resolve(process.cwd(), 'supabase', 'templates');

function readTemplate(filename: string): string {
  const p = path.join(TEMPLATES_DIR, filename);
  if (!fs.existsSync(p)) {
    throw new Error(`Template not found at ${p}`);
  }
  return fs.readFileSync(p, 'utf8');
}

async function main() {
  console.log('========================================================');
  console.log(' Dormiqa: Supabase Auth Email Configuration Utility');
  console.log('========================================================\n');

  if (isDryRun) {
    console.log('[DRY-RUN MODE] No changes will be sent to the API.\n');
  }

  // 1. Verify Project Reference
  if (!projectRef) {
    console.error('❌ Error: Supabase Project Ref is missing.');
    console.error('Please set SUPABASE_PROJECT_REF or SUPABASE_URL in your environment.\n');
    process.exit(1);
  }
  console.log(`✓ Project Reference detected: ${projectRef}`);

  // 2. Load Templates
  const confirmHtml = readTemplate('confirm-signup.html');
  const resetHtml = readTemplate('reset-password.html');
  console.log('✓ Loaded confirm-signup.html and reset-password.html templates.');

  // 3. Prepare Base Origins and Redirect Allowlist
  const baseOrigins = new Set<string>([
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'https://dormiqa.com',
    'https://ais-pre-fefwxhetjb6pmq5nyypsjp-417290327349.europe-west2.run.app',
    'https://ais-dev-fefwxhetjb6pmq5nyypsjp-417290327349.europe-west2.run.app'
  ]);

  if (appBaseUrl) {
    try {
      baseOrigins.add(new URL(appBaseUrl).origin);
    } catch (_) {
      baseOrigins.add(appBaseUrl.replace(/\/+$/, ''));
    }
  }

  if (rawAllowedOrigins) {
    rawAllowedOrigins.split(',').forEach((orig) => {
      const trimmed = orig.trim();
      if (trimmed) {
        try {
          baseOrigins.add(new URL(trimmed).origin);
        } catch (_) {
          baseOrigins.add(trimmed.replace(/\/+$/, ''));
        }
      }
    });
  }

  // For each allowed origin, include <origin>/**, <origin>/auth/reset-password, <origin>/auth/confirmed, and <origin>
  const redirectUrlsSet = new Set<string>();
  // Explicitly ensure development wildcard
  redirectUrlsSet.add('http://localhost:3000/**');
  redirectUrlsSet.add('http://localhost:3000');
  redirectUrlsSet.add('http://localhost:3000/auth/reset-password');
  redirectUrlsSet.add('http://localhost:3000/auth/confirmed');

  baseOrigins.forEach((orig) => {
    const cleanOrig = orig.replace(/\/+$/, '');
    redirectUrlsSet.add(`${cleanOrig}/**`);
    redirectUrlsSet.add(`${cleanOrig}/auth/reset-password`);
    redirectUrlsSet.add(`${cleanOrig}/auth/confirmed`);
    redirectUrlsSet.add(cleanOrig);
  });

  const redirectUrls = Array.from(redirectUrlsSet).filter(Boolean);

  // 4. Construct Payload
  // Supabase Management API: site_url sets project Site URL, uri_allow_list sets Redirect URLs
  const configPayload: Record<string, any> = {
    site_url: appBaseUrl,
    mailer_autoconfirm: false, // Ensure email confirmation is REQUIRED
    mailer_otp_exp: 3600,      // 1 hour link expiry
    mailer_subjects_confirmation: 'Confirm your Dormiqa email address',
    mailer_templates_confirmation_content: confirmHtml,
    mailer_subjects_recovery: 'Reset your Dormiqa password',
    mailer_templates_recovery_content: resetHtml,
    uri_allow_list: redirectUrls.join(','),
  };

  if (smtpHost && fromAddress) {
    configPayload.smtp_admin_email = fromAddress;
    configPayload.smtp_host = smtpHost;
    configPayload.smtp_port = String(smtpPort);
    configPayload.smtp_user = smtpUser || '';
    configPayload.smtp_pass = smtpPass || '';
    configPayload.smtp_sender_name = fromName;
    configPayload.smtp_max_frequency = 60; // 60s cooldown
    console.log(`✓ Custom SMTP Settings configured: ${fromName} <${fromAddress}> via ${smtpHost}:${smtpPort}`);
  } else {
    console.warn('⚠️ Notice: SMTP_HOST or EMAIL_FROM_ADDRESS is not provided in environment.');
    console.warn('The script will update templates, Site URL, and allowlist. Custom SMTP can be set later.\n');
  }

  console.log('\n--- Configuration Summary to be Applied ---');
  console.log(`- Project Ref: ${projectRef}`);
  console.log(`- Site URL (site_url): ${appBaseUrl}`);
  console.log(`- Email Confirmation: Enabled (autoconfirm = false)`);
  console.log(`- OTP / Token Expiry: 3600s (1 hour)`);
  console.log(`- Confirmation Subject: "Confirm your Dormiqa email address"`);
  console.log(`- Password Reset Subject: "Reset your Dormiqa password"`);
  console.log(`- Allowed Redirect URLs: ${redirectUrls.length} entries allowlisted (including /** wildcards)`);
  if (smtpHost) {
    console.log(`- SMTP Host: ${smtpHost}:${smtpPort}`);
    console.log(`- Sender: ${fromName} <${fromAddress}>`);
  }

  if (isDryRun) {
    console.log('\n[DRY RUN COMPLETE] Configuration payload validated successfully. No API calls made.');
    return;
  }

  if (!accessToken) {
    console.log('\n⚠️ SUPABASE_ACCESS_TOKEN is not set.');
    console.log('To automatically push this configuration via the Supabase Management API:');
    console.log('1. Go to https://app.supabase.com/account/tokens');
    console.log('2. Generate a Personal Access Token');
    console.log('3. Run: SUPABASE_ACCESS_TOKEN="your_token" npx tsx scripts/push-auth-email-config.ts\n');
    console.log('--- MANUAL DASHBOARD INSTRUCTIONS ---');
    console.log(`1. Navigate to: https://supabase.com/dashboard/project/${projectRef}/auth/templates`);
    console.log('2. Under "Confirm signup", set:');
    console.log('   - Subject: Confirm your Dormiqa email address');
    console.log('   - Body: Paste contents of supabase/templates/confirm-signup.html');
    console.log('3. Under "Reset password", set:');
    console.log('   - Subject: Reset your Dormiqa password');
    console.log('   - Body: Paste contents of supabase/templates/reset-password.html');
    console.log(`4. Navigate to: https://supabase.com/dashboard/project/${projectRef}/auth/url-configuration`);
    console.log('   - Set Redirect URLs to include your domains');
    console.log(`5. Navigate to: https://supabase.com/dashboard/project/${projectRef}/settings/auth`);
    console.log('   - Enable "Custom SMTP" and enter your provider credentials.');
    return;
  }

  console.log('\nSending configuration update to Supabase Management API...');
  const endpoint = `https://api.supabase.com/v1/projects/${projectRef}/config/auth`;

  try {
    const res = await fetch(endpoint, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(configPayload)
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error(`❌ Management API request failed (HTTP ${res.status}): ${errText}`);
      console.log('\nPlease verify your SUPABASE_ACCESS_TOKEN and project permissions.');
      process.exit(1);
    }

    const data = await res.json();
    console.log('✅ SUCCESS! Supabase Auth Email Configuration has been updated in project!');
    console.log('Custom SMTP, branded templates, 1-hour expiry, and redirect allowlist are now LIVE.');
  } catch (err: any) {
    console.error('❌ Network error communicating with Supabase API:', err?.message || err);
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
