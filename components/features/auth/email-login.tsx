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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

const emailSchema = z.object({
    email: z.string().email('Please enter a valid email address'),
})

const otpSchema = z.object({
    otp: z.string().length(6, 'OTP must be 6 digits'),
})

const passwordSchema = z.object({
    email: z.string().email('Please enter a valid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
})

export function EmailLogin() {
    const [step, setStep] = useState<'email' | 'otp'>('email')
    const [loading, setLoading] = useState(false)
    const [email, setEmail] = useState('')
    const [activeTab, setActiveTab] = useState('otp')
    const router = useRouter()
    const supabase = createClient()

    const emailForm = useForm<z.infer<typeof emailSchema>>({
        resolver: zodResolver(emailSchema),
        defaultValues: { email: '' },
    })

    const otpForm = useForm<z.infer<typeof otpSchema>>({
        resolver: zodResolver(otpSchema),
        defaultValues: { otp: '' },
    })

    const passwordForm = useForm<z.infer<typeof passwordSchema>>({
        resolver: zodResolver(passwordSchema),
        defaultValues: { email: '', password: '' },
    })

    async function onEmailSubmit(values: z.infer<typeof emailSchema>) {
        setLoading(true)
        try {
            const { error } = await supabase.auth.signInWithOtp({
                email: values.email,
                options: { shouldCreateUser: true }
            })

            if (error) {
                toast.error(error.message)
                return
            }

            setEmail(values.email)
            setStep('otp')
            toast.success('OTP sent to your email')
        } catch (error) {
            toast.error('Something went wrong. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    async function onOtpSubmit(values: z.infer<typeof otpSchema>) {
        setLoading(true)
        try {
            const { error } = await supabase.auth.verifyOtp({
                email,
                token: values.otp,
                type: 'email',
            })

            if (error) {
                toast.error(error.message)
                return
            }

            toast.success('Successfully logged in!')
            router.push('/')
            router.refresh()
        } catch (error) {
            toast.error('Failed to verify OTP')
        } finally {
            setLoading(false)
        }
    }

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

    return (
        <Card className="w-full">
            <CardHeader>
                <CardTitle>Welcome Back</CardTitle>
                <CardDescription>Sign in to your account</CardDescription>
            </CardHeader>
            <CardContent>
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-2 mb-4">
                        <TabsTrigger value="otp">OTP Code</TabsTrigger>
                        <TabsTrigger value="password">Password</TabsTrigger>
                    </TabsList>

                    <TabsContent value="otp">
                        {step === 'email' ? (
                            <Form {...emailForm}>
                                <form onSubmit={emailForm.handleSubmit(onEmailSubmit)} className="space-y-4">
                                    <FormField
                                        control={emailForm.control}
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
                                    <Button type="submit" className="w-full" disabled={loading}>
                                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        Send OTP
                                    </Button>
                                </form>
                            </Form>
                        ) : (
                            <Form {...otpForm}>
                                <form onSubmit={otpForm.handleSubmit(onOtpSubmit)} className="space-y-4">
                                    <FormField
                                        control={otpForm.control}
                                        name="otp"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>One-Time Password</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="123456" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <div className="flex gap-2">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            className="w-full"
                                            onClick={() => setStep('email')}
                                            disabled={loading}
                                        >
                                            Back
                                        </Button>
                                        <Button type="submit" className="w-full" disabled={loading}>
                                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                            Verify
                                        </Button>
                                    </div>
                                </form>
                            </Form>
                        )}
                    </TabsContent>

                    <TabsContent value="password">
                        <Form {...passwordForm}>
                            <form className="space-y-4">
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
                                <div className="flex flex-col gap-2">
                                    <Button
                                        type="button"
                                        onClick={passwordForm.handleSubmit(onPasswordSignIn)}
                                        className="w-full"
                                        disabled={loading}
                                    >
                                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        Sign In
                                    </Button>
                                </div>
                            </form>
                        </Form>
                    </TabsContent>
                </Tabs>

                <div className="mt-6 pt-6 border-t">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                            if (activeTab === 'password') {
                                passwordForm.handleSubmit(onPasswordSignUp)()
                            } else {
                                setActiveTab('password')
                            }
                        }}
                        className="w-full"
                        disabled={loading}
                    >
                        Create Account
                    </Button>
                </div>
            </CardContent>
        </Card>
    )
}
