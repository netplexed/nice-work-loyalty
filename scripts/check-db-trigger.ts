import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
if (!supabaseUrl || !supabaseKey) {
    console.error("Missing env vars", { url: !!process.env.NEXT_PUBLIC_SUPABASE_URL, key: !!process.env.SUPABASE_SERVICE_ROLE_KEY });
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function test() {
    const { data, error } = await supabase.rpc('convert_nice_to_points', { p_user_id: '11111111-1111-1111-1111-111111111111', p_nice_amount: 4 })
    console.log("convert_nice_to_points test:", data, error)

    // also get triggers
    const { data: triggers, error: trigErr } = await supabase.rpc('get_triggers_dummy')
    console.log(triggers, trigErr)
}

test()
