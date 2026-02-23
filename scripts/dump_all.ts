import { config } from 'dotenv';
config({ path: '.env.local' });
import { createAdminClient } from '../lib/supabase/admin';
async function run() {
    const { data } = await createAdminClient().from('nice_accounts').select('user_id, nice_collected_balance, tank_last_collected_at, total_nice_earned');
    console.log(data);
}
run();
