import { config } from 'dotenv';
config({ path: '.env.local' });
import { createAdminClient } from '../lib/supabase/admin';

async function run() {
    const supabase = createAdminClient();
    const { data, error } = await supabase.auth.admin.listUsers();

    if (error) {
        console.error(error);
        return;
    }

    const sorted = data.users.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 3);
    console.log('Top 3 newest auth.users:', JSON.stringify(sorted, null, 2));

    // Check their nice account
    for (const user of sorted) {
        const { data: niceAccount } = await supabase.from('nice_accounts').select('*').eq('user_id', user.id).single();
        console.log(`User ${user.email} nice_account:`, niceAccount);
    }
}
run();
