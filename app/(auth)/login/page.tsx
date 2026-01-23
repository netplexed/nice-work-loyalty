import { EmailLogin } from '@/components/features/auth/email-login'

export default function LoginPage() {
    return (
        <div className="flex flex-col items-center justify-center space-y-8">
            <div className="text-center space-y-2">
                <h1 className="text-3xl font-bold tracking-tight text-[#1e40af]">Nice Work</h1>
                <p className="text-muted-foreground">Loyalty Program</p>
            </div>

            <EmailLogin />

            <p className="px-8 text-center text-sm text-muted-foreground">
                By clicking continue, you agree to our{' '}
                <a href="#" className="underline underline-offset-4 hover:text-primary">
                    Terms of Service
                </a>{' '}
                and{' '}
                <a href="#" className="underline underline-offset-4 hover:text-primary">
                    Privacy Policy
                </a>
                .
            </p>
        </div>
    )
}
