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
import { Loader2, ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'

const forgotPasswordSchema = z.object({
    email: z.string().email('Please enter a valid email address'),
})

export default function ForgotPasswordPage() {
    const [loading, setLoading] = useState(false)
    const [emailSent, setEmailSent] = useState(false)
    const supabase = createClient()

    const form = useForm<z.infer<typeof forgotPasswordSchema>>({
        resolver: zodResolver(forgotPasswordSchema),
        defaultValues: { email: '' },
    })

    async function onSubmit(values: z.infer<typeof forgotPasswordSchema>) {
        setLoading(true)
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(values.email, {
                redirectTo: `${window.location.origin}/update-password`,
            })

            if (error) {
                toast.error(error.message)
                return
            }

            setEmailSent(true)
            toast.success('Check your email for the reset link')
        } catch (error) {
            toast.error('Failed to send reset email')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="flex flex-col items-center justify-center max-w-sm mx-auto space-y-8 w-full">
            <div className="w-full space-y-6">
                <div className="flex items-center">
                    <Link href="/login?step=sign-in" className="inline-flex -ml-2">
                        <Button variant="ghost" size="icon" tabIndex={-1}>
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                    </Link>
                    <h2 className="text-2xl font-bold ml-2">Reset Password</h2>
                </div>

                {!emailSent ? (
                    <>
                        <p className="text-muted-foreground text-sm">
                            Enter the email address associated with your account and we'll send you a link to reset your password.
                        </p>
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                                <FormField
                                    control={form.control}
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
                                <div className="pt-4">
                                    <Button type="submit" className="w-full h-12 text-lg bg-primary hover:bg-primary/90" disabled={loading}>
                                        {loading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                                        Send Reset Link
                                    </Button>
                                </div>
                            </form>
                        </Form>
                    </>
                ) : (
                    <div className="text-center space-y-6 py-8">
                        <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                            <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                        </div>
                        <h3 className="text-xl font-semibold">Check your mail</h3>
                        <p className="text-muted-foreground text-sm">
                            We have sent a password recover link to {form.getValues().email}. Please check your inbox.
                        </p>
                        <Link href="/login?step=sign-in" className="block pt-4">
                            <Button variant="outline" className="w-full h-12">Return to Login</Button>
                        </Link>
                    </div>
                )}
            </div>
        </div>
    )
}
