'use client'

import { useState, useTransition, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
import { Loader2, Plus } from 'lucide-react'
import { createLotteryDrawingAdmin } from '@/app/actions/admin-lottery-actions'
import { getAvailableRewards } from '@/app/actions/rewards-actions'
import { toast } from 'sonner'

export function CreateLotteryDialog() {
    const [open, setOpen] = useState(false)
    const [isPending, startTransition] = useTransition()

    // Prize Config
    const [prizeType, setPrizeType] = useState<'nice' | 'reward' | 'points'>('nice')
    const [niceDescription, setNiceDescription] = useState('Weekly 1000 Nice Prize')
    const [niceValue, setNiceValue] = useState('1000')
    const [rewards, setRewards] = useState<any[]>([])
    const [selectedRewardId, setSelectedRewardId] = useState('')
    const [rewardDescription, setRewardDescription] = useState('')

    // Date Config
    const [drawDate, setDrawDate] = useState('')

    // Auto Entry Config
    const [autoEntryEnabled, setAutoEntryEnabled] = useState(false)
    const [autoEntryType, setAutoEntryType] = useState('all') // 'all' | 'recent_visit'
    const [autoEntryDays, setAutoEntryDays] = useState('60')
    const [autoEntryQuantity, setAutoEntryQuantity] = useState('1')

    useEffect(() => {
        if (open && prizeType === 'reward' && rewards.length === 0) {
            getAvailableRewards().then(setRewards)
        }
    }, [open, prizeType, rewards.length])

    const handleRewardChange = (id: string) => {
        setSelectedRewardId(id)
        const reward = rewards.find(r => r.id === id)
        if (reward) {
            setRewardDescription(reward.name)
        }
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()

        if (!drawDate) {
            toast.error('Please select a draw date')
            return
        }

        const dateObj = new Date(drawDate)
        if (dateObj < new Date()) {
            toast.error('Draw date must be in the future')
            return
        }

        const description = (prizeType === 'nice' || prizeType === 'points') ? niceDescription : rewardDescription
        const value = (prizeType === 'nice' || prizeType === 'points') ? parseInt(niceValue) : 0

        if (!description) {
            toast.error('Please enter a prize description')
            return
        }

        if (prizeType === 'reward' && !selectedRewardId) {
            toast.error('Please select a reward')
            return
        }

        const autoEntryConfig = autoEntryEnabled ? {
            type: autoEntryType,
            days: autoEntryType === 'recent_visit' ? parseInt(autoEntryDays) : undefined,
            quantity: parseInt(autoEntryQuantity)
        } : undefined

        startTransition(async () => {
            try {
                await createLotteryDrawingAdmin({
                    prizeDescription: description,
                    prizeValue: value,
                    drawDate: dateObj.toISOString(),
                    prizeType,
                    rewardId: prizeType === 'reward' ? selectedRewardId : undefined,
                    autoEntryConfig
                })
                toast.success('Lottery drawing created successfully')
                setOpen(false)
            } catch (error: any) {
                toast.error('Failed to create lottery: ' + error.message)
            }
        })
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    New Drawing
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>Create New Lottery</DialogTitle>
                        <DialogDescription>
                            Set the prize, schedule, and entry rules.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="py-4 space-y-4">
                        {/* Prize Section */}
                        <Tabs value={prizeType} onValueChange={(v) => setPrizeType(v as 'nice' | 'reward' | 'points')}>
                            <TabsList className="grid w-full grid-cols-3">
                                <TabsTrigger value="nice">Nice Points</TabsTrigger>
                                <TabsTrigger value="points">Loyalty Points</TabsTrigger>
                                <TabsTrigger value="reward">Product Reward</TabsTrigger>
                            </TabsList>

                            <div className="pt-4 space-y-4">
                                {prizeType === 'nice' && (
                                    <>
                                        <div className="grid grid-cols-4 items-center gap-4">
                                            <Label htmlFor="nice-desc" className="text-right">Description</Label>
                                            <Input
                                                id="nice-desc"
                                                value={niceDescription}
                                                onChange={(e) => setNiceDescription(e.target.value)}
                                                className="col-span-3"
                                            />
                                        </div>
                                        <div className="grid grid-cols-4 items-center gap-4">
                                            <Label htmlFor="nice-val" className="text-right">Amount</Label>
                                            <Input
                                                id="nice-val"
                                                type="number"
                                                value={niceValue}
                                                onChange={(e) => setNiceValue(e.target.value)}
                                                className="col-span-3"
                                            />
                                        </div>
                                    </>
                                )}

                                {prizeType === 'points' && (
                                    <>
                                        <div className="grid grid-cols-4 items-center gap-4">
                                            <Label htmlFor="points-desc" className="text-right">Description</Label>
                                            <Input
                                                id="points-desc"
                                                value={niceDescription}
                                                onChange={(e) => setNiceDescription(e.target.value)}
                                                className="col-span-3"
                                                placeholder="e.g. 500 Loyalty Points"
                                            />
                                        </div>
                                        <div className="grid grid-cols-4 items-center gap-4">
                                            <Label htmlFor="points-val" className="text-right">Amount</Label>
                                            <Input
                                                id="points-val"
                                                type="number"
                                                value={niceValue}
                                                onChange={(e) => setNiceValue(e.target.value)}
                                                className="col-span-3"
                                            />
                                        </div>
                                    </>
                                )}

                                {prizeType === 'reward' && (
                                    <>
                                        <div className="grid grid-cols-4 items-center gap-4">
                                            <Label className="text-right">Select Reward</Label>
                                            <div className="col-span-3">
                                                <Select value={selectedRewardId} onValueChange={handleRewardChange}>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Choose a reward..." />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {rewards.map((r) => (
                                                            <SelectItem key={r.id} value={r.id}>
                                                                {r.name} ({r.points_cost} Pts)
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-4 items-center gap-4">
                                            <Label htmlFor="reward-desc" className="text-right">Display Name</Label>
                                            <Input
                                                id="reward-desc"
                                                value={rewardDescription}
                                                onChange={(e) => setRewardDescription(e.target.value)}
                                                className="col-span-3"
                                                placeholder="e.g. Free Coffee"
                                            />
                                        </div>
                                    </>
                                )}
                            </div>
                        </Tabs>

                        <Separator />

                        {/* Schedule */}
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="date" className="text-right">Draw Date</Label>
                            <div className="col-span-3">
                                <Input
                                    id="date"
                                    type="datetime-local"
                                    value={drawDate}
                                    onChange={(e) => setDrawDate(e.target.value)}
                                    className="w-full block"
                                />
                            </div>
                        </div>

                        <Separator />

                        {/* Auto Entry Rules */}
                        <div className="space-y-4">
                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="auto-entry"
                                    checked={autoEntryEnabled}
                                    onCheckedChange={(c) => setAutoEntryEnabled(c as boolean)}
                                />
                                <Label htmlFor="auto-entry" className="font-semibold">
                                    Auto-distribute free tickets?
                                </Label>
                            </div>

                            {autoEntryEnabled && (
                                <div className="pl-6 space-y-4 border-l-2 ml-1">
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label className="text-right">Criteria</Label>
                                        <div className="col-span-3">
                                            <Select value={autoEntryType} onValueChange={setAutoEntryType}>
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="all">Every Active User</SelectItem>
                                                    <SelectItem value="recent_visit">Recent Visitors Only</SelectItem>
                                                    <SelectItem value="push_enabled">Users with Push Enabled</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>

                                    {autoEntryType === 'recent_visit' && (
                                        <div className="grid grid-cols-4 items-center gap-4">
                                            <Label htmlFor="days" className="text-right text-xs">Visits in last (days)</Label>
                                            <Input
                                                id="days"
                                                type="number"
                                                value={autoEntryDays}
                                                onChange={(e) => setAutoEntryDays(e.target.value)}
                                                className="col-span-3"
                                            />
                                        </div>
                                    )}

                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="quantity" className="text-right">Quantity</Label>
                                        <Input
                                            id="quantity"
                                            type="number"
                                            value={autoEntryQuantity}
                                            onChange={(e) => setAutoEntryQuantity(e.target.value)}
                                            className="col-span-3"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <DialogFooter>
                        <Button type="submit" disabled={isPending}>
                            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Create Drawing
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
