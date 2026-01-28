'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

// Manually defining interface as generated types might lag
interface SpinPrize {
    id?: string
    label: string
    type: 'points' | 'reward' | 'loss'
    points_value: number
    reward_id: string | null
    probability: number
    color: string
    active: boolean
    expiry_hours?: number
}

interface SpinPrizeFormProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    initialData?: SpinPrize
    onSuccess: () => void
}

export function SpinPrizeForm({ open, onOpenChange, initialData, onSuccess }: SpinPrizeFormProps) {
    const [loading, setLoading] = useState(false)
    const [rewards, setRewards] = useState<any[]>([])
    const supabase = createClient()

    const [formData, setFormData] = useState<SpinPrize>({
        label: '',
        type: 'points',
        points_value: 0,
        reward_id: null,
        probability: 0.1,
        color: '#3B82F6',
        active: true,
        expiry_hours: 36
    })

    useEffect(() => {
        if (open) {
            // Fetch rewards for selection
            const fetchRewards = async () => {
                const { data } = await supabase.from('rewards').select('id, name').eq('active', true)
                if (data) setRewards(data)
            }
            fetchRewards()

            if (initialData) {
                setFormData(initialData)
            } else {
                setFormData({
                    label: '',
                    type: 'points',
                    points_value: 0,
                    reward_id: null,
                    probability: 0.1,
                    color: '#3B82F6',
                    active: true,
                    expiry_hours: 36
                })
            }
        }
    }, [open, initialData])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            // Sanitize data: remove joined fields like 'rewards' and metadata
            const { rewards, id, created_at, updated_at, ...cleanFormData } = formData as any

            const dataToSave = {
                ...cleanFormData,
                reward_id: formData.type === 'reward' ? formData.reward_id : null,
                points_value: formData.type === 'points' ? formData.points_value : 0,
                expiry_hours: formData.type === 'reward' ? formData.expiry_hours : null,
            }

            let error;
            if (initialData?.id) {
                const { error: updateError } = await supabase
                    .from('spin_prizes')
                    .update(dataToSave)
                    .eq('id', initialData.id)
                error = updateError
            } else {
                const { error: insertError } = await supabase
                    .from('spin_prizes')
                    .insert(dataToSave)
                error = insertError
            }

            if (error) throw error

            toast.success(initialData ? 'Prize updated' : 'Prize created')
            onSuccess()
            onOpenChange(false)
        } catch (error: any) {
            toast.error(error.message || 'Failed to save prize')
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{initialData ? 'Edit Prize' : 'New Prize Segment'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid gap-2">
                        <Label>Label</Label>
                        <Input
                            value={formData.label}
                            onChange={e => setFormData({ ...formData, label: e.target.value })}
                            placeholder="e.g. 500 Points"
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label>Type</Label>
                            <Select
                                value={formData.type}
                                onValueChange={(v: any) => setFormData({ ...formData, type: v })}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="points">Points</SelectItem>
                                    <SelectItem value="reward">Reward Item</SelectItem>
                                    <SelectItem value="loss">No Prize</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label>Color (Hex)</Label>
                            <div className="flex gap-2">
                                <Input
                                    type="color"
                                    value={formData.color}
                                    onChange={e => setFormData({ ...formData, color: e.target.value })}
                                    className="w-12 p-1"
                                />
                                <Input
                                    value={formData.color}
                                    onChange={e => setFormData({ ...formData, color: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>

                    {formData.type === 'points' && (
                        <div className="grid gap-2">
                            <Label>Points Value</Label>
                            <Input
                                type="number"
                                value={formData.points_value}
                                onChange={e => setFormData({ ...formData, points_value: parseInt(e.target.value) || 0 })}
                            />
                        </div>
                    )}

                    {formData.type === 'reward' && (
                        <div className="grid gap-2">
                            <Label>Reward Item</Label>
                            <Select
                                value={formData.reward_id || ''}
                                onValueChange={(v) => setFormData({ ...formData, reward_id: v })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a reward..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {rewards.map(r => (
                                        <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    {formData.type === 'reward' && (
                        <div className="grid gap-2">
                            <Label>Expiry (Hours)</Label>
                            <Input
                                type="number"
                                value={formData.expiry_hours}
                                onChange={e => setFormData({ ...formData, expiry_hours: parseInt(e.target.value) || 36 })}
                            />
                            <p className="text-xs text-muted-foreground">
                                How long users have to redeem this reward.
                            </p>
                        </div>
                    )}

                    <div className="grid gap-2">
                        <Label>Probability (Relative Weight)</Label>
                        <Input
                            type="number"
                            step="0.01"
                            value={formData.probability}
                            onChange={e => setFormData({ ...formData, probability: parseFloat(e.target.value) || 0 })}
                        />
                        <p className="text-xs text-muted-foreground">
                            Higher number = more likely to land on this segment.
                        </p>
                    </div>

                    <div className="flex justify-end gap-2 pt-4">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                        <Button type="submit" disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    )
}
