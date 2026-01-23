'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { getReferralCode } from '@/app/actions/user-actions-extensions' // We will merge this later or import from new file
import { Copy, Share2, Users } from 'lucide-react'
import { toast } from 'sonner'

export function ReferralCard() {
    const [code, setCode] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        getReferralCode().then(setCode).finally(() => setLoading(false))
    }, [])

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
                    title: 'Join me on Nice Work Loyalty!',
                    text: `Use my code ${code} to get 500 bonus points!`,
                    url: window.location.origin
                })
            } catch (err) {
                console.log('Share cancelled')
            }
        } else {
            handleCopy()
        }
    }

    if (loading) return null

    return (
        <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-100">
            <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-green-600" />
                    <CardTitle className="text-lg">Refer & Earn</CardTitle>
                </div>
                <CardDescription>Get <strong>500 points</strong> for every friend who joins!</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <Input
                            readOnly
                            value={code || 'Generating...'}
                            className="bg-white font-mono text-center tracking-widest font-bold"
                        />
                    </div>
                    <Button variant="outline" size="icon" onClick={handleCopy} className="shrink-0 bg-white">
                        <Copy className="w-4 h-4" />
                    </Button>
                    <Button size="icon" onClick={handleShare} className="shrink-0 bg-green-600 hover:bg-green-700">
                        <Share2 className="w-4 h-4" />
                    </Button>
                </div>
            </CardContent>
        </Card>
    )
}
