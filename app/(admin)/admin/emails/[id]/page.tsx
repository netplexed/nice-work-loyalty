'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Send, Mail, Users, CheckCircle, RotateCcw } from "lucide-react"
import { getCampaign, sendCampaign } from '@/app/actions/email-campaign-actions'
import { toast } from 'sonner'
import { format } from 'date-fns'

export default function CampaignDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter()
    const { id } = React.use(params)
    const [campaign, setCampaign] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [sending, setSending] = useState(false)

    useEffect(() => {
        getCampaign(id).then(c => {
            setCampaign(c)
            setLoading(false)
        }).catch(() => setLoading(false))
    }, [id])

    const handleSend = async () => {
        if (!confirm('Are you sure you want to send this campaign to ALL subscribed users?')) return

        setSending(true)
        try {
            const res = await sendCampaign(id)
            if (res.success) {
                toast.success(`Campaign sent to ${res.count} recipients!`)
                // Refresh data
                const updated = await getCampaign(id)
                setCampaign(updated)
            }
        } catch (error: any) {
            toast.error(error.message)
        } finally {
            setSending(false)
        }
    }

    if (loading) return <div className="p-8">Loading...</div>
    if (!campaign) return <div className="p-8">Campaign not found</div>

    return (
        <div className="space-y-6 max-w-5xl mx-auto pb-12">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/admin/emails">
                        <Button variant="ghost" size="icon">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    </Link>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-2xl font-bold tracking-tight">{campaign.title}</h1>
                            <StatusBadge status={campaign.status} />
                        </div>
                        <p className="text-muted-foreground">
                            Subject: <span className="text-foreground font-medium">{campaign.subject}</span>
                        </p>
                    </div>
                </div>

                {campaign.status === 'draft' && (
                    <div className="flex gap-2">
                        <Link href={`/admin/emails/${id}/edit`}>
                            <Button variant="outline">Edit</Button>
                        </Link>
                        <Button onClick={handleSend} disabled={sending}>
                            <Send className="mr-2 h-4 w-4" />
                            {sending ? 'Sending...' : 'Send Now'}
                        </Button>
                    </div>
                )}
            </div>

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Status</CardTitle>
                        <RotateCcw className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold capitalize">{campaign.status}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Recipients</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{campaign.recipient_count || '-'}</div>
                        <p className="text-xs text-muted-foreground capitalize">
                            Target: {campaign.target_audience === 'vip' ? 'VIP Only' : 'All Members'}
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Sent</CardTitle>
                        <Mail className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{campaign.sent_count || '-'}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Sent Date</CardTitle>
                        <CheckCircle className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-sm">
                            {campaign.sent_at ? format(new Date(campaign.sent_at), 'PPP p') : '-'}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Preview */}
            <Card className="overflow-hidden">
                <CardHeader className="bg-slate-50 border-b">
                    <CardTitle>Email Preview</CardTitle>
                    <CardDescription>This is how the email content looks.</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    <div
                        className="prose max-w-none p-8 min-h-[400px]"
                        dangerouslySetInnerHTML={{ __html: campaign.html_content }}
                    />
                </CardContent>
            </Card>
        </div>
    )
}

function StatusBadge({ status }: { status: string }) {
    switch (status) {
        case 'draft':
            return <Badge variant="secondary">Draft</Badge>
        case 'sending':
            return <Badge className="bg-blue-500">Sending</Badge>
        case 'sent':
            return <Badge className="bg-green-500">Sent</Badge>
        case 'failed':
            return <Badge variant="destructive">Failed</Badge>
        default:
            return <Badge variant="outline">{status}</Badge>
    }
}
