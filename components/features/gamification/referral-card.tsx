'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { getReferralCode } from '@/app/actions/user-actions-extensions'
import { hasRedeemedReferralCode, submitReferral } from '@/app/actions/referral-actions'
import { Copy, Share2, Users, ArrowRight } from 'lucide-react'
import { toast } from 'sonner'
import confetti from 'canvas-confetti'
import useSWR from 'swr'

type ReferralCardState = {
    code: string | null
    hasRedeemedCode: boolean
}

export function ReferralCard() {
    const [inputCode, setInputCode] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const { data, isLoading, mutate } = useSWR<ReferralCardState>(
        'referral-card-state',
        async () => {
            const [code, redeemed] = await Promise.all([
                getReferralCode(),
                hasRedeemedReferralCode()
            ])
            return {
                code,
                hasRedeemedCode: redeemed
            }
        },
        {
            keepPreviousData: true,
            revalidateIfStale: false,
            revalidateOnFocus: true,
            dedupingInterval: 60000
        }
    )
    const code = data?.code || null
    const hasRedeemedCode = data?.hasRedeemedCode || false

    const handleCopy = () => {
        if (code) {
            navigator.clipboard.writeText(code)
            toast.success('Referral code copied!')
        }
    }

    const handleShare = async () => {
        if (code && navigator.share) {
            try {
                await navigator.share({
                    title: 'join me on nice work!',
                    text: `use my code ${code} to get 100 bonus points!`,
                    url: window.location.origin
                })
            } catch (err) {
                console.log('Share cancelled')
            }
        } else {
            handleCopy()
        }
    }

    const handleRedeem = async () => {
        if (!inputCode || inputCode.length < 5) return
        setSubmitting(true)
        try {
            const response = await submitReferral(inputCode)
            if (!response.success) {
                throw new Error(response.error || 'Failed to redeem code')
            }

            toast.success(`Code redeemed! You earned ${response.points} points!`)
            mutate((current) => ({
                code: current?.code || code,
                hasRedeemedCode: true
            }), false)
            setInputCode('')
            confetti({
                particleCount: 100,
                spread: 70,
                origin: { y: 0.6 }
            })
        } catch (error: any) {
            toast.error(error.message || 'Failed to redeem code')
        } finally {
            setSubmitting(false)
        }
    }

    if (isLoading && !data) return null

    return (
        <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-100">
            <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-green-600" />
                    <CardTitle className="text-lg">Refer & Earn</CardTitle>
                </div>
                <CardDescription>Get <strong>250 points</strong> for every friend who joins and spends!</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Your Code Section */}
                <div className="space-y-2">
                    <label className="text-xs font-semibold text-green-800 uppercase tracking-wider">Your Code</label>
                    <div className="flex gap-2">
                        <div className="relative flex-1">
                            <Input
                                readOnly
                                value={code || 'Generating...'}
                                className="bg-white font-mono text-center tracking-widest font-bold border-green-200"
                            />
                        </div>
                        <Button variant="outline" size="icon" onClick={handleCopy} className="shrink-0 bg-white border-green-200 hover:bg-green-50 text-green-700">
                            <Copy className="w-4 h-4" />
                        </Button>
                        <Button size="icon" onClick={handleShare} className="shrink-0 bg-green-600 hover:bg-green-700 text-white shadow-sm">
                            <Share2 className="w-4 h-4" />
                        </Button>
                    </div>
                </div>

                {!hasRedeemedCode ? (
                    <div className="pt-2 border-t border-green-200/50">
                        <label className="text-xs font-semibold text-green-800 uppercase tracking-wider mb-2 block">Have a code?</label>
                        <div className="flex gap-2">
                            <Input
                                placeholder="Enter friend's code"
                                value={inputCode}
                                onChange={(e) => setInputCode(e.target.value)}
                                className="bg-white/80 border-green-200 uppercase placeholder:normal-case"
                                maxLength={10}
                            />
                            <Button
                                onClick={handleRedeem}
                                disabled={!inputCode || submitting}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                            >
                                {submitting ? '...' : <ArrowRight className="w-4 h-4" />}
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="pt-2 border-t border-green-200/50">
                        <p className="text-sm text-green-800">Referral code already redeemed.</p>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
