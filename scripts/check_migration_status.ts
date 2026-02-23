import { config } from 'dotenv';
config({ path: '.env.local' });
import { createAdminClient } from '../lib/supabase/admin';

async function run() {
    const supabase = createAdminClient();

    // Check what function definition the trigger currently uses
    const { data, error } = await supabase.rpc('create_nice_account_on_signup' as any);
    console.log('RPC call result (expected to fail):', error?.message);

    // Instead, let's check the trigger by inserting a test and seeing what happens
    // We can check the column type of nice_collected_balance to see if migration was applied
    const { data: cols, error: colErr } = await supabase
        .from('nice_accounts')
        .select('nice_collected_balance')
        .limit(1);

    if (colErr) {
        console.error('Query error:', colErr);
    } else if (cols && cols.length > 0) {
        const val = cols[0].nice_collected_balance;
        console.log('nice_collected_balance value:', val, 'type:', typeof val);
        // If it's a number with decimals, migration was applied; if integer, it wasn't
    }

    // Check the newest nice_accounts to see if tank_last_collected_at is backdated
    const { data: newest } = await supabase
        .from('nice_accounts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(3);

    if (newest) {
        for (const acc of newest) {
            const created = new Date(acc.created_at);
            const lastCollected = new Date(acc.tank_last_collected_at);
            const diffMs = created.getTime() - lastCollected.getTime();
            const diffHours = diffMs / (1000 * 60 * 60);
            console.log(`\nAccount for ${acc.user_id}:`);
            console.log(`  created_at:             ${acc.created_at}`);
            console.log(`  tank_last_collected_at:  ${acc.tank_last_collected_at}`);
            console.log(`  nice_collected_balance:  ${acc.nice_collected_balance}`);
            console.log(`  diff (created - tank):   ${diffHours.toFixed(2)} hours`);
            console.log(`  -> Trigger backdated?    ${diffHours > 10 ? 'YES ✅' : 'NO ❌ (migration not applied!)'}`);
        }
    }
}
run();
