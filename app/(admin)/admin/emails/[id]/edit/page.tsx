'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Save } from "lucide-react"
import { updateCampaign, getCampaign } from '@/app/actions/email-campaign-actions'
import { toast } from 'sonner'
import { SegmentBuilder } from '@/components/admin/segmentation/segment-builder'
import { TargetCriteria } from '@/app/actions/segmentation-actions'
import dynamic from 'next/dynamic'

const EmailEditor = dynamic(() => import('@/components/admin/email/email-editor').then(mod => mod.EmailEditor), {
    ssr: false,
    loading: () => <div className="h-[500px] bg-slate-50 border rounded-lg animate-pulse" />
})

export default function EditCampaignPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = React.use(params)
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [title, setTitle] = useState('')
    const [subject, setSubject] = useState('')
    const [targetSettings, setTargetSettings] = useState<TargetCriteria>({})
    const [htmlContent, setHtmlContent] = useState('')

    useEffect(() => {
        getCampaign(id).then(campaign => {
            if (campaign) {
                setTitle(campaign.title)
                setSubject(campaign.subject)
                setTargetSettings(campaign.target_settings || {})
                setHtmlContent(campaign.html_content)
                setLoading(false)
            } else {
                toast.error('Campaign not found')
                router.push('/admin/emails')
            }
        })
    }, [id, router])

    const handleSave = async () => {
        if (!title || !subject) {
            toast.error('Please fill in title and subject')
            return
        }

        setSaving(true)
        try {
            await updateCampaign(id, {
                title,
                subject,
                target_settings: targetSettings,
                html_content: htmlContent
            })
            toast.success('Campaign updated successfully')
            router.push(`/admin/emails/${id}`)
        } catch (error: any) {
            toast.error(error.message)
        } finally {
            setSaving(false)
        }
    }

    if (loading) return <div className="p-8">Loading...</div>

    return (
        <div className="space-y-6 max-w-5xl mx-auto h-[calc(100vh-4rem)] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between shrink-0">
                <div className="flex items-center gap-4">
                    <Link href={`/admin/emails/${id}`}>
                        <Button variant="ghost" size="icon">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Edit Campaign</h1>
                        <p className="text-muted-foreground hidden sm:block">
                            Update your email newsletter.
                        </p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Link href={`/admin/emails/${id}`}>
                        <Button variant="ghost">Cancel</Button>
                    </Link>
                    <Button onClick={handleSave} disabled={saving}>
                        <Save className="mr-2 h-4 w-4" />
                        {saving ? 'Saving...' : 'Save Changes'}
                    </Button>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 overflow-hidden">
                {/* Left: Metadata */}
                <div className="lg:col-span-1 space-y-4 shrink-0 overflow-y-auto pr-2">
                    <div className="space-y-2">
                        <Label htmlFor="title">Internal Title</Label>
                        <Input
                            id="title"
                            placeholder="e.g. June Newsletter"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">Only visible to admins.</p>
                    </div>

                    <div className="space-y-2">
                        <Label>Target Audience</Label>
                        <SegmentBuilder value={targetSettings} onChange={setTargetSettings} />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="subject">Subject Line</Label>
                        <Input
                            id="subject"
                            placeholder="e.g. You won't believe this deal..."
                            value={subject}
                            onChange={e => setSubject(e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">This is what users will see.</p>
                    </div>

                    <div className="bg-blue-50 p-4 rounded-lg text-sm text-blue-800 border border-blue-200">
                        <strong>Tip:</strong> You can drag and drop images directly into the editor on the right!
                    </div>
                </div>

                {/* Right: Editor */}
                <div className="lg:col-span-2 flex flex-col overflow-hidden h-full pb-6">
                    <EmailEditor
                        content={htmlContent}
                        onChange={setHtmlContent}
                    />
                </div>
            </div>
        </div>
    )
}
