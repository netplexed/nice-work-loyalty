'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { grantReward } from '@/app/actions/admin-actions-gift'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Loader2, Gift } from 'lucide-react'

interface GiveRewardDialogProps {
    userId: string
    userName: string
    trigger?: React.ReactNode
}

export function GiveRewardDialog({ userId, userName, trigger }: GiveRewardDialogProps) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [rewards, setRewards] = useState<any[]>([])
    const [selectedReward, setSelectedReward] = useState('')
    const [notes, setNotes] = useState('')

    useEffect(() => {
        if (open) {
            loadRewards()
        }
    }, [open])

    const loadRewards = async () => {
        const supabase = createClient()
        const { data } = await supabase.from('rewards').select('id, name, points_cost').eq('active', true)
        if (data) setRewards(data)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!selectedReward) return

        setLoading(true)
        try {
            const result = await grantReward(userId, selectedReward, notes)
            if (result.success) {
                toast.success(`Reward gifted to ${userName}`)
                setOpen(false)
                setNotes('')
                setSelectedReward('')
            } else {
                toast.error(result.error || 'Failed to gift reward')
            }
        } catch (e) {
            toast.error('Something went wrong')
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button variant="outline" size="sm">
                        <Gift className="mr-2 h-4 w-4" /> Gift Reward
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Gift Reward to {userName}</DialogTitle>
                    <DialogDescription>
                        Select a reward to give for free (0 points cost).
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label>Select Reward</Label>
                        <Select value={selectedReward} onValueChange={setSelectedReward}>
                            <SelectTrigger>
                                <SelectValue placeholder="Choose a reward..." />
                            </SelectTrigger>
                            <SelectContent>
                                {rewards.map(r => (
                                    <SelectItem key={r.id} value={r.id}>
                                        {r.name} ({r.points_cost} pts value)
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>Notes (Optional)</Label>
                        <Textarea
                            placeholder="Reason for gift..."
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                        />
                    </div>

                    <DialogFooter>
                        <Button type="submit" disabled={loading || !selectedReward}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Gift Reward
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
