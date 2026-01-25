'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Save } from "lucide-react"
import { createCampaign } from '@/app/actions/email-campaign-actions'
import { toast } from 'sonner'
import dynamic from 'next/dynamic'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

const EmailEditor = dynamic(() => import('@/components/admin/email/email-editor').then(mod => mod.EmailEditor), {
    ssr: false,
    loading: () => <div className="h-[500px] bg-slate-50 border rounded-lg animate-pulse" />
})

export default function NewCampaignPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [title, setTitle] = useState('')
    const [subject, setSubject] = useState('')
    const [targetAudience, setTargetAudience] = useState('all')
    const [htmlContent, setHtmlContent] = useState('')

    // Default initial content
    const [initialContent] = useState(`
        <h2>Hello there,</h2>
        <p>This is the start of something beautiful.</p>
        <p>Feel free to add images or format this text!</p>
    `)

    const handleSave = async () => {
        if (!title || !subject) {
            toast.error('Please fill in title and subject')
            return
        }

        setLoading(true)
        try {
            await createCampaign({
                title,
                subject,
                target_audience: targetAudience,
                html_content: htmlContent || initialContent
            })
            toast.success('Campaign created successfully')
            router.push('/admin/emails')
        } catch (error: any) {
            toast.error(error.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="space-y-6 max-w-5xl mx-auto h-[calc(100vh-4rem)] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between shrink-0">
                <div className="flex items-center gap-4">
                    <Link href="/admin/emails">
                        <Button variant="ghost" size="icon">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">New Campaign</h1>
                        <p className="text-muted-foreground hidden sm:block">
                            Draft your email newsletter.
                        </p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Link href="/admin/emails">
                        <Button variant="ghost">Cancel</Button>
                    </Link>
                    <Button onClick={handleSave} disabled={loading}>
                        <Save className="mr-2 h-4 w-4" />
                        {loading ? 'Saving...' : 'Save Draft'}
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
                        <Label htmlFor="target">Target Audience</Label>
                        <Select value={targetAudience} onValueChange={setTargetAudience}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Members</SelectItem>
                                <SelectItem value="vip">VIP Members Only (1.2x+)</SelectItem>
                            </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">Who receives this campaign?</p>
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
                        content={initialContent}
                        onChange={setHtmlContent}
                    />
                </div>
            </div>
        </div>
    )
}
