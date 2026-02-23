'use client'

import { useMemo, useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { adjustUserTier } from '@/app/actions/admin-actions'
import { toast } from 'sonner'
import { Crown, Loader2 } from 'lucide-react'

type TierAdjustmentDialogProps = {
    userId: string
    userName: string
    currentTier: string
    trigger?: React.ReactNode
}

const TIERS = [
    { value: 'bronze', label: 'Hi My Name Is' },
    { value: 'silver', label: 'Good to See You' },
    { value: 'gold', label: 'Local Legend' },
    { value: 'platinum', label: 'Platinum' }
]

export function TierAdjustmentDialog({ userId, userName, currentTier, trigger }: TierAdjustmentDialogProps) {
    const normalizedCurrentTier = useMemo(
        () => currentTier.trim().toLowerCase(),
        [currentTier]
    )
    const defaultTier = TIERS.some((tier) => tier.value === normalizedCurrentTier) ? normalizedCurrentTier : 'bronze'

    const [open, setOpen] = useState(false)
    const [selectedTier, setSelectedTier] = useState(defaultTier)
    const [loading, setLoading] = useState(false)

    const handleOpenChange = (nextOpen: boolean) => {
        setOpen(nextOpen)
        if (nextOpen) {
            setSelectedTier(defaultTier)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            await adjustUserTier(userId, selectedTier)
            toast.success(`Updated tier to ${selectedTier}`)
            setOpen(false)
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Failed to update tier'
            toast.error(message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button variant="outline" size="sm">
                        <Crown className="mr-2 h-4 w-4" />
                        Adjust Tier
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Adjust Tier for {userName}</DialogTitle>
                    <DialogDescription>
                        Current Tier: <span className="capitalize">{TIERS.find(t => t.value === defaultTier)?.label || defaultTier}</span>
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label>New Tier</Label>
                        <Select value={selectedTier} onValueChange={setSelectedTier}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select tier" />
                            </SelectTrigger>
                            <SelectContent>
                                {TIERS.map((tier) => (
                                    <SelectItem key={tier.value} value={tier.value}>
                                        {tier.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <DialogFooter>
                        <Button type="submit" disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save Tier
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
