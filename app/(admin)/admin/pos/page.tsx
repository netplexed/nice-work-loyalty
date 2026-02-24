'use client'

import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { recordUserSpend, searchCustomer } from '@/app/actions/admin-actions'
import { toast } from "sonner"
import { Loader2, User, DollarSign, CheckCircle, Search } from "lucide-react"
import { VoucherScanner } from "@/components/admin/voucher-scanner"
// import { createClient } from '@/lib/supabase/client' // No longer needed as verifyUser uses server action

export default function AdminPOSPage() {
    const [searchQuery, setSearchQuery] = useState('')
    const [amount, setAmount] = useState('')
    const [location, setLocation] = useState('tanuki_raw') // Default
    const [loading, setLoading] = useState(false)
    const [verifying, setVerifying] = useState(false)
    const [customer, setCustomer] = useState<any>(null)
    const [result, setResult] = useState<any>(null)

    // Load persisted location on mount
    useEffect(() => {
        const saved = localStorage.getItem('pos_location')
        if (saved) setLocation(saved)
    }, [])

    const handleLocationChange = (value: string) => {
        setLocation(value)
        localStorage.setItem('pos_location', value)
    }

    // ... handleScan, verifyUser

    const handleScan = async (data: string) => {
        // Format: "user:uuid"
        if (data.startsWith('user:')) {
            const id = data.split(':')[1]
            setSearchQuery(id)
            verifyUser(id)
        } else {
            toast.error('Invalid Member QR Code')
        }
    }

    const verifyUser = async (query: string) => {
        if (!query) return
        setVerifying(true)
        setCustomer(null)
        setResult(null)

        try {
            const data = await searchCustomer(query)
            if (data) {
                setCustomer(data)
                toast.success(`Customer verified: ${data.full_name}`)
            } else {
                toast.error('Customer not found')
            }
        } catch (error) {
            toast.error('Search failed')
        } finally {
            setVerifying(false)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!customer?.id || !amount) return

        setLoading(true)
        try {
            const res = await recordUserSpend(customer.id, parseFloat(amount), location)
            setResult(res)
            toast.success(`Success! Awarded ${res.pointsEarned} points.`)

            // Confetti
            const { default: confetti } = await import('canvas-confetti')
            confetti({
                particleCount: 100,
                spread: 70,
                origin: { y: 0.6 }
            })

            // Reset form partially
            setAmount('')
            setCustomer(null)
            setSearchQuery('')
        } catch (error: any) {
            toast.error(error.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="p-8 max-w-2xl mx-auto space-y-8">
            <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tight">Register / POS</h1>
                <p className="text-muted-foreground">Record customer spend and award points.</p>
            </div>

            <div className="grid gap-6">
                {/* Step 1: Identify Customer */}
                <Card className={customer ? 'border-green-200 bg-green-50/50' : ''}>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <User className="w-5 h-5" />
                            1. Identify Customer
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {!customer ? (
                            <div className="flex flex-col gap-4">
                                <div className="flex gap-4">
                                    <Input
                                        placeholder="Scan QR, Email, or Phone"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && verifyUser(searchQuery)}
                                        className="font-mono"
                                    />
                                    <VoucherScanner onScan={handleScan} />
                                </div>
                                <Button
                                    variant="secondary"
                                    onClick={() => verifyUser(searchQuery)}
                                    disabled={!searchQuery || verifying}
                                >
                                    {verifying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                                </Button>
                            </div>
                        ) : (
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="font-bold text-lg">{customer.full_name}</h3>
                                    <p className="text-muted-foreground text-sm">{customer.email}</p>
                                    <p className="text-xs uppercase font-bold mt-1 text-primary">
                                        {{ 'bronze': 'Hi My Name Is', 'silver': 'Good to See You', 'gold': 'Local Legend', 'platinum': 'Platinum' }[customer.tier as string] || customer.tier}
                                    </p>
                                </div>
                                <Button variant="ghost" size="sm" onClick={() => setCustomer(null)}>
                                    Change
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Step 2: Record Transaction */}
                <Card className={!customer ? 'opacity-50 pointer-events-none' : ''}>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <DollarSign className="w-5 h-5" />
                            2. Record Transaction
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Outlet / Location</label>
                                    <Select value={location} onValueChange={handleLocationChange}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select location" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="tanuki_raw">Tanuki Raw</SelectItem>
                                            <SelectItem value="standing_sushi_bar">Standing Sushi Bar</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="relative">
                                    <DollarSign className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                                    <Input
                                        type="number"
                                        step="0.01"
                                        placeholder="0.00"
                                        className="pl-10 text-xl font-bold"
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                    />
                                </div>
                            </div>

                            {amount && (
                                <div className="p-4 bg-gray-50 rounded-lg text-center">
                                    <p className="text-sm text-muted-foreground">Customer will earn</p>
                                    <p className="text-2xl font-bold text-green-600">
                                        +{Math.floor(parseFloat(amount) * 5)} Points
                                    </p>
                                </div>
                            )}

                            <Button type="submit" className="w-full" size="lg" disabled={loading || !amount}>
                                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                                Record Spend & Award Points
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
