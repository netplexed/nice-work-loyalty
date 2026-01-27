'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { ArrowLeft, Save, Plus, Trash2, Clock, Mail, Gift, ArrowDown } from "lucide-react"
import { createMarketingWorkflow, updateMarketingWorkflow } from '@/app/actions/workflow-actions'
import { toast } from 'sonner'

interface WorkflowBuilderProps {
    initialData?: any
    emailTemplates: any[]
    rewards: any[]
}

type StepType = 'delay' | 'email' | 'reward'

interface WorkflowStep {
    id: string
    type: StepType
    config: any
}

export function WorkflowBuilder({ initialData, emailTemplates, rewards }: WorkflowBuilderProps) {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [name, setName] = useState(initialData?.name || '')
    const [description, setDescription] = useState(initialData?.description || '')
    const [triggerType, setTriggerType] = useState(initialData?.trigger_type || 'event')
    const [triggerEvent, setTriggerEvent] = useState(initialData?.trigger_config?.event || 'order.completed')

    // Parse steps carefully
    const [steps, setSteps] = useState<WorkflowStep[]>(
        Array.isArray(initialData?.steps) ? initialData.steps : []
    )

    const handleAddStep = (type: StepType) => {
        const newStep: WorkflowStep = {
            id: Math.random().toString(36).substring(7),
            type,
            config: {}
        }
        setSteps([...steps, newStep])
    }

    const handleRemoveStep = (index: number) => {
        const newSteps = [...steps]
        newSteps.splice(index, 1)
        setSteps(newSteps)
    }

    const handleUpdateStepConfig = (index: number, key: string, value: any) => {
        const newSteps = [...steps]
        newSteps[index].config = { ...newSteps[index].config, [key]: value }
        setSteps(newSteps)
    }

    const handleSave = async () => {
        if (!name) {
            toast.error('Please enter a workflow name')
            return
        }

        setLoading(true)
        const formData = new FormData()
        formData.append('name', name)
        formData.append('description', description)
        formData.append('trigger_type', triggerType)
        formData.append('trigger_config', JSON.stringify({ event: triggerEvent }))
        formData.append('steps', JSON.stringify(steps))
        formData.append('active', initialData?.active !== undefined ? String(initialData.active) : 'false') // Keep existing status or default false

        try {
            if (initialData) {
                await updateMarketingWorkflow(initialData.id, formData)
                toast.success('Workflow updated')
            } else {
                await createMarketingWorkflow(formData)
                toast.success('Workflow created')
            }
        } catch (error: any) {
            toast.error(error.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="space-y-6 max-w-5xl mx-auto pb-20">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/admin/marketing/workflows">
                        <Button variant="ghost" size="icon">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">
                            {initialData ? 'Edit Workflow' : 'New Workflow'}
                        </h1>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Link href="/admin/marketing/workflows">
                        <Button variant="ghost">Cancel</Button>
                    </Link>
                    <Button onClick={handleSave} disabled={loading}>
                        <Save className="mr-2 h-4 w-4" />
                        {loading ? 'Saving...' : 'Save Workflow'}
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left: General Settings & Trigger */}
                <div className="lg:col-span-1 space-y-6">
                    <Card>
                        <CardContent className="pt-6 space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Workflow Name</Label>
                                <Input
                                    id="name"
                                    placeholder="e.g. Post-Purchase Series"
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="description">Description</Label>
                                <Textarea
                                    id="description"
                                    placeholder="What does this workflow do?"
                                    value={description}
                                    onChange={e => setDescription(e.target.value)}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-indigo-200 bg-indigo-50/30">
                        <CardContent className="pt-6 space-y-4">
                            <div className="flex items-center gap-2 mb-2">
                                <div className="p-2 bg-indigo-100 rounded-full text-indigo-600">
                                    <Clock className="h-4 w-4" />
                                </div>
                                <h3 className="font-semibold text-indigo-900">Trigger</h3>
                            </div>

                            <div className="space-y-2">
                                <Label>When this happens...</Label>
                                <Select value={triggerType} onValueChange={setTriggerType}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="event">Event Occurs</SelectItem>
                                        {/* <SelectItem value="schedule">Schedule (Coming Soon)</SelectItem> */}
                                    </SelectContent>
                                </Select>
                            </div>

                            {triggerType === 'event' && (
                                <div className="space-y-2">
                                    <Label>Event Name</Label>
                                    <Select value={triggerEvent} onValueChange={setTriggerEvent}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="order.completed">Order Completed</SelectItem>
                                            <SelectItem value="user.signup">User Signup</SelectItem>
                                            <SelectItem value="app.opened">App Opened</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Right: Steps Builder */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold">Workflow Steps</h3>

                        {steps.length === 0 && (
                            <div className="text-center py-10 border-2 border-dashed rounded-lg text-muted-foreground bg-slate-50">
                                <p>No steps yet. Add one below!</p>
                            </div>
                        )}

                        {steps.map((step, index) => (
                            <div key={step.id} className="relative group">
                                {index > 0 && (
                                    <div className="absolute -top-5 left-8 flex justify-center w-0.5 h-4 bg-slate-300">
                                        <ArrowDown className="h-3 w-3 text-slate-400 -ml-1.5 mt-1" />
                                    </div>
                                )}

                                <Card className="relative hover:shadow-md transition-shadow">
                                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button variant="ghost" size="icon" onClick={() => handleRemoveStep(index)} className="text-red-500 hover:text-red-600 hover:bg-red-50">
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>

                                    <CardContent className="pt-6 flex gap-4">
                                        <div className={`shrink-0 p-3 rounded-full h-12 w-12 flex items-center justify-center 
                                            ${step.type === 'email' ? 'bg-blue-100 text-blue-600' :
                                                step.type === 'delay' ? 'bg-amber-100 text-amber-600' :
                                                    'bg-green-100 text-green-600'}`}>
                                            {step.type === 'email' && <Mail className="h-5 w-5" />}
                                            {step.type === 'delay' && <Clock className="h-5 w-5" />}
                                            {step.type === 'reward' && <Gift className="h-5 w-5" />}
                                        </div>

                                        <div className="flex-1 space-y-3">
                                            <div className="flex items-center gap-2">
                                                <BadgeForType type={step.type} />
                                                <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Step {index + 1}</span>
                                            </div>

                                            {/* Config Fields */}
                                            {step.type === 'delay' && (
                                                <div className="flex items-center gap-2 max-w-xs">
                                                    <Label>Wait for</Label>
                                                    <Input
                                                        type="number"
                                                        className="w-20"
                                                        value={step.config.duration || ''}
                                                        onChange={e => handleUpdateStepConfig(index, 'duration', e.target.value)}
                                                        placeholder="24"
                                                    />
                                                    <span className="text-sm text-muted-foreground">hours</span>
                                                </div>
                                            )}

                                            {step.type === 'email' && (
                                                <div className="space-y-2 max-w-sm">
                                                    <Label>Select Template</Label>
                                                    <Select
                                                        value={step.config.template_id}
                                                        onValueChange={v => handleUpdateStepConfig(index, 'template_id', v)}
                                                    >
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Choose email..." />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {emailTemplates.map(t => (
                                                                <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                    <Input
                                                        placeholder="Override Subject Line (Optional)"
                                                        value={step.config.subject_override || ''}
                                                        onChange={e => handleUpdateStepConfig(index, 'subject_override', e.target.value)}
                                                        className="text-sm"
                                                    />
                                                </div>
                                            )}

                                            {step.type === 'reward' && (
                                                <div className="space-y-2 max-w-sm">
                                                    <Label>Select Reward to Grant</Label>
                                                    <Select
                                                        value={step.config.reward_id}
                                                        onValueChange={v => handleUpdateStepConfig(index, 'reward_id', v)}
                                                    >
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Choose reward..." />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {rewards.map(r => (
                                                                <SelectItem key={r.id} value={r.id}>{r.title} ({r.points_cost} pts)</SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        ))}
                    </div>

                    <div className="flex gap-2 justify-center pt-4">
                        <Button variant="outline" onClick={() => handleAddStep('delay')} className="border-dashed">
                            <Clock className="mr-2 h-4 w-4" />
                            Add Delay
                        </Button>
                        <Button variant="outline" onClick={() => handleAddStep('email')} className="border-dashed">
                            <Mail className="mr-2 h-4 w-4" />
                            Add Email
                        </Button>
                        <Button variant="outline" onClick={() => handleAddStep('reward')} className="border-dashed">
                            <Gift className="mr-2 h-4 w-4" />
                            Add Reward
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    )
}

function BadgeForType({ type }: { type: string }) {
    switch (type) {
        case 'delay': return <span className="bg-amber-100 text-amber-800 text-xs px-2 py-0.5 rounded font-medium">Delay</span>
        case 'email': return <span className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded font-medium">Email</span>
        case 'reward': return <span className="bg-green-100 text-green-800 text-xs px-2 py-0.5 rounded font-medium">Reward</span>
        default: return null
    }
}
