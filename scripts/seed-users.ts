import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

// Load env from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing env vars. Ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local')
    process.exit(1)
}

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
)

const TARGET_USERS = 1000
const PASSWORD = 'kampai!!'
// Batch size to avoid rate limits/timeouts
const BATCH_SIZE = 50

async function seed() {
    console.log(`Starting seed of ${TARGET_USERS} users...`)

    for (let i = 0; i < TARGET_USERS; i += BATCH_SIZE) {
        const batchPromises = []
        const batchEnd = Math.min(i + BATCH_SIZE, TARGET_USERS)

        console.log(`Processing batch ${i} to ${batchEnd}...`)

        for (let j = i; j < batchEnd; j++) {
            batchPromises.push(createUser(j))
        }

        await Promise.all(batchPromises)
        // Small delay to be nice to API
        await new Promise(r => setTimeout(r, 100))
    }

    console.log('Seeding complete!')
}

async function createUser(index: number) {
    const email = `testuser_${Date.now()}_${index}@example.com`
    const fakeName = `Test User ${index}`

    // 1. Create Auth User
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email,
        password: PASSWORD,
        email_confirm: true,
        user_metadata: { full_name: fakeName }
    })

    if (authError) {
        console.error(`Failed to create auth user ${index}:`, authError.message)
        return
    }

    const userId = authData.user.id

    // 2. Ensure Profile Exists (if trigger didn't catch it or just to update fields)
    // We want to set some random stats
    const visits = Math.floor(Math.random() * 50)
    const spent = Math.floor(Math.random() * 5000)

    // Calculate tier
    let tier = 'bronze'
    if (visits >= 150 || spent >= 12000) tier = 'platinum'
    else if (visits >= 80 || spent >= 5000) tier = 'gold'
    else if (visits >= 30 || spent >= 1500) tier = 'silver'

    // Upsert profile
    const { error: profileError } = await supabase.from('profiles').upsert({
        id: userId,
        email: email,
        full_name: fakeName,
        phone: `+1555${String(index).padStart(6, '0')}`, // Fake phone
        marketing_consent: true, // Default per request
        total_visits: visits,
        total_spent: spent,
        tier: tier,
        points_balance: Math.floor(spent * 5) // Rough estimate
    })

    if (profileError) {
        console.error(`Failed to create profile for ${userId}:`, profileError.message)
    }

    // 3. Create Transactions (Random)
    // Add a few purchases
    const purchaseCount = Math.floor(Math.random() * 5)
    for (let k = 0; k < purchaseCount; k++) {
        await createRandomPurchase(userId)
    }
}

async function createRandomPurchase(userId: string) {
    const amount = Math.floor(Math.random() * 100) + 10
    const points = amount * 5
    const locations = ['tanuki_raw', 'standing_sushi_bar']
    const location = locations[Math.floor(Math.random() * locations.length)]

    const { error } = await supabase.from('purchases').insert({
        user_id: userId,
        location,
        amount,
        points_earned: points,
        created_at: new Date(Date.now() - Math.floor(Math.random() * 10000000000)).toISOString() // Random past date
    })

    if (error) console.error('Purchase error', error)
}

seed().catch(console.error)
