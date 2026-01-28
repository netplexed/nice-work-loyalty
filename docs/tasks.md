# Features

## Messaging & Email Campaigns
- [x] Admin Broadcasts (In-App Notifications)
- [x] Email Campaigns (Rich HTML Emails)
- [x] Advanced Segmentation
- [x] Marketing Automations (Legacy)
    - [x] Schema: `automations`, `automation_logs`
    - [x] UI: Automation Manager (`/admin/automations`)
    - [x] Logic: Welcome Trigger (New users)
    - [x] Logic: Birthday Trigger (Birthday month)
    - [x] Logic: Win-back Trigger (Inactivity)
    - [x] API: `/api/cron/automations`
    - [x] UI: Add link to Automations in Admin Sidebar

## Global Marketing 2.0 (Custom Automations)
- [x] **Phase 1: Email Templates**
    - [x] Schema: `email_templates` table
    - [x] Backend: CRUD Actions
    - [x] UI: Template List Page
    - [x] UI: Template Editor (Reuse Email Editor)
- [x] **Phase 2: Workflow Schema & Engine**
    - [x] Schema: `marketing_workflows` and `workflow_enrollments`
    - [x] Core: `trackEvent` server action helper
    - [x] Core: `processWorkflow` engine logic
- [x] **Phase 3: Workflow Builder UI**
    - [x] UI: Workflow List
    - [x] UI: Visual/Linear Builder (Triggers -> Steps)
    - [x] Integration: Connect Events to Builder (UI)

## Phase 4: Event Instrumentation (Wiring)
- [x] Instrument `user.signup`
- [x] Instrument `order.completed`

## Phase 5: Optimization
- [x] Configure `next/image` domains
- [x] Refactor `NewsCarousel` to use `<Image />`
- [ ] Refactor `ImageUpload` preview to use `<Image />`

## Phase 6: Performance & Caching
- [x] Implement `SWR` or `React Query` for Client-Side Caching
    - [x] Cache `useNiceTank` (Nice Tank State)
    - [x] Cache `useUserProfile` (Profile Data)
    - [x] Cache `useMyRewards` (Vouchers)
- [x] Optimize `Home` page data fetching (Parallelize)


