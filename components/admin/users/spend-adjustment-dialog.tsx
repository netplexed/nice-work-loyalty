'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { recordUserSpend } from '@/app/actions/admin-actions'
import { toast } from 'sonner'
import { DollarSign, Loader2 } from 'lucide-react'

type SpendAdjustmentDialogProps = {
    userId: string
    userName: string
    trigger?: React.ReactNode
}

const LOCATIONS = [
    { value: 'tanuki_raw', label: 'Tanuki Raw' },
    { value: 'standing_sushi_bar', label: 'Standing Sushi Bar' }
]

export function SpendAdjustmentDialog({ userId, userName, trigger }: SpendAdjustmentDialogProps) {
    const [open, setOpen] = useState(false)
    const [amount, setAmount] = useState('')
    const [location, setLocation] = useState('tanuki_raw')
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            const parsedAmount = Number.parseFloat(amount)
            if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
                throw new Error('Enter a valid amount')
            }

            const result = await recordUserSpend(userId, parsedAmount, location)
            const multiplierNote = result.multiplierApplied > 1 ? ` (${result.multiplierApplied}x accelerator applied)` : ''
            toast.success(`Recorded spend and awarded ${result.pointsEarned} points${multiplierNote}`)

            setOpen(false)
            setAmount('')
            setLocation('tanuki_raw')
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Failed to record spend'
            toast.error(message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button variant="outline" size="sm">
                        <DollarSign className="mr-2 h-4 w-4" />
                        Record Spend
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Record Spend for {userName}</DialogTitle>
                    <DialogDescription>
                        Active point accelerators are applied automatically.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label>Location</Label>
                        <Select value={location} onValueChange={setLocation}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select location" />
                            </SelectTrigger>
                            <SelectContent>
                                {LOCATIONS.map((loc) => (
                                    <SelectItem key={loc.value} value={loc.value}>
                                        {loc.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>Spend Amount</Label>
                        <Input
                            type="number"
                            step="0.01"
                            min="0.01"
                            placeholder="0.00"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            required
                        />
                    </div>

                    <DialogFooter>
                        <Button type="submit" disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save Spend
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
