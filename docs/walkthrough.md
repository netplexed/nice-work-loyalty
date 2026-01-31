# Walkthrough - Wheel Only Rewards

I have implemented the ability to create rewards specifically for the Spin Wheel (or other internal uses) that are hidden from the public Rewards Shop.

## Changes

### 1. Admin Reward Management
I updated the "Reward Form" in the Admin Panel to include a new **"Hide from Catalog"** option.

- **File**: `components/admin/rewards/reward-form-dialog.tsx`
- **Change**: Added a checkbox `Hide from Catalog`. When checked, `is_hidden` is set to `true`.

I also updated the Admin Rewards List to clearly label these rewards.

- **File**: `app/(admin)/admin/rewards/page.tsx`
- **Change**: Added a `Hidden` badge next to the status for hidden rewards.

### 2. Backend Actions
I updated the server actions to handle the `is_hidden` flag.

- **File**: `app/actions/admin-actions.ts`
- **Change**: Updated `createReward` and `updateReward` types to accept `is_hidden`.

### 3. Verification Results

| Feature | Behavior | Status |
| :--- | :--- | :--- |
| **Public Shop** | Rewards with `is_hidden = true` are **NOT** shown. | ✅ Verified |
| **Spin Wheel Config** | Hidden rewards **ARE** available to be selected as prizes. | ✅ Verified |
| **Admin Gifting** | Hidden rewards **ARE** available to be manually gifted. | ✅ Verified |
| **Data Integrity** | `is_hidden` flag is correctly saved and retrieved from DB. | ✅ Verified |

## How to Test

1.  Go to **Admin > Rewards**.
2.  Click **Add Reward** (or edit an existing one).
3.  Check the **"Hide from Catalog (Wheel Only)"** checkbox (near the top).
4.  Save the reward.
5.  Verify the **"Hidden"** badge appears in the list.
6.  Go to the **App Rewards Page** (as a user) -> The reward should **NOT** be there.
7.  Go to **Admin > Spin Wheel**.
8.  Add a new prize -> Select "Reward Item" type -> Verify the hidden reward **IS** in the dropdown list.
