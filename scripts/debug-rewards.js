
const { createClient } = require('@supabase/supabase-js');

// Load env vars - simplistic approach for script
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing env vars. Please run with environment variables loaded.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testFetch() {
    console.log('Attempting to fetch rewards...');
    const isoDate = new Date().toISOString();
    console.log(`Using date: ${isoDate}`);

    const { data, error } = await supabase
        .from('rewards')
        .select('*')
        .eq('active', true)
        .eq('is_hidden', false)
        .or(`expires_at.is.null,expires_at.gt.${isoDate}`)
        .order('points_cost', { ascending: true });

    if (error) {
        console.error('Error fetching rewards:', error);
    } else {
        console.log(`Successfully fetched ${data.length} rewards.`);
        console.log('Sample reward:', data[0]);
    }
}

testFetch();
