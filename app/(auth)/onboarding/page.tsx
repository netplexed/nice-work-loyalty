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
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useSessionLoading } from '@/components/providers/session-provider'

const profileSchema = z.object({
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    birthday: z.string().min(1, 'Date of birth is required'),
})

export default function OnboardingPage() {
    const [loading, setLoading] = useState(false)
    const [initializing, setInitializing] = useState(true)
    const [isNameMissing, setIsNameMissing] = useState(false)
    const [userData, setUserData] = useState<{ id: string, email?: string }>({ id: '' })
    const router = useRouter()
    const supabase = createClient()
    const { isLoadingSession } = useSessionLoading()

    const form = useForm<z.infer<typeof profileSchema>>({
        resolver: zodResolver(profileSchema),
        defaultValues: {
            firstName: '',
            lastName: '',
            birthday: '',
        },
    })

    useEffect(() => {
        async function loadProfile() {
            if (isLoadingSession) return
            try {
                const { data: { user } } = await supabase.auth.getUser()
                if (!user) {
                    router.push('/login')
                    return
                }

                setUserData({ id: user.id, email: user.email })

                const { data: profile } = await supabase
                    .from('profiles')
                    .select('full_name, birthday')
                    .eq('id', user.id)
                    .maybeSingle()

                // Determine if name is missing (empty or matches email prefix)
                const emailPrefix = user.email ? user.email.split('@')[0] : ''
                if (!profile?.full_name || profile.full_name === emailPrefix) {
                    setIsNameMissing(true)
                } else {
                    setIsNameMissing(false)
                }

                // If they somehow already have a birthday, they shouldn't be here, but we'll let them update it or just proceed
                if (profile?.birthday) {
                    form.setValue('birthday', profile.birthday as string)
                }

            } catch (error) {
                console.error("Error loading profile:", error)
            } finally {
                setInitializing(false)
            }
        }

        loadProfile()
    }, [isLoadingSession, supabase, router, form])

    async function onSubmit(values: z.infer<typeof profileSchema>) {
        if (isNameMissing && (!values.firstName || !values.lastName)) {
            if (!values.firstName) form.setError('firstName', { message: 'First name is required' })
            if (!values.lastName) form.setError('lastName', { message: 'Last name is required' })
            return
        }

        setLoading(true)
        try {
            const updates: any = {
                updated_at: new Date().toISOString(),
                birthday: values.birthday,
            }

            if (isNameMissing) {
                updates.full_name = `${values.firstName} ${values.lastName}`.trim()
            }

            // Upsert the profile in case the auth callback didn't create it (e.g., email signup without triggers)
            const { error: upsertErr } = await supabase
                .from('profiles')
                .upsert({
                    id: userData.id,
                    email: userData.email,
                    ...updates,
                    // Supply defaults so UPSERT for a brand new user from Email/Password works properly
                    points_balance: 50,
                    tier: 'bronze',
                    total_visits: 0,
                    total_spent: 0
                }, { onConflict: 'id', ignoreDuplicates: false })

            if (upsertErr) throw upsertErr

            toast.success('Nice to meet you!')
            router.push('/')
            router.refresh()
        } catch (error) {
            toast.error('Failed to save details: ' + (error as Error).message)
        } finally {
            setLoading(false)
        }
    }

    if (initializing || isLoadingSession) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    return (
        <div className="flex flex-col items-center justify-center max-w-sm mx-auto space-y-8 w-full">
            <div className="text-center space-y-2">
                <h1 className="text-3xl font-bold tracking-tight">Nice to meet you.</h1>
                <p className="text-muted-foreground text-sm">Let's get acquainted</p>
            </div>

            <div className="w-full space-y-6">
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        {isNameMissing && (
                            <>
                                <FormField
                                    control={form.control}
                                    name="firstName"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>First Name</FormLabel>
                                            <FormControl>
                                                <Input placeholder="John" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="lastName"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Last Name</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Doe" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </>
                        )}

                        <FormField
                            control={form.control}
                            name="birthday"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Date of Birth</FormLabel>
                                    <FormControl>
                                        <div className="relative">
                                            <Input
                                                type="date"
                                                className="w-full justify-start text-left font-normal"
                                                {...field}
                                            />
                                        </div>
                                    </FormControl>
                                    <p className="text-xs text-muted-foreground mt-1.5">
                                        We'll treat you during your birthday month.
                                    </p>
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
        </div>
    )
}
