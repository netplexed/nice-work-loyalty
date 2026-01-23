'use client'

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useState } from 'react'
import { redeemReward } from '@/app/actions/rewards-actions'
import { Loader2, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'

interface RedemptionModalProps {
    reward: any
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function RedemptionModal({ reward, open, onOpenChange }: RedemptionModalProps) {
    const [loading, setLoading] = useState(false)
    const [voucher, setVoucher] = useState<string | null>(null)

    const handleRedeem = async () => {
        if (!reward) return

        setLoading(true)
        try {
            const result = await redeemReward(reward.id)
            setVoucher(result.voucherCode)
            toast.success('Reward redeemed successfully!')
        } catch (error: any) {
            toast.error(error.message || 'Failed to redeem reward')
        } finally {
            setLoading(false)
        }
    }

    const handleClose = () => {
        onOpenChange(false)
        // small delay to reset state after animation
        setTimeout(() => setVoucher(null), 300)
    }

    if (!reward) return null

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-md">
                {!voucher ? (
                    <>
                        <DialogHeader>
                            <DialogTitle>Confirm Redemption</DialogTitle>
                            <DialogDescription>
                                Are you sure you want to redeem <strong>{reward.name}</strong> for{' '}
                                <span className="font-bold text-primary">{reward.points_cost} points</span>?
                            </DialogDescription>
                        </DialogHeader>
                        <div className="py-4">
                            <p className="text-sm text-muted-foreground bg-gray-50 p-3 rounded-md border text-center">
                                Points will be deducted immediately. This cannot be undone.
                            </p>
                        </div>
                        <DialogFooter className="gap-2 sm:gap-0">
                            <Button variant="outline" onClick={handleClose} disabled={loading}>
                                Cancel
                            </Button>
                            <Button onClick={handleRedeem} disabled={loading}>
                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Confirm Redeem
                            </Button>
                        </DialogFooter>
                    </>
                ) : (
                    <>
                        <DialogHeader>
                            <div className="flex flex-col items-center gap-4 py-4">
                                <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                                    <CheckCircle2 className="w-6 h-6" />
                                </div>
                                <DialogTitle className="text-center">Redemption Successful!</DialogTitle>
                                <DialogDescription className="text-center">
                                    Your voucher is ready. Show this to staff to claim your reward.
                                </DialogDescription>
                            </div>
                        </DialogHeader>
                        <div className="flex flex-col items-center gap-2 p-6 bg-gray-50 rounded-lg border border-dashed border-gray-200 my-2">
                            <span className="text-xs uppercase text-muted-foreground tracking-wider">Voucher Code</span>
                            <span className="text-3xl font-mono font-bold tracking-widest text-primary">{voucher}</span>
                        </div>
                        <DialogFooter>
                            <Button className="w-full" onClick={handleClose}>
                                Done
                            </Button>
                        </DialogFooter>
                    </>
                )}
            </DialogContent>
        </Dialog>
    )
}
