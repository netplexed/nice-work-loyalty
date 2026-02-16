# Loyalty Economics Spec

Last updated: 2026-02-16

## Purpose
This document defines the economic rules currently implemented in code for:
- `Points`
- `Nice`
- `Accelerators` (tier bonus and temporary multipliers)
- `Lottery entries and prizes`
- `Referrals`

It is intended to be the source of truth for product, ops, and engineering.

## Currency Model
- `Points`:
  - Customer-facing loyalty currency for reward redemption.
  - Earned from spend, spin, referral, conversion from Nice, and admin adjustments.
- `Nice`:
  - Engagement currency generated over time and spent on lottery entries or converted to Points.

## Points Economics
### Earn
- Spend accrual:
  - Formula: `points = floor(spend_usd * 5)`
  - Source: `app/actions/admin-actions.ts`
- Referral (referee):
  - `100` points on successful code redemption.
  - Source: `app/actions/referral-actions.ts`
- Referral (referrer):
  - `250` points when referee makes first qualifying spend.
  - Source: `app/actions/admin-actions.ts`
- Spin:
  - Awarded by `process_spin` using weighted prize config in `spin_prizes`.
  - Source: `supabase/migrations/20260210_fix_spin_logging.sql`
- Nice conversion:
  - Formula: `points = floor(nice_amount / 4)`
  - Source: `app/actions/nice-actions.ts`, `supabase/migrations/20260126_secure_nice_rpc.sql`

### Spend
- Reward redemptions deduct points equal to reward cost.
  - Formula: `points_delta = -reward.points_cost`
  - Source: `app/actions/rewards-actions.ts`

## Nice Economics
### Generation
- Base tank rate: `2.0 Nice/hour`
- Tank capacity: `48 Nice`
- Effective rate when multiplier active:
  - `effective_rate = base_rate * current_multiplier * tier_bonus`
- Effective rate when no multiplier active:
  - `effective_rate = base_rate * tier_bonus`
- Collection is server-side calculated and clamped.
  - Minimum collection: `1 Nice`
  - Source: `supabase/migrations/20260124_nice_system.sql`, `supabase/migrations/20260126_secure_nice_rpc.sql`

### Collection UX Rule
- UI collect button enables at `>= 50%` tank fill.
  - Source: `components/nice/nice-tank.tsx`

### Conversion
- Formula: `4 Nice -> 1 Point` (floored).
  - Minimum conversion: `4 Nice`
  - Source: `components/nice/conversion-dialog.tsx`, `supabase/migrations/20260126_secure_nice_rpc.sql`

## Accelerator Economics
### Tier Bonus (persistent)
- Tier to multiplier mapping:
  - Bronze: `1.0x`
  - Silver: `1.5x`
  - Gold: `2.0x`
  - Platinum: `2.5x`
- Applied inside Nice rate calculation via `tier_bonus`.
- Source: `supabase/migrations/20260124_nice_system.sql`

### Visit/Check-in Multiplier (temporary)
- Spend-recorded visit flow awards temporary multipliers based on recent 7-day purchases:
  - 1 visit: `1.5x`
  - 2 visits: `2.0x`
  - 3+ visits: `3.0x`
- Duration: `24 hours`
- Instant Nice bonus in this flow: `50 Nice`
- Source: `app/actions/admin-actions.ts`

## Lottery Economics
### Entry Sources
- Purchased entries:
  - Cost: `200 Nice` per entry
  - Limit: `10` purchased entries per drawing per user
  - Source: `supabase/migrations/20260201_lottery_functions.sql`
- Visit bonus entries:
  - `+1` entry per eligible visit
  - Limit: `3` visit bonus entries per drawing per user
  - Requires valid user-owned purchase visit in active drawing window
  - Source: `supabase/migrations/20260216_economics_consistency_fixes.sql`
- Weekly +2 visit bonus entries:
  - `+2` entries once per drawing
  - Requires at least one real purchase visit in active drawing window
  - Source: `supabase/migrations/20260216_economics_consistency_fixes.sql`
- Optional base auto-entries:
  - Controlled by `lottery_drawings.auto_entry_config`
  - Source: `app/api/lottery/current/route.ts`, `lib/lottery/service.ts`

### Prize Payouts
- `prize_type = points`: credits `earned_lottery` points.
- `prize_type = nice`: credits Nice balance and logs `nice_transactions`.
- `prize_type = reward`: issues voucher-style reward.
- Source: `lib/lottery/drawing-logic.ts`

## Referral Economics
- Referee reward:
  - `100 points` immediate (on code redemption).
- Referrer reward:
  - `250 points` deferred until referee has first qualifying spend.
- One redemption per referee.
- Source: `app/actions/referral-actions.ts`, `app/actions/admin-actions.ts`

## Balances and Ledger Behavior
- `points_transactions` updates `profiles.points_balance` through trigger.
  - Source: `supabase/migrations/20240122_initial_schema.sql`
- `nice_transactions` stores Nice movement events.
- All formulas above should be considered executable rules, not copy text.
