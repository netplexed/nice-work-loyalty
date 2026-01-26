'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Send } from "lucide-react"
import { broadcastMessage } from '@/app/actions/messaging-actions'
import { toast } from 'sonner'
import { Checkbox } from "@/components/ui/checkbox"
import { SegmentBuilder } from '@/components/admin/segmentation/segment-builder'
import { TargetCriteria } from '@/app/actions/segmentation-actions'

export default function NewMessagePage() {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [title, setTitle] = useState('')
    const [body, setBody] = useState('')
    const [targetSettings, setTargetSettings] = useState<TargetCriteria>({})
    const [sendEmail, setSendEmail] = useState(false)

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!title || !body) return

        setLoading(true)
        try {
            const res = await broadcastMessage({
                title,
                body,
                targetCriteria: targetSettings,
                sendEmail
            })

            if (res.success) {
                toast.success(`Message sent to ${res.sent} users`)
                router.push('/admin/messaging')
            }
        } catch (error: any) {
            toast.error(error.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="space-y-6 max-w-2xl mx-auto">
            <div className="flex items-center gap-4">
                <Link href="/admin/messaging">
                    <Button variant="ghost" size="icon">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">New Message</h1>
                    <p className="text-muted-foreground">
                        Compose a notification to be sent to your members.
                    </p>
                </div>
            </div>

            <Card>
                <CardContent className="pt-6">
                    <form onSubmit={handleSend} className="space-y-6">
                        <div className="space-y-2">
                            <Label>Target Audience</Label>
                            <SegmentBuilder value={targetSettings} onChange={setTargetSettings} />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="title">Title</Label>
                            <Input
                                id="title"
                                placeholder="e.g. Double Points Weekend!"
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                                required
                            />
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="body">Message Body</Label>
                                <Textarea
                                    id="body"
                                    placeholder="Write your message here..."
                                    className="h-32"
                                    value={body}
                                    onChange={e => setBody(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="flex items-center space-x-2 border p-4 rounded-lg bg-slate-50">
                                <Checkbox
                                    id="email"
                                    checked={sendEmail}
                                    onCheckedChange={(checked) => setSendEmail(!!checked)}
                                />
                                <div className="grid gap-1.5 leading-none">
                                    <Label
                                        htmlFor="email"
                                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                    >
                                        Send via Email
                                    </Label>
                                    <p className="text-sm text-muted-foreground">
                                        Also send this message to users' email addresses (if opted in).
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-4">
                            <Link href="/admin/messaging">
                                <Button variant="outline" type="button">Cancel</Button>
                            </Link>
                            <Button type="submit" disabled={loading}>
                                <Send className="mr-2 h-4 w-4" />
                                {loading ? 'Sending...' : 'Send Broadcast'}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
