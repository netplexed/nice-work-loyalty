'use client'

import { useState } from 'react'
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
import { Card, CardContent } from '@/components/ui/card'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'

const profileSchema = z.object({
    full_name: z.string().min(2, 'Name must be at least 2 characters'),
    phone: z.string().min(8, 'Phone number must be at least 8 digits').optional().or(z.literal('')),
})

export default function OnboardingPage() {
    const [loading, setLoading] = useState(false)
    const router = useRouter()
    const supabase = createClient()

    const form = useForm<z.infer<typeof profileSchema>>({
        resolver: zodResolver(profileSchema),
        defaultValues: {
            full_name: '',
            phone: '',
        },
    })

    async function onSubmit(values: z.infer<typeof profileSchema>) {
        setLoading(true)
        try {
            const { data: { user } } = await supabase.auth.getUser()

            if (!user) {
                throw new Error('No user found')
            }

            // Upsert profile for the new user
            const { error } = await supabase
                .from('profiles')
                .upsert({
                    id: user.id,
                    email: user.email, // Ensure email is synced from Auth user
                    full_name: values.full_name,
                    phone: values.phone || null,
                    updated_at: new Date().toISOString(),
                    // Default values for new profiles
                    points_balance: 10,
                    tier: 'bronze',
                    total_visits: 0,
                    total_spent: 0
                })

            if (error) throw error

            toast.success('Profile setup complete!')
            router.push('/')
            router.refresh()
        } catch (error) {
            toast.error('Failed to setup profile: ' + (error as Error).message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="flex flex-col items-center justify-center space-y-8">
            <div className="text-center space-y-2">
                <h1 className="text-2xl font-bold">Welcome!</h1>
                <p className="text-muted-foreground">Let's set up your profile</p>
            </div>

            <Card className="w-full">
                <CardContent className="pt-6">
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                            <FormField
                                control={form.control}
                                name="full_name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Full Name</FormLabel>
                                        <FormControl>
                                            <Input placeholder="John Doe" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="phone"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Phone Number (Optional)</FormLabel>
                                        <FormControl>
                                            <Input placeholder="+65 1234 5678" type="tel" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <Button type="submit" className="w-full" disabled={loading}>
                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Complete Setup
                            </Button>
                        </form>
                    </Form>
                </CardContent>
            </Card>
        </div>
    )
}
