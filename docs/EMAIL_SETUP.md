# Dormiqa — Production Email Setup Guide (Custom SMTP & Supabase Auth)

This guide walks through configuring real, reliable email delivery for Dormiqa's three transactional authentication emails:
1. **Confirm Email Address** (Sent on student & agent sign-up)
2. **Reset Password** (Sent when a user requests a password reset)
3. **Password Changed Notice** (Sent immediately after a password update)

---

## ⚠️ Critical Rule: Never Send "From" Gmail
- **Sender Address (`EMAIL_FROM_ADDRESS`):** Must be a custom mailbox on a domain you own (e.g. `no-reply@dormiqa.com` or `auth@dormiqa.ng`).
- **Support Contact (`EMAIL_REPLY_TO`):** `dormiqa.ng@gmail.com`.
- Mail sent directly "from" a `@gmail.com` address through an external SMTP provider fails SPF/DMARC authentication and gets rejected or delivered straight to Spam.

---

## Step 1: Obtain a Domain and Choose an SMTP Provider
1. Acquire or use a domain you own (e.g., `dormiqa.com` or `dormiqa.ng`).
2. Create a sending address on that domain (e.g., `no-reply@dormiqa.com`).
3. Create an account with any reputable SMTP provider:
   - **Resend** (Recommended, very simple DNS setup)
   - **Brevo / Sendinblue** (Generous free tier)
   - **Postmark** (Highest inbox delivery rates)
   - **Zoho ZeptoMail**
   - **SendGrid**

---

## Step 2: Configure DNS Records (SPF, DKIM, DMARC)
In your domain registrar / DNS manager (Namecheap, Cloudflare, GoDaddy, Whogohost, etc.), add the DNS records supplied by your SMTP provider:
- **SPF:** TXT record specifying allowed mail servers.
- **DKIM:** CNAME or TXT records signing messages with your domain cryptographic keys.
- **DMARC:** TXT record at `_dmarc.yourdomain.com` (e.g., `v=DMARC1; p=quarantine; rua=mailto:dormiqa.ng@gmail.com`).

*Without proper SPF, DKIM, and DMARC records, inbox providers (Gmail, Microsoft 365, Yahoo) will deliver messages straight to Spam.*

---

## Step 3: Add Server Environment Variables
In your server environment (or your local `.env.local` file), configure:

```env
# Custom SMTP Provider Credentials
SMTP_HOST=smtp.resend.com
SMTP_PORT=587
SMTP_USER=resend
SMTP_PASS=re_your_api_key_or_password
EMAIL_FROM_NAME=Dormiqa
EMAIL_FROM_ADDRESS=no-reply@yourdomain.com
EMAIL_REPLY_TO=dormiqa.ng@gmail.com

# Production / App Base Domain
APP_BASE_URL=https://your-domain.com

# Supabase Auth Configuration
SUPABASE_PROJECT_REF=your-supabase-project-ref
SUPABASE_ACCESS_TOKEN=sbp_your_supabase_management_token
```

---

## Step 4: Push Email Templates & Configuration to Supabase
We provide an automated script that updates your Supabase Auth project configuration via the Supabase Management API:

1. Test without changing anything:
   ```bash
   npx tsx scripts/push-auth-email-config.ts --dry-run
   ```
2. Apply the configuration to Supabase:
   ```bash
   npx tsx scripts/push-auth-email-config.ts
   ```

The script configures:
- Custom SMTP credentials in Supabase Auth.
- Branded templates from `supabase/templates/confirm-signup.html` and `supabase/templates/reset-password.html`.
- 1-hour token / link expiry (`mailer_otp_exp = 3600`).
- Redirect URL allowlist (`/auth/confirmed`, `/auth/reset-password`).
- Enforced email confirmation (`mailer_autoconfirm = false`).

---

## Step 5: Verify in Supabase Dashboard
1. Visit [Supabase Dashboard](https://supabase.com/dashboard) -> Select your Project.
2. Go to **Authentication** -> **Email Templates**:
   - Check that **Confirm signup** displays the Dormiqa branded template.
   - Check that **Reset password** displays the Dormiqa branded template.
3. Go to **Authentication** -> **URL Configuration**:
   - Verify that your production and development domains are in the **Redirect URLs** list.
4. Go to **Project Settings** -> **Authentication** -> **SMTP Settings**:
   - Confirm that **Enable Custom SMTP** is turned ON and credentials match.

---

## Step 6: Test Real Inbox Delivery
Perform test transactions:
1. **Sign-up Confirmation:** Sign up with a test student account and confirm the branded verification email arrives in the primary inbox.
2. **Forgot Password:** Request a reset link for your test account. Confirm receipt and verify that clicking the link navigates to the Reset Password screen.
3. **Password Changed:** Complete the password change and check that the security notice arrives promptly.
4. Test delivery to:
   - Gmail (Desktop and Mobile app)
   - Yahoo Mail
   - Microsoft Outlook
   - A Nigerian-hosted institutional mailbox (e.g. `.edu.ng`)

---

## Step 7: Optional Branded PNG Logo
The email templates currently render a text wordmark `Dormiqa.`. When you have a hosted PNG logo on a public CDN or HTTPS server, uncomment the `<img>` line in:
- `supabase/templates/confirm-signup.html`
- `supabase/templates/reset-password.html`
- `supabase/templates/password-changed.html`
and rerun `npx tsx scripts/push-auth-email-config.ts`.
