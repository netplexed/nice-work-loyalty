'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { adjustPoints } from '@/app/actions/admin-actions'
import { toast } from 'sonner'
import { Loader2, Plus, Minus } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface PointsAdjustmentDialogProps {
    userId: string
    userName: string
    currentBalance: number
    trigger?: React.ReactNode
}

export function PointsAdjustmentDialog({ userId, userName, currentBalance, trigger }: PointsAdjustmentDialogProps) {
    const [open, setOpen] = useState(false)
    const [amount, setAmount] = useState('')
    const [reason, setReason] = useState('')
    const [location, setLocation] = useState('')
    const [loading, setLoading] = useState(false)
    const [mode, setMode] = useState<'add' | 'subtract'>('add')

    // Hardcoded locations for now - ideally fetch from constants or DB
    const LOCATIONS = [
        "Tanuki Raw",
        "Standing Sushi Bar"
    ]

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            const finalAmount = mode === 'add' ? parseInt(amount) : -parseInt(amount)
            if (isNaN(finalAmount)) throw new Error('Invalid amount')

            await adjustPoints(userId, finalAmount, reason || 'Manual adjustment', location)

            toast.success('Points adjusted successfully')
            setOpen(false)
            setAmount('')
            setReason('')
            setLocation('')
        } catch (error: any) {
            toast.error(error.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || <Button variant="outline" size="sm">Adjust Points</Button>}
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Adjust Points for {userName}</DialogTitle>
                    <DialogDescription>
                        Current Balance: <strong>{currentBalance}</strong>
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="flex gap-2 justify-center">
                        <Button
                            type="button"
                            variant={mode === 'add' ? 'default' : 'outline'}
                            onClick={() => setMode('add')}
                            className="w-1/2"
                        >
                            <Plus className="mr-2 h-4 w-4" /> Add
                        </Button>
                        <Button
                            type="button"
                            variant={mode === 'subtract' ? 'destructive' : 'outline'}
                            onClick={() => setMode('subtract')}
                            className="w-1/2"
                        >
                            <Minus className="mr-2 h-4 w-4" /> Subtract
                        </Button>
                    </div>

                    <div className="space-y-2">
                        <Label>Amount</Label>
                        <Input
                            type="number"
                            placeholder="100"
                            value={amount}
                            onChange={e => setAmount(e.target.value)}
                            required
                            min="1"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Reason (Optional)</Label>
                        <Input
                            placeholder="e.g. Refund, Bonus, Correction"
                            value={reason}
                            onChange={e => setReason(e.target.value)}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Location (Optional)</Label>
                        <Select value={location} onValueChange={setLocation}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select location" />
                            </SelectTrigger>
                            <SelectContent>
                                {LOCATIONS.map(loc => (
                                    <SelectItem key={loc} value={loc}>{loc}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <DialogFooter>
                        <Button type="submit" disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Confirm Adjustment
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
