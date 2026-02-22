import { config } from 'dotenv';
config({ path: '.env.local' });
import { createAdminClient } from '../lib/supabase/admin';

async function run() {
    const supabase = createAdminClient();
    const { data: users } = await supabase.from('profiles').select('*');
    console.log('Total profiles:', users?.length);
}
run();
