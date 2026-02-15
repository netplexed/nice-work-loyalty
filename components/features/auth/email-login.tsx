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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
const passwordSchema = z.object({
    email: z.string().email('Please enter a valid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
})

export function EmailLogin() {
    const [loading, setLoading] = useState(false)
    const [isSignUp, setIsSignUp] = useState(false)
    const router = useRouter()
    const supabase = createClient()

    const passwordForm = useForm<z.infer<typeof passwordSchema>>({
        resolver: zodResolver(passwordSchema),
        defaultValues: { email: '', password: '' },
    })

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

            if (data.user && !data.session) {
                toast.success('Account created! Please check your email to confirm.')
            } else {
                toast.success('Account created and logged in!')
                router.push('/')
                router.refresh()
            }
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

    return (
        <Card className="w-full">
            <CardHeader>
                <CardTitle>Welcome</CardTitle>
                <CardDescription>
                    Sign into your account or enter an email and password and create an account
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
                                disabled={loading}
                            >
                                {loading && isSignUp && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Create Account
                            </Button>
                        </div>
                    </form>
                </Form>
            </CardContent>
        </Card>
    )
}
