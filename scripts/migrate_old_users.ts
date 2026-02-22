import { config } from 'dotenv';
config({ path: '.env.local' });
import { createAdminClient } from '../lib/supabase/admin';

async function updateExistingUsers() {
    const supabase = createAdminClient();

    console.log('Fetching existing users...');
    const { data: profiles } = await supabase.from('profiles').select('id, points_balance');
    const { data: niceAccounts } = await supabase.from('nice_accounts').select('id, user_id, nice_collected_balance, tank_last_collected_at');

    if (!profiles || !niceAccounts) {
        console.log('Failed to fetch data');
        return;
    }

    console.log(`Found ${profiles.length} profiles and ${niceAccounts.length} nice accounts.`);

    // 1. Update points_balance to 50 if they are 0
    for (const profile of profiles) {
        if (profile.points_balance === 0) {
            console.log(`Updating points for user ${profile.id} from 0 to 50...`);
            await supabase.from('profiles').update({ points_balance: 50 }).eq('id', profile.id);
        }
    }

    // 2. Fix nice accounts
    // If they somehow have 24 nice in collected, move it to the tank by backdating 11.875 hours and zeroing the collected
    const targetDate = new Date();
    targetDate.setHours(targetDate.getHours() - 11);
    targetDate.setMinutes(targetDate.getMinutes() - 52);
    targetDate.setSeconds(targetDate.getSeconds() - 30);
    const targetIso = targetDate.toISOString();

    for (const account of niceAccounts) {
        if (account.nice_collected_balance >= 23) {
            console.log(`Fixing collected balance for user ${account.user_id} (moving ${account.nice_collected_balance} back to tank)...`);
            await supabase.from('nice_accounts')
                .update({
                    nice_collected_balance: 0,
                    tank_last_collected_at: targetIso
                })
                .eq('id', account.id);
        }
    }

    console.log('Done!');
}

updateExistingUsers();
