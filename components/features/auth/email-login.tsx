'use client'

import { useState, useEffect } from 'react'
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

const passwordSchema = z.object({
    email: z.string().email('Please enter a valid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
})

// Custom scheme registered in AndroidManifest.xml that brings the user back into the app
const ANDROID_OAUTH_REDIRECT = 'com.niceworkloyalty.app://auth/callback'

export function EmailLogin() {
    const [loading, setLoading] = useState(false)
    const [oauthLoading, setOauthLoading] = useState(false)
    const [isSignUp, setIsSignUp] = useState(false)
    const router = useRouter()
    const supabase = createClient()

    const passwordForm = useForm<z.infer<typeof passwordSchema>>({
        resolver: zodResolver(passwordSchema),
        defaultValues: { email: '', password: '' },
    })

    // Handle deep-link callback on Android after Google OAuth
    // The App plugin fires 'appUrlOpen' when the custom scheme URL is intercepted by the OS.
    useEffect(() => {
        let cleanup: (() => void) | undefined

        const setupDeepLinkListener = async () => {
            // Only set up the listener if we're running inside a Capacitor native app
            try {
                const { Capacitor } = await import('@capacitor/core')
                if (!Capacitor.isNativePlatform()) return

                const { App } = await import('@capacitor/app')
                const { Browser } = await import('@capacitor/browser')

                const handle = await App.addListener('appUrlOpen', async (event: any) => {
                    // event.url e.g. "com.niceworkloyalty.app://auth/callback?code=xxx"
                    const url = new URL(event.url)
                    const code = url.searchParams.get('code')

                    if (code) {
                        setOauthLoading(true)
                        try {
                            // Close the in-app browser first
                            await Browser.close()

                            const { error } = await supabase.auth.exchangeCodeForSession(code)
                            if (error) {
                                toast.error('Sign in failed: ' + error.message)
                                return
                            }

                            toast.success('Successfully signed in with Google!')
                            router.push('/')
                            router.refresh()
                        } catch (err) {
                            toast.error('Failed to complete sign in')
                        } finally {
                            setOauthLoading(false)
                        }
                    }
                })

                cleanup = () => handle.remove()
            } catch {
                // Not in a Capacitor environment — no-op
            }
        }

        setupDeepLinkListener()
        return () => cleanup?.()
    }, [supabase, router])

    async function onPasswordSignIn(values: z.infer<typeof passwordSchema>) {
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

    async function onPasswordSignUp(values: z.infer<typeof passwordSchema>) {
        setLoading(true)
        try {
            // Optimistically try to sign in first
            // This handles the case where a user exists but clicks "Create Account"
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

            // If sign in failed (likely invalid creds or no account), proceed to sign up
            const { error, data } = await supabase.auth.signUp({
                email: values.email,
                password: values.password,
            })

            if (error) {
                toast.error(error.message)
                return
            }

            toast.success('Account created! logging you in...')
            router.push('/')
            router.refresh()
        } catch (error) {
            toast.error('Failed to sign up')
        } finally {
            setLoading(false)
        }
    }

    const onSubmit = (values: z.infer<typeof passwordSchema>) => {
        if (isSignUp) {
            onPasswordSignUp(values)
        } else {
            onPasswordSignIn(values)
        }
    }

    async function onGoogleSignIn() {
        setOauthLoading(true)
        try {
            const { Capacitor } = await import('@capacitor/core')
            const platform = Capacitor.getPlatform()
            const isNative = platform === 'ios' || platform === 'android'

            if (isNative) {
                // --- Android / iOS native path ---
                // Get the OAuth URL from Supabase without letting it auto-navigate.
                // We pass skipBrowserRedirect: true so signInWithOAuth returns the URL
                // instead of triggering window.location — we then open it ourselves
                // via the Capacitor Browser plugin (in-app Custom Tab).
                const { data, error } = await supabase.auth.signInWithOAuth({
                    provider: 'google',
                    options: {
                        redirectTo: ANDROID_OAUTH_REDIRECT,
                        skipBrowserRedirect: true,
                    },
                })

                if (error) {
                    toast.error(error.message)
                    setOauthLoading(false)
                    return
                }

                if (data?.url) {
                    const { Browser } = await import('@capacitor/browser')
                    await Browser.open({
                        url: data.url,
                        presentationStyle: 'popover',
                    })
                    // The appUrlOpen listener (set up in useEffect) will handle
                    // the callback and exchange the code for a session.
                }
            } else {
                // --- Web path (unchanged) ---
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
                // Do NOT setOauthLoading(false) here on success.
                // The browser is about to redirect to Google.
                // If we set it to false, the spinner vanishes and the UI jumps before the redirect happens.
            }
        } catch (error) {
            toast.error('Failed to sign in with Google')
            setOauthLoading(false)
        }
    }

    return (
        <Card className="w-full">
            <CardHeader>
                <CardTitle>Welcome</CardTitle>
                <CardDescription>
                    Sign into your account or enter an email and password to create an account
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...passwordForm}>
                    <form onSubmit={passwordForm.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={passwordForm.control}
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
                            control={passwordForm.control}
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
                        <div className="flex flex-col gap-4 mt-4">
                            <Button
                                type="submit"
                                onClick={() => setIsSignUp(false)}
                                className="w-full"
                                disabled={loading}
                            >
                                {loading && !isSignUp && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Sign In
                            </Button>

                            <div className="relative">
                                <div className="absolute inset-0 flex items-center">
                                    <span className="w-full border-t" />
                                </div>
                                <div className="relative flex justify-center text-xs uppercase">
                                    <span className="bg-background px-2 text-muted-foreground">
                                        Or
                                    </span>
                                </div>
                            </div>

                            <Button
                                type="submit"
                                variant="outline"
                                onClick={() => setIsSignUp(true)}
                                className="w-full"
                                disabled={loading || oauthLoading}
                            >
                                {loading && isSignUp && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Create Account
                            </Button>

                            <div className="relative">
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
                                type="button"
                                variant="outline"
                                onClick={onGoogleSignIn}
                                className="w-full"
                                disabled={loading || oauthLoading}
                            >
                                {oauthLoading ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                    <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
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
                    </form>
                </Form>
            </CardContent>
        </Card>
    )
}
