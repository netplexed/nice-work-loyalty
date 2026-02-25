'use client'

import { useEffect, useMemo, useState } from 'react'
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
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import type { EmailOtpType } from '@supabase/supabase-js'
import Link from 'next/link'

const updatePasswordSchema = z.object({
    password: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string().min(6, 'Confirm password must be at least 6 characters'),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
})

export default function UpdatePasswordPage() {
    const [loading, setLoading] = useState(false)
    const [initializing, setInitializing] = useState(true)
    const [sessionReady, setSessionReady] = useState(false)
    const router = useRouter()
    const supabase = useMemo(() => createClient(), [])

    useEffect(() => {
        let cancelled = false

        async function initializeRecoverySession() {
            try {
                const searchParams = new URLSearchParams(window.location.search)
                const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''))

                const code = searchParams.get('code')
                const tokenHash = searchParams.get('token_hash')
                const type = searchParams.get('type')

                if (code) {
                    const { error } = await supabase.auth.exchangeCodeForSession(code)
                    if (error) throw error
                } else if (tokenHash && type) {
                    const { error } = await supabase.auth.verifyOtp({
                        token_hash: tokenHash,
                        type: type as EmailOtpType,
                    })
                    if (error) throw error
                } else {
                    const accessToken = hashParams.get('access_token')
                    const refreshToken = hashParams.get('refresh_token')
                    if (accessToken && refreshToken) {
                        const { error } = await supabase.auth.setSession({
                            access_token: accessToken,
                            refresh_token: refreshToken,
                        })
                        if (error) throw error
                    }
                }

                const { data: { session } } = await supabase.auth.getSession()
                if (!session) {
                    throw new Error('Reset link is invalid or expired. Request a new one.')
                }

                if (!cancelled) {
                    setSessionReady(true)
                }
            } catch (error: unknown) {
                if (!cancelled) {
                    setSessionReady(false)
                    toast.error(error instanceof Error ? error.message : 'Could not verify reset link')
                }
            } finally {
                if (!cancelled) {
                    setInitializing(false)
                }
            }
        }

        initializeRecoverySession()

        return () => {
            cancelled = true
        }
    }, [supabase])

    const form = useForm<z.infer<typeof updatePasswordSchema>>({
        resolver: zodResolver(updatePasswordSchema),
        defaultValues: { password: '', confirmPassword: '' },
    })

    async function onSubmit(values: z.infer<typeof updatePasswordSchema>) {
        setLoading(true)
        try {
            const { error } = await supabase.auth.updateUser({
                password: values.password
            })

            if (error) {
                toast.error(error.message)
                return
            }

            toast.success('Password updated successfully')

            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                router.push('/login?step=sign-in')
                return
            }

            const adminProbe = await supabase
                .from('admin_users')
                .select('id')
                .eq('id', user.id)
                .maybeSingle()

            if (adminProbe.data) {
                router.push('/admin-login?step=sign-in')
            } else {
                router.push('/login?step=sign-in')
            }
        } catch (error) {
            toast.error('Failed to update password')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="flex flex-col items-center justify-center max-w-sm mx-auto space-y-8 w-full min-h-[50vh]">
            <div className="w-full space-y-6">
                <div className="text-center space-y-2">
                    <h2 className="text-2xl font-bold">Set New Password</h2>
                    <p className="text-muted-foreground text-sm">
                        Please enter your new password below.
                    </p>
                </div>

                {initializing ? (
                    <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <p className="mt-3 text-sm">Verifying reset link...</p>
                    </div>
                ) : !sessionReady ? (
                    <div className="space-y-4 text-center">
                        <p className="text-sm text-muted-foreground">
                            This reset link is no longer valid.
                        </p>
                        <Link href="/forgot-password" className="inline-block">
                            <Button variant="outline">Request New Reset Link</Button>
                        </Link>
                    </div>
                ) : (
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="password"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>New Password</FormLabel>
                                    <FormControl>
                                        <Input type="password" placeholder="••••••••" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
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
                                Reset Password
                            </Button>
                        </div>
                    </form>
                </Form>
                )}
            </div>
        </div>
    )
}
