'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { getAutomations, toggleAutomation } from '@/app/actions/automation-actions'
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Edit, Zap, Calendar, UserPlus, Timer, Trophy } from 'lucide-react'
import { toast } from 'sonner'
import { CreateAutomationDialog } from '@/components/admin/automations/create-automation-dialog'

export default function AutomationsPage() {
    const [automations, setAutomations] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        loadData()
    }, [])

    const loadData = () => {
        getAutomations()
            .then(setAutomations)
            .finally(() => setLoading(false))
    }

    const handleToggle = async (id: string, current: boolean) => {
        // Optimistic update
        setAutomations(prev => prev.map(a => a.id === id ? { ...a, active: !current } : a))
        try {
            await toggleAutomation(id, !current)
            toast.success(current ? 'Automation disabled' : 'Automation enabled')
        } catch (e) {
            toast.error('Failed to update')
            loadData() // Revert
        }
    }

    const getIcon = (type: string) => {
        switch (type) {
            case 'welcome': return <UserPlus className="w-5 h-5 text-green-500" />
            case 'birthday': return <Calendar className="w-5 h-5 text-purple-500" />
            case 'win_back': return <Timer className="w-5 h-5 text-orange-500" />
            case 'milestone': return <Trophy className="w-5 h-5 text-yellow-500" />
            default: return <Zap className="w-5 h-5 text-blue-500" />
        }
    }

    if (loading) return <div className="p-8">Loading...</div>

    return (
        <div className="p-8 max-w-5xl mx-auto space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Automations</h1>
                    <p className="text-muted-foreground">Manage automated lifecycle emails and rewards.</p>
                </div>
                <CreateAutomationDialog />
            </div>

            <div className="grid gap-6">
                {automations.map(auto => (
                    <Card key={auto.id}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <div className="flex items-center gap-4">
                                <div className="p-2 bg-slate-100 rounded-lg">
                                    {getIcon(auto.type)}
                                </div>
                                <div>
                                    <CardTitle className="text-lg">{auto.name}</CardTitle>
                                    <CardDescription>
                                        {auto.type === 'welcome' && 'Triggers when a new user registers'}
                                        {auto.type === 'birthday' && 'Triggers on the birthday month'}
                                        {auto.type === 'win_back' && `Triggers after ${auto.trigger_settings?.days_inactive || 30} days of inactivity`}
                                        {auto.type === 'milestone' && `Triggers after ${auto.trigger_settings?.visits_required || 5} visits`}
                                    </CardDescription>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2">
                                    <span className={`text-sm font-medium ${auto.active ? 'text-green-600' : 'text-slate-500'}`}>
                                        {auto.active ? 'Active' : 'Inactive'}
                                    </span>
                                    <Switch
                                        checked={auto.active}
                                        onCheckedChange={() => handleToggle(auto.id, auto.active)}
                                    />
                                </div>
                                <Link href={`/admin/automations/${auto.id}`}>
                                    <Button variant="outline" size="sm">
                                        <Edit className="w-4 h-4 mr-2" />
                                        Edit
                                    </Button>
                                </Link>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="flex gap-4 mt-2 text-sm text-slate-600">
                                <div className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded">
                                    <span className="font-semibold">Subject:</span> {auto.email_subject}
                                </div>
                                {auto.rewards?.name && (
                                    <div className="flex items-center gap-1 bg-green-50 px-2 py-1 rounded text-green-700">
                                        <span className="font-semibold">Reward:</span> {auto.rewards.name}
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    )
}
