import { config } from 'dotenv';
config({ path: '.env.local' });
import { createAdminClient } from '../lib/supabase/admin';
import { v4 as uuidv4 } from 'uuid';

async function run() {
    const supabase = createAdminClient();
    const testId = uuidv4();

    console.log(`Inserting test profile: ${testId}`);

    const { error: insertError } = await supabase.from('profiles').insert({
        id: testId,
        email: `test_oauth_${Date.now()}@example.com`,
        full_name: 'Test OAuth',
        points_balance: 50,
        tier: 'bronze',
        total_visits: 0,
        total_spent: 0
    });

    if (insertError) {
        console.error('Failed to insert profile:', insertError);
        return;
    }

    // Check the nice account that was automatically created!
    const { data: niceAccount, error: fetchError } = await supabase
        .from('nice_accounts')
        .select('*')
        .eq('user_id', testId)
        .single();

    if (fetchError) {
        console.error('Failed to fetch nice account:', fetchError);
    } else {
        console.log('--- Created Nice Account ---');
        console.log(niceAccount);

        const lastCollected = new Date(niceAccount.tank_last_collected_at);
        const now = new Date();
        const diffHours = (now.getTime() - lastCollected.getTime()) / (1000 * 60 * 60);
        console.log(`Tank age: ${diffHours.toFixed(2)} hours`);
        console.log(`Calculated generator value: ${(diffHours * 2).toFixed(2)} nice`);
    }

    // Cleanup
    await supabase.from('nice_accounts').delete().eq('user_id', testId);
    await supabase.from('profiles').delete().eq('id', testId);
}
run();
