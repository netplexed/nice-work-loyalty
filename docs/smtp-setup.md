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

## Step 2: Choose your Sender Identity

### Option A: Custom Domain (Recommended for Production)
1.  In Resend, go to **Domains** and add `nicework.sg`.
2.  Log in to your DNS provider (GoDaddy, Namecheap, Cloudflare, etc.).
3.  Add the **DNS Records** (MX, TXT/SPF, DKIM) provided by Resend.
4.  Wait for the status to turn to **Verified** (can take 5 mins to 24 hours).
5.  **Supabase Sender Email:** `hello@nicework.sg` (Must match your verified domain).

### Option B: Test Domain (Quick Start)
*Use this if you just want to test immediately without touching DNS.*
1.  **Supabase Sender Email:** `onboarding@resend.dev`
2.  **Limitation:** You can ONLY send emails to the address you used to sign up for Resend.

## Step 3: Configure Supabase
1.  Log in to your **Supabase Dashboard**.
2.  Select your project.
3.  Go to **Project Settings** (gear icon) -> **Authentication** -> **SMTP Settings**.
4.  Switch **Enable Custom SMTP** to **ON**.
5.  Fill in the details:
    *   **Sender Email:** `hello@nicework.sg` (OR `onboarding@resend.dev` if using Option B).
    *   **Sender Name:** `Nice Work Loyalty`
    *   **Host:** `smtp.resend.com`
    *   **Port:** `465` (Recommended) or `587`.
    *   **User:** `resend` (Literal username).
    *   **Password:** `[Paste your Resend API Key]` (`re_...`).
6.  Click **Save**.

## Step 4: Test
1.  Go to your App's Login Page.
2.  Try "Create Account".
    *   **If Option A:** Use any email.
    *   **If Option B:** Use ONLY your admin/Resend signup email.
3.  Check your inbox.

## Step 5: Customize Email Content
You can change the subject line and body text of your emails directly in Supabase.
1.  Go to **Authentication** > **Email Templates**.
2.  Select the template you want to edit (e.g., "Confirm Your Signup").
3.  **Edit the Body:** You can use HTML and variables.
    *   **Essential Variable:** You MUST include `{{ .ConfirmationURL }}` (or the specific variable for that template) so the user can click the link.
    *   **Example Body:**
        ```html
        <h2>Welcome to Nice Work Loyalty!</h2>
        <p>Thanks for joining. Please confirm your email by clicking below:</p>
        <p><a href="{{ .ConfirmationURL }}">Confirm Email</a></p>
        ```
4.  Click **Save**.

## Troubleshooting
-   **"Sender Identity missing":** Your "Sender Email" in Supabase does not match a verified domain in Resend.
-   **Email not sending (Option B)?** You are trying to email a user that is not your own admin email.
