'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { adjustNice } from '@/app/actions/admin-actions'
import { toast } from 'sonner'
import { Loader2, Plus, Minus, Sparkles } from 'lucide-react'

interface NiceAdjustmentDialogProps {
    userId: string
    userName: string
    currentBalance: number
    trigger?: React.ReactNode
}

export function NiceAdjustmentDialog({ userId, userName, currentBalance, trigger }: NiceAdjustmentDialogProps) {
    const [open, setOpen] = useState(false)
    const [amount, setAmount] = useState('')
    const [reason, setReason] = useState('')
    const [loading, setLoading] = useState(false)
    const [mode, setMode] = useState<'add' | 'subtract'>('add')

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            const finalAmount = mode === 'add' ? parseInt(amount) : -parseInt(amount)
            if (isNaN(finalAmount)) throw new Error('Invalid amount')

            await adjustNice(userId, finalAmount, reason || 'Manual adjustment')

            toast.success('Nice balance adjusted successfully')
            setOpen(false)
            setAmount('')
            setReason('')
        } catch (error: any) {
            console.error(error)
            toast.error(error.message || 'Failed to adjust balance')
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || <Button variant="outline" size="sm">Adjust Nice</Button>}
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Sparkles className="text-amber-500" size={18} />
                        Adjust Nice for {userName}
                    </DialogTitle>
                    <DialogDescription>
                        Current Balance: <strong className="font-mono text-amber-600">{currentBalance} Nice</strong>
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="flex gap-2 justify-center">
                        <Button
                            type="button"
                            variant={mode === 'add' ? 'default' : 'outline'}
                            onClick={() => setMode('add')}
                            className={`w-1/2 ${mode === 'add' ? 'bg-amber-500 hover:bg-amber-600' : ''}`}
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
                            placeholder="10"
                            value={amount}
                            onChange={e => setAmount(e.target.value)}
                            required
                            min="1"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Reason (Optional)</Label>
                        <Input
                            placeholder="e.g. Compensation, Bonus, Correction"
                            value={reason}
                            onChange={e => setReason(e.target.value)}
                        />
                    </div>

                    <DialogFooter>
                        <Button type="submit" disabled={loading} className={mode === 'add' ? 'bg-amber-600 hover:bg-amber-700' : ''}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Confirm Adjustment
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
