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
    *   **Sender Email:** `onboarding@resend.dev` (Use this exact email for testing if you haven't verified a domain yet).
    *   **Sender Name:** `Nice Work Loyalty`
    *   **Host:** `smtp.resend.com`
    *   **Port:** `465` (Recommended) or `587`.
    *   **User:** `resend` (Literal username).
    *   **Password:** `[Paste your Resend API Key]` (`re_...`).
6.  Click **Save**.

## Step 3: Test
**Important:** When using the test email `onboarding@resend.dev`, Resend **only allows sending to the email address you used to sign up for Resend**.
1.  Try creating an account using **your own email address** (the one linked to your Resend account).
2.  Check your inbox.

## Troubleshooting
-   **Email not sending?** If you are using the test sender (`onboarding@resend.dev`), ensure you are creating an account with **your admin email only**. It will block random emails.
-   **Spam:** Ensure your **Sender Email** matches the domain you verified in Resend. Spoofing other domains will send emails to spam.
