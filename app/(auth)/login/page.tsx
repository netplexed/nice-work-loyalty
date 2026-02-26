'use client'

import { useState, useEffect, Suspense } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { useSessionLoading } from '@/components/providers/session-provider'
import { Loader2, ArrowLeft } from 'lucide-react'
import { useSearchParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import Link from 'next/link'


// Custom scheme registered in AndroidManifest.xml (Android) and Info.plist CFBundleURLTypes (iOS)
// that brings the user back into the app after Google OAuth completes.
const NATIVE_OAUTH_REDIRECT = 'com.niceworkloyalty.app://auth/callback'

type AuthState = 'landing' | 'create-account' | 'sign-in'

const signInSchema = z.object({
    email: z.string().email('Please enter a valid email address'),
    password: z.string().min(1, 'Password is required'),
})

const createAccountSchema = z.object({
    email: z.string().email('Please enter a valid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string().min(6, 'Confirm password must be at least 6 characters'),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
})

export default function LoginPage() {
    return (
        <Suspense fallback={
            <div className="flex flex-col items-center justify-center min-h-[50vh]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        }>
            <LoginPageContent />
        </Suspense>
    )
}

function LoginPageContent() {
    const { isLoadingSession } = useSessionLoading()
    const searchParams = useSearchParams()
    const router = useRouter()

    const [authState, setAuthState] = useState<AuthState>('landing')
    const [loading, setLoading] = useState(false)
    const [oauthLoading, setOauthLoading] = useState(false)
    const [isNative, setIsNative] = useState(false)
    const supabase = createClient()

    // Safely check for native environment after mount
    useEffect(() => {
        const checkNative = async () => {
            try {
                const { Capacitor } = await import('@capacitor/core')
                setIsNative(Capacitor.isNativePlatform())
            } catch {
                setIsNative(false)
            }
        }
        checkNative()
    }, [])

    // Handle deep-link callback on Android after Google OAuth
    // NOTE: We do NOT gate this on isNative because:
    // 1. isNative starts as false and would cause us to miss the event
    // 2. The try/catch on dynamic import already handles non-native environments
    useEffect(() => {
        let cleanup: (() => void) | undefined

        const setupDeepLinkListener = async () => {
            try {
                const { App } = await import('@capacitor/app')
                const { Browser } = await import('@capacitor/browser')

                const handle = await App.addListener('appUrlOpen', async (event: any) => {
                    const url = new URL(event.url)

                    // Supabase OAuth redirects back with either a ?code= or #access_token= depending on flow
                    // With PKCE (the default), it's a code in the query params or the hash.

                    // First check query params
                    let code = url.searchParams.get('code')

                    // If not in query params but there's a hash (sometimes `#code=xxx`), parse it
                    if (!code && url.hash) {
                        const hashParams = new URLSearchParams(url.hash.substring(1))
                        code = hashParams.get('code')
                    }

                    if (code) {
                        setOauthLoading(true)
                        try {
                            await Browser.close()

                            // Send to server-side /auth/callback route to exchange the code,
                            // create the user profile, and redirect to the home page.
                            // MUST use window.location.href because /auth/callback is an API route (route.ts).
                            window.location.href = `/auth/callback?code=${code}`

                        } catch (err) {
                            toast.error('Failed to complete sign in redirect')
                            setOauthLoading(false)
                        }
                    } else if (url.searchParams.get('error')) {
                        toast.error('Sign in error: ' + url.searchParams.get('error_description'))
                        try { await Browser.close() } catch { }
                    }
                })

                cleanup = () => handle.remove()
            } catch {
                // Not running in a Capacitor native environment — no-op
            }
        }

        setupDeepLinkListener()
        return () => cleanup?.()
    }, [])

    useEffect(() => {
        if (searchParams.get('deleted') === 'true') {
            setTimeout(() => {
                toast.message('We are sad to see you go! Rejoin anytime.', {
                    description: 'Your account has been successfully deleted.',
                    duration: 5000,
                })
            }, 0)
        }
        if (searchParams.get('step') === 'sign-in') {
            setAuthState('sign-in')
        }
    }, [searchParams])

    const signInForm = useForm<z.infer<typeof signInSchema>>({
        resolver: zodResolver(signInSchema),
        defaultValues: { email: '', password: '' },
    })

    const createAccountForm = useForm<z.infer<typeof createAccountSchema>>({
        resolver: zodResolver(createAccountSchema),
        defaultValues: { email: '', password: '', confirmPassword: '' },
    })

    async function onSignInSubmit(values: z.infer<typeof signInSchema>) {
        setLoading(true)
        try {
            const { error } = await supabase.auth.signInWithPassword({
                email: values.email,
                password: values.password,
            })

            if (error) {
                toast.error(error.message)
                return
            }

            toast.success('Successfully logged in!')
            router.push('/')
            router.refresh()
        } catch (error) {
            toast.error('Failed to sign in')
        } finally {
            setLoading(false)
        }
    }

    async function onCreateAccountSubmit(values: z.infer<typeof createAccountSchema>) {
        setLoading(true)
        try {
            // Optimistically try to sign in first in case they already have an account
            const { error: signInError, data: signInData } = await supabase.auth.signInWithPassword({
                email: values.email,
                password: values.password,
            })

            if (!signInError && signInData.session) {
                toast.success('Welcome back! Logged you in.')
                router.push('/')
                router.refresh()
                return
            }

            const { error, data } = await supabase.auth.signUp({
                email: values.email,
                password: values.password,
            })

            if (error) {
                toast.error(error.message)
                return
            }

            toast.success('Account created! Logging you in...')
            router.push('/onboarding')
            router.refresh()
        } catch (error) {
            toast.error('Failed to create account')
        } finally {
            setLoading(false)
        }
    }

    async function onGoogleSignIn() {
        setOauthLoading(true)
        try {
            if (isNative) {
                const { data, error } = await supabase.auth.signInWithOAuth({
                    provider: 'google',
                    options: {
                        redirectTo: NATIVE_OAUTH_REDIRECT,
                        skipBrowserRedirect: true,
                    },
                })

                if (error) {
                    toast.error(error.message)
                    setOauthLoading(false)
                    return
                }

                if (data?.url) {
                    try {
                        const { Browser } = await import('@capacitor/browser')
                        await Browser.open({
                            url: data.url,
                            presentationStyle: 'popover',
                        })
                    } catch {
                        window.open(data.url, '_blank')
                    }
                }
            } else {
                const { error } = await supabase.auth.signInWithOAuth({
                    provider: 'google',
                    options: {
                        redirectTo: 'https://makenice.nicework.sg/auth/callback',
                    },
                })

                if (error) {
                    toast.error(error.message)
                    setOauthLoading(false)
                }
            }
        } catch (error) {
            toast.error('Failed to sign in with Google')
            setOauthLoading(false)
        }
    }

    if (isLoadingSession && searchParams.get('deleted') !== 'true') {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="mt-4 text-muted-foreground animate-pulse">Restoring session...</p>
            </div>
        )
    }

    return (
        <div className="flex flex-col items-center justify-center max-w-sm mx-auto space-y-8 w-full">
            {authState === 'landing' && (
                <div className="text-center space-y-6 w-full">
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

                    <div className="pt-8 space-y-4">
                        <Button
                            className="w-full h-12 text-lg bg-primary text-primary-foreground hover:bg-primary/90"
                            onClick={() => setAuthState('create-account')}
                        >
                            Create Account
                        </Button>
                        <Button
                            variant="outline"
                            className="w-full h-12 text-lg"
                            onClick={() => setAuthState('sign-in')}
                        >
                            Sign In
                        </Button>

                        <div className="relative py-4">
                            <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t" />
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-background px-2 text-muted-foreground">
                                    Or continue with
                                </span>
                            </div>
                        </div>

                        <Button
                            variant="outline"
                            onClick={onGoogleSignIn}
                            className="w-full h-12"
                            disabled={oauthLoading}
                        >
                            {oauthLoading ? (
                                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            ) : (
                                <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
                                    <path
                                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                        fill="#4285F4"
                                    />
                                    <path
                                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                        fill="#34A853"
                                    />
                                    <path
                                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                        fill="#FBBC05"
                                    />
                                    <path
                                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                        fill="#EA4335"
                                    />
                                    <path d="M1 1h22v22H1z" fill="none" />
                                </svg>
                            )}
                            Google
                        </Button>
                    </div>

                    <p className="pt-4 px-8 text-center text-sm text-muted-foreground leading-relaxed">
                        By continuing, you agree to our{' '}
                        <a href="/legal/terms" className="underline underline-offset-4 hover:text-primary">
                            Terms of Service
                        </a>{' '}
                        and{' '}
                        <a href="/legal/privacy" className="underline underline-offset-4 hover:text-primary">
                            Privacy Policy
                        </a>
                        .
                    </p>
                    <p className="text-center text-xs text-muted-foreground">
                        Admin or staff?{' '}
                        <Link href="/admin-login" className="underline underline-offset-4 hover:text-primary">
                            Use admin login
                        </Link>
                    </p>
                </div>
            )}

            {authState === 'create-account' && (
                <div className="w-full space-y-6">
                    <div className="flex items-center">
                        <Button variant="ghost" size="icon" onClick={() => setAuthState('landing')} className="-ml-2">
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                        <h2 className="text-2xl font-bold ml-2">Create Account</h2>
                    </div>

                    <Form {...createAccountForm}>
                        <form onSubmit={createAccountForm.handleSubmit(onCreateAccountSubmit)} className="space-y-4">
                            <FormField
                                control={createAccountForm.control}
                                name="email"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Email Address</FormLabel>
                                        <FormControl>
                                            <Input placeholder="name@example.com" type="email" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={createAccountForm.control}
                                name="password"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Password</FormLabel>
                                        <FormControl>
                                            <Input type="password" placeholder="••••••••" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={createAccountForm.control}
                                name="confirmPassword"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Confirm Password</FormLabel>
                                        <FormControl>
                                            <Input type="password" placeholder="••••••••" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <div className="pt-4">
                                <Button type="submit" className="w-full h-12 text-lg bg-primary hover:bg-primary/90" disabled={loading}>
                                    {loading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                                    Continue
                                </Button>
                            </div>
                        </form>
                    </Form>
                </div>
            )}

            {authState === 'sign-in' && (
                <div className="w-full space-y-6">
                    <div className="flex items-center">
                        <Button variant="ghost" size="icon" onClick={() => setAuthState('landing')} className="-ml-2">
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                        <h2 className="text-2xl font-bold ml-2">Sign In</h2>
                    </div>

                    <Form {...signInForm}>
                        <form onSubmit={signInForm.handleSubmit(onSignInSubmit)} className="space-y-4">
                            <FormField
                                control={signInForm.control}
                                name="email"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Email Address</FormLabel>
                                        <FormControl>
                                            <Input placeholder="name@example.com" type="email" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={signInForm.control}
                                name="password"
                                render={({ field }) => (
                                    <FormItem>
                                        <div className="flex items-center justify-between">
                                            <FormLabel>Password</FormLabel>
                                        </div>
                                        <FormControl>
                                            <Input type="password" placeholder="••••••••" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <div className="flex justify-end">
                                <Link href="/forgot-password" className="text-sm font-medium text-primary hover:underline underline-offset-4">
                                    Forgot password?
                                </Link>
                            </div>
                            <div className="pt-4">
                                <Button type="submit" className="w-full h-12 text-lg bg-primary hover:bg-primary/90" disabled={loading}>
                                    {loading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                                    Sign In
                                </Button>
                            </div>
                        </form>
                    </Form>
                </div>
            )}
        </div>
    )
}
