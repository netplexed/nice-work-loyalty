'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ArrowLeft, Save } from "lucide-react"
import { createEmailTemplate, updateEmailTemplate } from '@/app/actions/email-template-actions'
import { toast } from 'sonner'
import dynamic from 'next/dynamic'

const EmailEditor = dynamic(() => import('@/components/admin/email/email-editor').then(mod => mod.EmailEditor), {
    ssr: false,
    loading: () => <div className="h-[500px] bg-slate-50 border rounded-lg animate-pulse" />
})

interface TemplateFormProps {
    initialData?: {
        id: string
        name: string
        description: string | null
        subject: string | null
        content_html: string | null
        design_json: any
    }
}

export function TemplateForm({ initialData }: TemplateFormProps) {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [name, setName] = useState(initialData?.name || '')
    const [description, setDescription] = useState(initialData?.description || '')
    const [subject, setSubject] = useState(initialData?.subject || '')
    const [htmlContent, setHtmlContent] = useState(initialData?.content_html || '')

    // Default initial content
    const defaultContent = `
        <h2>Hello there,</h2>
        <p>Start designing your template here.</p>
    `

    const handleSave = async () => {
        if (!name) {
            toast.error('Please enter a template name')
            return
        }

        setLoading(true)
        const formData = new FormData()
        formData.append('name', name)
        formData.append('description', description)
        formData.append('subject', subject)
        formData.append('content_html', htmlContent || defaultContent)
        // We aren't fully using design_json yet with the current simple editor, but keeping the field structure ready
        formData.append('design_json', '{}')

        try {
            if (initialData) {
                await updateEmailTemplate(initialData.id, formData)
                toast.success('Template updated')
            } else {
                await createEmailTemplate(formData)
                toast.success('Template created')
            }
        } catch (error: any) {
            toast.error(error.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="space-y-6 max-w-6xl mx-auto h-[calc(100vh-4rem)] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between shrink-0">
                <div className="flex items-center gap-4">
                    <Link href="/admin/marketing/templates">
                        <Button variant="ghost" size="icon">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">
                            {initialData ? 'Edit Template' : 'New Template'}
                        </h1>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Link href="/admin/marketing/templates">
                        <Button variant="ghost">Cancel</Button>
                    </Link>
                    <Button onClick={handleSave} disabled={loading}>
                        <Save className="mr-2 h-4 w-4" />
                        {loading ? 'Saving...' : 'Save Template'}
                    </Button>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 overflow-hidden">
                {/* Left: Metadata */}
                <div className="lg:col-span-1 space-y-4 shrink-0 overflow-y-auto pr-2">
                    <div className="space-y-2">
                        <Label htmlFor="name">Template Name</Label>
                        <Input
                            id="name"
                            placeholder="e.g. Welcome Series Email 1"
                            value={name}
                            onChange={e => setName(e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">Internal name for identifying this template.</p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                            id="description"
                            placeholder="Describe the purpose of this template..."
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            rows={3}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="subject">Default Subject Line</Label>
                        <Input
                            id="subject"
                            placeholder="Subject line..."
                            value={subject}
                            onChange={e => setSubject(e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">This can be overridden when using the template.</p>
                    </div>
                </div>

                {/* Right: Editor */}
                <div className="lg:col-span-2 flex flex-col overflow-hidden h-full pb-6">
                    <Label className="mb-2">Email Content</Label>
                    <EmailEditor
                        content={htmlContent || defaultContent}
                        onChange={setHtmlContent}
                    />
                </div>
            </div>
        </div>
    )
}
