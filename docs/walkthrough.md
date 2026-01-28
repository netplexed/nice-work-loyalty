# Marketing Automations Walkthrough

## Overview
The Marketing Automations feature allows you to send automated emails and rewards based on user lifecycle events.

### Managing Automations
1.  Go to **[Automations](/admin/automations)** (Access via the new 'Automations' link in the Admin Sidebar).
2.  Toggle automations **On/Off**.
3.  Click **Edit** to configure triggers, email content, and rewards.
4.  **[New]** Manage reusable email designs in **[Templates](/admin/marketing/templates)**.


### Triggers
- **Welcome**: Sent to new users shortly after registration. (Checks for new users created within the last 3 days).
- **Birthday**: Sent to users whose birthday is in the current month. Logged to ensure only one send per year.
- **Win-back**: Sent to users who haven't visited (checked in) for `X` days (default 30). Includes a 90-day cooldown period to prevent spam.

### Rewards
- You can attach any active Reward (e.g. "Free Coffee") to an automation.
- When triggered, a voucher for that reward is automatically generated for the user (Cost: 0 points).


### Execution (Cron)
The logic runs via an API route: `GET /api/cron/automations?key=YOUR_CRON_SECRET`.
- You can trigger this manually for testing.
- For production, set up a daily specific Cron job (e.g. Vercal Cron) to hit this endpoint.

---

## Marketing 2.0: Custom Workflows
Create flexible automation flows triggered by user events.

### 1. Email Templates
Manage reusable email designs in **[Templates](/admin/marketing/templates)**.
- Create a template once, reuse it in multiple workflows.
- Supports rich HTML editing.

### 2. Workflow Builder
Create flows in **[Workflows](/admin/marketing/workflows)**.
1.  **Trigger**: Select an event (e.g., `order.completed`).
2.  **Steps**: Build a sequence:
    - ⏳ **Delay**: Wait for X hours.
    - 📧 **Send Email**: Select a template.
    - 🎁 **Grant Reward**: Auto-grant a reward voucher.

### 3. Execution Engine
Workflows run via a separate Cron route designed for high-frequency checks (e.g., every 5-10 mins).

### 4. Active Triggers (Events)
The following events are now wired up and ready to use in your workflows:
- `user.signup`: Triggered when a new user registers (via `getUserProfile` lazy creation).
- `order.completed`: Triggered when an admin records a spend (`recordUserSpend`).
    - **Properties**: `value` (Amount spent), `location`.

