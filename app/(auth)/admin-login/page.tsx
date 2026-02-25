'use client'

import { Suspense, useCallback, useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'
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
import { toast } from 'sonner'

const schema = z.object({
    email: z.string().email('Please enter a valid email address'),
    password: z.string().min(1, 'Password is required'),
})

function isMissingColumnError(error: { code?: string, message?: string } | null) {
    if (!error) return false
    if (error.code === '42703' || error.code === 'PGRST204') return true

    const message = (error.message || '').toLowerCase()
    return (
        (message.includes('column') && message.includes('does not exist')) ||
        (message.includes('could not find') && message.includes('schema cache'))
    )
}

type AdminAccess = {
    role: string
    isActive: boolean
}

export default function AdminLoginPage() {
    return (
        <Suspense fallback={
            <div className="flex flex-col items-center justify-center min-h-[40vh]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="mt-4 text-muted-foreground">Loading admin login...</p>
            </div>
        }>
            <AdminLoginPageContent />
        </Suspense>
    )
}

function AdminLoginPageContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const supabase = createClient()
    const [loading, setLoading] = useState(false)
    const [checkingSession, setCheckingSession] = useState(true)

    const form = useForm<z.infer<typeof schema>>({
        resolver: zodResolver(schema),
        defaultValues: { email: '', password: '' },
    })

    const resolveAdminAccess = useCallback(async (userId: string): Promise<AdminAccess | null> => {
        const primary = await supabase
            .from('admin_users')
            .select('id, role, status, active')
            .eq('id', userId)
            .maybeSingle()

        if (!primary.error && primary.data) {
            const row = primary.data as { role: string, status?: string | null, active?: boolean | null }
            return {
                role: row.role,
                isActive: typeof row.status === 'string' ? row.status === 'active' : !!row.active,
            }
        }

        if (primary.error && !isMissingColumnError(primary.error)) {
            throw new Error(primary.error.message || 'Failed to validate admin access')
        }

        const fallback = await supabase
            .from('admin_users')
            .select('id, role, active')
            .eq('id', userId)
            .maybeSingle()

        if (fallback.error) {
            throw new Error(fallback.error.message || 'Failed to validate admin access')
        }

        if (!fallback.data) return null
        const row = fallback.data as { role: string, active?: boolean | null }
        return {
            role: row.role,
            isActive: !!row.active,
        }
    }, [supabase])

    const routeByRole = useCallback(async (role: string) => {
        if (role === 'staff') {
            router.push('/admin/redeem')
        } else {
            router.push('/admin')
        }
        router.refresh()
    }, [router])

    useEffect(() => {
        const error = searchParams.get('error')
        if (error === 'forbidden') {
            toast.error('This account does not have admin access')
        } else if (error === 'disabled') {
            toast.error('This admin account is disabled')
        }
    }, [searchParams])

    useEffect(() => {
        async function checkExistingSession() {
            try {
                const { data: { user } } = await supabase.auth.getUser()
                if (!user) return

                const access = await resolveAdminAccess(user.id)
                if (!access || !access.isActive) {
                    await supabase.auth.signOut()
                    return
                }

                await routeByRole(access.role)
            } catch {
                await supabase.auth.signOut()
            } finally {
                setCheckingSession(false)
            }
        }

        checkExistingSession()
    }, [resolveAdminAccess, routeByRole, supabase.auth])

    async function onSubmit(values: z.infer<typeof schema>) {
        setLoading(true)
        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email: values.email,
                password: values.password,
            })

            if (error || !data.user) {
                throw new Error(error?.message || 'Invalid email or password')
            }

            const access = await resolveAdminAccess(data.user.id)
            if (!access) {
                await supabase.auth.signOut()
                throw new Error('This account does not have admin access')
            }
            if (!access.isActive) {
                await supabase.auth.signOut()
                throw new Error('This admin account is disabled')
            }

            toast.success('Signed in to admin portal')
            await routeByRole(access.role)
        } catch (error: unknown) {
            toast.error(error instanceof Error ? error.message : 'Failed to sign in')
        } finally {
            setLoading(false)
        }
    }

    if (checkingSession) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[40vh]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="mt-4 text-muted-foreground">Checking admin session...</p>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="text-center space-y-2">
                <h1 className="text-3xl font-bold tracking-tight">Admin Portal</h1>
                <p className="text-sm text-muted-foreground">Backend access for admin and staff accounts only</p>
            </div>

            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Email Address</FormLabel>
                                <FormControl>
                                    <Input type="email" placeholder="admin@company.com" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="password"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Password</FormLabel>
                                <FormControl>
                                    <Input type="password" placeholder="********" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <Button type="submit" className="w-full h-11" disabled={loading}>
                        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Sign In to Admin
                    </Button>
                </form>
            </Form>
        </div>
    )
}
