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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

export default function NewMessagePage() {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [title, setTitle] = useState('')
    const [body, setBody] = useState('')
    const [target, setTarget] = useState('all') // 'all' or 'vip'

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!title || !body) return

        setLoading(true)
        try {
            const res = await broadcastMessage({
                title,
                body,
                targetTier: target === 'vip' ? 1.2 : undefined // Example logic: VIP is 1.2x multiplier
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
                            <Label htmlFor="target">Target Audience</Label>
                            <Select value={target} onValueChange={setTarget}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Members</SelectItem>
                                    <SelectItem value="vip">VIP Members Only (1.2x+)</SelectItem>
                                </SelectContent>
                            </Select>
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
