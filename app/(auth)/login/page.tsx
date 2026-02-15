'use client'

import { EmailLogin } from '@/components/features/auth/email-login'
import { useSessionLoading } from '@/components/providers/session-provider'
import { Loader2 } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import { useEffect, Suspense } from 'react'
import { toast } from 'sonner'

export default function LoginPage() {
    return (
        <Suspense>
            <LoginPageContent />
        </Suspense>
    )
}

function LoginPageContent() {
    const { isLoadingSession } = useSessionLoading()
    const searchParams = useSearchParams()

    useEffect(() => {
        if (searchParams.get('deleted') === 'true') {
            // Use a small timeout to ensure toast library is ready/mounted if needed, 
            // though usually unnecessary. using setTimeout(..., 0) helps with hydration sometimes.
            setTimeout(() => {
                toast.message('We are sad to see you go! Rejoin anytime.', {
                    description: 'Your account has been successfully deleted.',
                    duration: 5000,
                })
            }, 0)
        }
    }, [searchParams])

    if (isLoadingSession && searchParams.get('deleted') !== 'true') {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="mt-4 text-muted-foreground animate-pulse">Restoring session...</p>
            </div>
        )
    }

    return (
        <div className="flex flex-col items-center justify-center space-y-8">
            <div className="text-center space-y-6">
                <h1 className="text-5xl font-bold tracking-tighter text-foreground font-brand">nice work</h1>
                <div className="flex items-center justify-center gap-8">
                    <img
                        src="/images/logos/tanuki-raw-logo.png"
                        alt="Tanuki Raw"
                        className="h-10 w-auto object-contain opacity-90 transition-opacity hover:opacity-100"
                    />
                    <div className="h-8 w-[1px] bg-border" />
                    <img
                        src="/images/logos/standing-sushi-bar-logo.png"
                        alt="Standing Sushi Bar"
                        className="h-10 w-auto object-contain opacity-90 transition-opacity hover:opacity-100"
                    />
                </div>
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
