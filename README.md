# nice work - Project Overview

## 1. Introduction
nice work is a comprehensive customer loyalty and engagement platform.

## 2. Tech Stack
- **Framework**: Next.js 14 (App Router)
- **Database & Auth**: Supabase (PostgreSQL)
- **Styling**: Tailwind CSS + Shadcn UI
- **Deployment**: Vercel (Recommended)

## 3. Key Features

### For Customers (User Portal)
- **Dashboard**: View current points, "Nice" balance, and Tier status (Bronze/Silver/Gold).
- **Points System**: automatic point earning based on spending.
- **Rewards Store**: Browse available rewards and redeem points for vouchers.
- **My Vouchers**: View active vouchers to show to staff.
- **Mining**: A gamified feature to "mine" NICE tokens daily.
- **Profile**: Manage personal details.

### For Staff & Admins (Admin Portal)
Access: `/admin` (Requires Admin Role)

#### Operations
- **POS / Record**: Manually record a customer's spend (calculates points automatically).
- **Redeem**: Scan or enter voucher codes to invalidate them.
- **User Management**: View user profiles, history, and manually adjust points.

#### Marketing & Engagement
- **Rewards Management**: Create and edit rewards, manage inventory.
- **Messaging**: Send In-App notifications or Push notifications.
- **Email Campaigns**: Send rich HTML emails to segments of users.
- **Marketing Automations (2.0)**:
    - **Workflows**: Create triggers (e.g., "After Checkout") to send emails or grant rewards automatically.
    - **Templates**: Design reusable email layouts.
    - **Triggers**: Supports `user.signup` and `order.completed` events.

## 4. Architecture Highlights
- **Role-Based Access**: Strict separation between User and Admin routes protected by Middleware and RLS (Row Level Security).
- **Event Bus**: Important actions (Signup, Order) trigger the internal `trackEvent` system to power automations.
- **Cron Jobs**: Background jobs handle scheduled tasks like Automation Delays (via `/api/cron/...`).

## 5. Important Directories
- `/app`: Main application routes.
    - `(admin)`: Admin-only pages.
    - `(auth)`: Login/Signup pages.
    - `(user)`: Customer-facing pages.
- `/components`: Reusable UI components.
- `/lib/supabase`: Database client and type definitions.
- `/supabase/migrations`: SQL scripts for database schema changes.

## 6. Links
- **Admin**: [admin/dashboard](http://localhost:3000/admin)
- **Automations**: [admin/marketing/workflows](http://localhost:3000/admin/marketing/workflows)
