'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { toast } from 'sonner'
import { mutate } from 'swr'
import confetti from 'canvas-confetti'
import { Loader2, Ticket } from 'lucide-react'

interface LotteryPurchaseModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    niceBalance: number
    drawingId: string
    canPurchase: number
}

export function LotteryPurchaseModal({ open, onOpenChange, niceBalance, drawingId, canPurchase }: LotteryPurchaseModalProps) {
    const [selectedQuantity, setSelectedQuantity] = useState<number>(1)
    const [isPurchasing, setIsPurchasing] = useState(false)

    const packages = [1, 5, 10].filter(q => q <= canPurchase)
    // If canPurchase < 1, user shouldn't be able to open this ideally, or we show empty state

    const handlePurchase = async () => {
        if (selectedQuantity * 200 > niceBalance) {
            toast.error('Insufficient Nice Balance', { description: 'You need more nice to buy these entries.' })
            return
        }

        setIsPurchasing(true)

        try {
            const res = await fetch('/api/lottery/purchase-entries', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ quantity: selectedQuantity })
            })

            const data = await res.json()

            if (!res.ok) {
                throw new Error(data.error || 'Failed to purchase')
            }

            // Success
            toast.success('Entries Purchased!', { description: `You bought ${data.entries_purchased} entries.` })

            // Confetti
            confetti({
                particleCount: 100,
                spread: 70,
                origin: { y: 0.6 }
            })

            // Refresh data
            await mutate('/api/lottery/current')
            onOpenChange(false)

        } catch (error: any) {
            toast.error('Purchase Failed', { description: error.message })
        } finally {
            setIsPurchasing(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Buy Lottery Entries</DialogTitle>
                    <DialogDescription>
                        Boost your chances to win! Each entry costs 200 Nice.
                        <br />
                        Remaining limit: {canPurchase} entries this week.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-3 gap-2">
                        {packages.length > 0 ? packages.map((qty) => (
                            <Card
                                key={qty}
                                className={`cursor-pointer p-4 flex flex-col items-center justify-center border-2 transition-all hover:bg-muted/50 ${selectedQuantity === qty ? 'border-purple-500 bg-purple-50/5' : 'border-transparent bg-secondary'}`}
                                onClick={() => setSelectedQuantity(qty)}
                            >
                                <Ticket className={`w-6 h-6 mb-2 ${selectedQuantity === qty ? 'text-purple-500' : 'opacity-50'}`} />
                                <span className="font-bold text-lg">{qty} Entry</span>
                                <span className="text-xs opacity-70">{qty * 200} Nice</span>
                            </Card>
                        )) : (
                            <div className="col-span-3 text-center py-4 text-muted-foreground">
                                You have reached the purchase limit for this week.
                            </div>
                        )}

                        {/* Custom quantity slider or input could go here if we wanted granular control */}
                        {/* But packages are simpler for now */}
                    </div>

                    <div className="flex justify-between items-center bg-secondary/30 p-3 rounded-lg">
                        <span className="text-sm">Cost:</span>
                        <span className="font-bold">{selectedQuantity * 200} Nice</span>
                    </div>

                    <div className="flex justify-between items-center bg-secondary/30 p-3 rounded-lg">
                        <span className="text-sm">Your Balance:</span>
                        <span className={`font-bold ${niceBalance < selectedQuantity * 200 ? 'text-red-500' : 'text-green-500'}`}>{niceBalance} Nice</span>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button
                        onClick={handlePurchase}
                        disabled={isPurchasing || packages.length === 0 || niceBalance < selectedQuantity * 200}
                        className="bg-gradient-to-r from-purple-500 to-pink-500 text-white"
                    >
                        {isPurchasing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Confirm Purchase
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
