'use client'

import React, { useEffect, useState } from 'react'
import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { TargetCriteria, estimateAudienceSize } from '@/app/actions/segmentation-actions'
import { Loader2, Users } from 'lucide-react'
import { useDebounce } from '@/hooks/use-debounce' // Assuming we have one or will make one, actually let's implement debounce inline or simple effect

export function SegmentBuilder({ value, onChange }: { value: TargetCriteria, onChange: (c: TargetCriteria) => void }) {
    const [estimating, setEstimating] = useState(false)
    const [count, setCount] = useState<number | null>(null)

    // Tiers
    const availableTiers = [
        { value: 'bronze', label: 'Hi My Name Is' },
        { value: 'silver', label: 'Good to See You' },
        { value: 'gold', label: 'Local Legend' },
        { value: 'platinum', label: 'Platinum' }
    ]

    // Effect to estimate size when criteria changes
    useEffect(() => {
        const timer = setTimeout(() => {
            fetchEstimate()
        }, 800)
        return () => clearTimeout(timer)
    }, [value])

    const fetchEstimate = async () => {
        setEstimating(true)
        try {
            const c = await estimateAudienceSize(value)
            setCount(c)
        } finally {
            setEstimating(false)
        }
    }

    const updateTier = (tier: string, checked: boolean) => {
        const current = value.tiers || []
        let next: string[]
        if (checked) {
            next = [...current, tier]
        } else {
            next = current.filter(t => t !== tier)
        }
        onChange({ ...value, tiers: next })
    }

    return (
        <div className="space-y-4 border rounded-lg p-4 bg-slate-50">
            <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-sm">Audience Rules</h3>
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground bg-white px-2 py-1 rounded border">
                    <Users className="w-3 h-3" />
                    {estimating ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                        <span>{count !== null ? `${count} matching users` : 'Estimating...'}</span>
                    )}
                </div>
            </div>

            {/* Tiers */}
            <div className="space-y-2">
                <Label className="text-xs">Membership Tiers</Label>
                <div className="flex flex-wrap gap-4">
                    {availableTiers.map(tier => (
                        <div key={tier.value} className="flex items-center space-x-2">
                            <Checkbox
                                id={`tier-${tier.value}`}
                                checked={value.tiers?.includes(tier.value)}
                                onCheckedChange={(c) => updateTier(tier.value, c as boolean)}
                            />
                            <Label htmlFor={`tier-${tier.value}`} className="text-sm font-normal">{tier.label}</Label>
                        </div>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                {/* Last Visit */}
                <div className="space-y-2">
                    <Label className="text-xs">Visited in Last (Days)</Label>
                    <Input
                        type="number"
                        placeholder="e.g. 30"
                        value={value.lastVisitDays || ''}
                        onChange={e => onChange({ ...value, lastVisitDays: e.target.value ? parseInt(e.target.value) : undefined })}
                    />
                </div>

                {/* Min Spend */}
                <div className="space-y-2">
                    <Label className="text-xs">Min Lifetime Spend ($)</Label>
                    <Input
                        type="number"
                        placeholder="e.g. 100"
                        value={value.minSpend || ''}
                        onChange={e => onChange({ ...value, minSpend: e.target.value ? parseFloat(e.target.value) : undefined })}
                    />
                </div>
            </div>

            {/* Birthday */}
            <div className="space-y-2">
                <Label className="text-xs">Birthday Month</Label>
                <Select
                    value={value.birthdayMonth || 'any'}
                    onValueChange={(v) => onChange({ ...value, birthdayMonth: v === 'any' ? undefined : v })}
                >
                    <SelectTrigger>
                        <SelectValue placeholder="Any Month" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="any">Any Month</SelectItem>
                        <SelectItem value="01">January</SelectItem>
                        <SelectItem value="02">February</SelectItem>
                        <SelectItem value="03">March</SelectItem>
                        <SelectItem value="04">April</SelectItem>
                        <SelectItem value="05">May</SelectItem>
                        <SelectItem value="06">June</SelectItem>
                        <SelectItem value="07">July</SelectItem>
                        <SelectItem value="08">August</SelectItem>
                        <SelectItem value="09">September</SelectItem>
                        <SelectItem value="10">October</SelectItem>
                        <SelectItem value="11">November</SelectItem>
                        <SelectItem value="12">December</SelectItem>
                    </SelectContent>
                </Select>
            </div>
        </div>
    )
}
