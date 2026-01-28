'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getAutomation, updateAutomation } from '@/app/actions/automation-actions'
import { getAdminRewards } from '@/app/actions/admin-actions'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Save } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from 'sonner'
import dynamic from 'next/dynamic'

const EmailEditor = dynamic(() => import('@/components/admin/email/email-editor').then(mod => mod.EmailEditor), {
    ssr: false,
    loading: () => <div className="h-[400px] bg-slate-50 animate-pulse rounded" />
})

export default function EditAutomationPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = React.use(params)
    const router = useRouter()

    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [automation, setAutomation] = useState<any>(null)
    const [rewards, setRewards] = useState<any[]>([])

    // Form State
    const [subject, setSubject] = useState('')
    const [body, setBody] = useState('')
    const [rewardId, setRewardId] = useState<string>('none')
    const [triggerSettings, setTriggerSettings] = useState<any>({})

    useEffect(() => {
        Promise.all([
            getAutomation(id),
            getAdminRewards()
        ]).then(([auto, rewardList]) => {
            if (auto) {
                setAutomation(auto)
                setSubject(auto.email_subject)
                setBody(auto.email_body || '')
                setRewardId(auto.reward_id || 'none')
                setTriggerSettings(auto.trigger_settings || {})
            }
            setRewards(rewardList || [])
            setLoading(false)
        })
    }, [id])

    const handleSave = async () => {
        if (!subject) return toast.error('Subject is required')

        setSaving(true)
        try {
            await updateAutomation(id, {
                email_subject: subject,
                email_body: body,
                reward_id: rewardId === 'none' ? null : rewardId,
                trigger_settings: triggerSettings
            })
            toast.success('Saved successfully')
            router.push('/admin/automations')
        } catch (e: any) {
            toast.error(e.message)
        } finally {
            setSaving(false)
        }
    }

    if (loading) return <div className="p-8">Loading...</div>
    if (!automation) return <div className="p-8">Automation not found</div>

    return (
        <div className="space-y-6 max-w-5xl mx-auto h-[calc(100vh-4rem)] flex flex-col">
            <div className="flex items-center justify-between shrink-0">
                <div className="flex items-center gap-4">
                    <Link href="/admin/automations">
                        <Button variant="ghost" size="icon">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">{automation.name}</h1>
                        <p className="text-muted-foreground">Configure triggers and content.</p>
                    </div>
                </div>
                <Button onClick={handleSave} disabled={saving}>
                    <Save className="mr-2 h-4 w-4" />
                    {saving ? 'Saving...' : 'Save Changes'}
                </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 overflow-hidden">
                {/* Settings Panel */}
                <div className="lg:col-span-1 space-y-6 overflow-y-auto pr-2">
                    {/* Trigger Settings */}
                    {automation.type === 'win_back' && (
                        <div className="space-y-2 border p-4 rounded-lg bg-orange-50/50">
                            <Label>Inactivity Threshold (Days)</Label>
                            <Input
                                type="number"
                                value={triggerSettings.days_inactive || 30}
                                onChange={e => setTriggerSettings({ ...triggerSettings, days_inactive: parseInt(e.target.value) })}
                            />
                            <p className="text-xs text-muted-foreground">Send if user hasn't visited in this many days.</p>
                        </div>
                    )}

                    {automation.type === 'milestone' && (
                        <div className="space-y-2 border p-4 rounded-lg bg-yellow-50/50">
                            <Label>Visits Required</Label>
                            <Input
                                type="number"
                                value={triggerSettings.visits_required || 5}
                                onChange={e => setTriggerSettings({ ...triggerSettings, visits_required: parseInt(e.target.value) })}
                            />
                            <p className="text-xs text-muted-foreground">Triggers when user reaches this many total visits.</p>
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label>Email Subject</Label>
                        <Input
                            value={subject}
                            onChange={e => setSubject(e.target.value)}
                            placeholder="e.g. Happy Birthday!"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Attach Reward (Optional)</Label>
                        <Select value={rewardId} onValueChange={setRewardId}>
                            <SelectTrigger>
                                <SelectValue placeholder="No Reward" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">No Reward</SelectItem>
                                {rewards.filter(r => r.active).map(r => (
                                    <SelectItem key={r.id} value={r.id}>
                                        {r.name} ({r.points_cost} pts value)
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                            This reward will be automatically added to the user's account when triggered.
                        </p>
                    </div>
                </div>

                {/* Editor Panel */}
                <div className="lg:col-span-2 flex flex-col h-full overflow-hidden pb-6">
                    <Label className="mb-2">Email Content</Label>
                    <EmailEditor content={body} onChange={setBody} />
                </div>
            </div>
        </div>
    )
}
