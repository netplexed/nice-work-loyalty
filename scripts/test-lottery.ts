import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(__dirname, '../.env.local') });

import { createAdminClient } from '../lib/supabase/admin';

async function main() {
    const supabase = createAdminClient();
    const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', 'd700b4af-1405-49b2-a393-8dc63f74362e')
        .single();

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log(JSON.stringify(profile, null, 2));
}

main().catch(console.error);
