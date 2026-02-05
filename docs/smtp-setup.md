# Setting up Reliable Emails (Supabase + Resend)

Supabase's built-in email service is rate-limited and often blocked by spam filters. To ensure your users receive "Confirm Account" and "Reset Password" emails, you need to use a custom SMTP provider. We recommend **Resend** as it is modern, developer-friendly, and has a generous free tier.

## Step 1: Set up Resend
1.  Go to [Resend.com](https://resend.com/) and create an account.
2.  **Verify your Domain:**
    *   Add your domain (e.g., `nicework.com`) to Resend.
    *   Update your DNS records (DKIM, SPF) as instructed by Resend.
    *   *Wait for verification (usually minutes).*
3.  **Create an API Key:**
    *   Go to **API Keys**.
    *   Create a new key with "Sending access".
    *   **Copy this key** (starts with `re_...`).

## Step 2: Configure Supabase
1.  Log in to your **Supabase Dashboard**.
2.  Select your project.
3.  Go to **Project Settings** (gear icon) -> **Authentication** -> **SMTP Settings**.
4.  Switch **Enable Custom SMTP** to **ON**.
5.  Fill in the details:
    *   **Sender Email:** `noreply@yourdomain.com` (Must match the verified domain in Resend).
    *   **Sender Name:** `Nice Work Loyalty`
    *   **Host:** `smtp.resend.com`
    *   **Port:** `465` (Recommended) or `587`.
    *   **User:** `resend` (This is the literal username, do not change).
    *   **Password:** `[Paste your Resend API Key here]` (`re_...`).
    *   **Minimum Interval:** 60 (Default is fine).
6.  Click **Save**.

## Step 3: Test
1.  Go to your App's Login Page.
2.  Try "Create Account" with a real email.
3.  Check your inbox! It should arrive instantly.

## Troubleshooting
-   **"Rate Limit Exceeded":** If you see this in Supabase logs *before* switching, the switch to SMTP will fix it.
-   **Spam:** Ensure your **Sender Email** matches the domain you verified in Resend. Spoofing other domains will send emails to spam.
