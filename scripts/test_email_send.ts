
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

async function testEmail() {
    // Dynamic import to ensure env is loaded before module evaluation
    const { sendEmail } = await import('@/lib/email/send-email')

    const email = 'howard@howardlo.com'
    console.log(`Sending test email to: ${email}`)

    const result = await sendEmail({
        to: email,
        subject: 'Test Email from Debugger',
        html: '<h1>It Works!</h1><p>This is a test to verify email configuration.</p>'
    })

    console.log('Result:', result)
}

testEmail()
