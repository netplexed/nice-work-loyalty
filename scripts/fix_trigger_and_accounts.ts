import { config } from 'dotenv';
config({ path: '.env.local' });
import { createAdminClient } from '../lib/supabase/admin';

async function run() {
    const supabase = createAdminClient();

    // 1. Fix the trigger function to correctly backdate tank_last_collected_at
    console.log('1. Replacing create_nice_account_on_signup trigger function...');
    const { error: triggerErr } = await supabase.rpc('exec_sql' as any, {
        query: `
      CREATE OR REPLACE FUNCTION public.create_nice_account_on_signup()
      RETURNS trigger
      LANGUAGE plpgsql
      AS $$
      BEGIN
        INSERT INTO public.nice_accounts (user_id, nice_collected_balance, tank_last_collected_at)
        VALUES (NEW.id, 0, now() - interval '11 hours 52 minutes 30 seconds');
        RETURN NEW;
      END;
      $$;
    `
    });

    if (triggerErr) {
        console.log('exec_sql RPC not available, will need manual SQL execution.');
        console.log('Error:', triggerErr.message);

        console.log('\n========================================');
        console.log('MANUAL SQL TO RUN IN SUPABASE SQL EDITOR:');
        console.log('========================================\n');
        console.log(`
-- Fix the signup trigger to backdate tank instead of setting collected balance
CREATE OR REPLACE FUNCTION public.create_nice_account_on_signup()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.nice_accounts (user_id, nice_collected_balance, tank_last_collected_at)
  VALUES (NEW.id, 0, now() - interval '11 hours 52 minutes 30 seconds');
  RETURN NEW;
END;
$$;

-- Fix all existing accounts that have 23.75 in collected balance (wrong)
-- Move the 23.75 from collected balance to the tank by backdating 
UPDATE public.nice_accounts
SET 
  nice_collected_balance = 0,
  tank_last_collected_at = now() - interval '11 hours 52 minutes 30 seconds'
WHERE nice_collected_balance = 23.75
  AND total_collections = 0;
    `.trim());
        console.log('\n========================================\n');
    } else {
        console.log('Trigger function updated successfully!');
    }

    // 2. Fix existing accounts that were created with the wrong trigger
    console.log('2. Checking for accounts with wrong initial balance...');
    const { data: badAccounts } = await supabase
        .from('nice_accounts')
        .select('*')
        .eq('nice_collected_balance', 23.75);

    if (badAccounts && badAccounts.length > 0) {
        console.log(`Found ${badAccounts.length} accounts with nice_collected_balance = 23.75. Fixing...`);

        const backdate = new Date(Date.now() - 11.875 * 60 * 60 * 1000);

        for (const acc of badAccounts) {
            const { error: updateErr } = await supabase
                .from('nice_accounts')
                .update({
                    nice_collected_balance: 0,
                    tank_last_collected_at: backdate.toISOString()
                })
                .eq('id', acc.id);

            if (updateErr) {
                console.error(`  Failed to fix account ${acc.user_id}:`, updateErr.message);
            } else {
                console.log(`  Fixed account for user ${acc.user_id}: balance 23.75 -> 0, tank backdated`);
            }
        }
    } else {
        console.log('No accounts with wrong initial balance found.');
    }

    // 3. Verify
    console.log('\n3. Verification - checking newest accounts...');
    const { data: newest } = await supabase
        .from('nice_accounts')
        .select('user_id, nice_collected_balance, tank_last_collected_at, created_at')
        .order('created_at', { ascending: false })
        .limit(3);

    if (newest) {
        for (const acc of newest) {
            const created = new Date(acc.created_at);
            const lastCollected = new Date(acc.tank_last_collected_at);
            const diffHours = (created.getTime() - lastCollected.getTime()) / (1000 * 60 * 60);
            const tankHours = (Date.now() - lastCollected.getTime()) / (1000 * 60 * 60);
            console.log(`  User ${acc.user_id}: balance=${acc.nice_collected_balance}, tank_age=${tankHours.toFixed(1)}h (~${(tankHours * 2).toFixed(1)} nice in generator)`);
        }
    }
}
run();
