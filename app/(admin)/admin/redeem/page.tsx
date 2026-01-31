'use client'

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card"
import { verifyAndRedeemVoucher } from '@/app/actions/admin-actions'
import { toast } from "sonner"
import { Loader2, CheckCircle, XCircle, Search } from "lucide-react"
import { VoucherScanner } from "@/components/admin/voucher-scanner"

export default function AdminRedeemPage() {
    const [code, setCode] = useState('')
    const [loading, setLoading] = useState(false)
    const [result, setResult] = useState<any>(null)

    const executeRedeem = async (voucherCode: string) => {
        if (!voucherCode) return

        setLoading(true)
        setResult(null)

        try {
            const res = await verifyAndRedeemVoucher(voucherCode)
            setResult(res)
            toast.success('Voucher redeemed successfully')
            setCode('') // Clear input on success
        } catch (error: any) {
            setResult({ success: false, message: error.message })
            toast.error(error.message)
        } finally {
            setLoading(false)
        }
    }

    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        executeRedeem(code)
    }

    const handleScan = (scannedCode: string) => {
        setCode(scannedCode)
        executeRedeem(scannedCode)
    }

    return (
        <div className="p-8 max-w-2xl mx-auto space-y-8">
            <div className="space-y-2 text-center sm:text-left">
                <h1 className="text-3xl font-bold tracking-tight">Voucher Redemption</h1>
                <p className="text-muted-foreground">
                    Enter the customer's voucher code to verify and redeem.
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Redeem Voucher</CardTitle>
                    <CardDescription>
                        This will mark the reward as used immediately.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleFormSubmit} className="flex flex-col sm:flex-row gap-4">
                        <div className="flex gap-2 order-1 sm:order-2 w-full sm:w-auto">
                            <VoucherScanner onScan={handleScan} className="flex-1 sm:flex-none" />
                            <Button type="submit" disabled={loading || !code} className="flex-1 sm:flex-none">
                                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Redeem'}
                            </Button>
                        </div>

                        <div className="flex-1 order-2 sm:order-1">
                            <Input
                                placeholder="Enter voucher code"
                                value={code}
                                onChange={(e) => setCode(e.target.value)}
                                className="font-mono text-lg uppercase w-full"
                            />
                        </div>
                    </form>
                </CardContent>
            </Card>

            {result && (
                <div className={`p-6 rounded-lg border flex items-start gap-4 animate-in fade-in slide-in-from-bottom-4 ${result.success ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'
                    }`}>
                    {result.success ? (
                        <>
                            <CheckCircle className="w-6 h-6 shrink-0 text-green-600" />
                            <div className="space-y-1">
                                <h3 className="font-bold text-lg">Redemption Successful!</h3>
                                <p>Reward: <span className="font-semibold">{result.rewardName}</span></p>
                                <p>Customer: <span className="font-semibold">{result.customerName}</span></p>
                            </div>
                        </>
                    ) : (
                        <>
                            <XCircle className="w-6 h-6 shrink-0 text-red-600" />
                            <div>
                                <h3 className="font-bold text-lg">Redemption Failed</h3>
                                <p>{result.message}</p>
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    )
}
