'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { format } from 'date-fns'
import { FileText, Send, CheckCircle, AlertCircle } from 'lucide-react'
import Link from 'next/link'

export function CampaignList({ initialCampaigns }: { initialCampaigns: any[] }) {
    if (initialCampaigns.length === 0) {
        return (
            <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                    <FileText className="w-12 h-12 mb-4 opacity-50" />
                    <p className="text-lg font-medium">No campaigns yet</p>
                    <p className="text-sm">Create your first newsletter to engage with your customers.</p>
                </CardContent>
            </Card>
        )
    }

    return (
        <div className="grid gap-4">
            {initialCampaigns.map((campaign) => (
                <Link key={campaign.id} href={`/admin/emails/${campaign.id}`}>
                    <Card className="hover:bg-slate-50 transition-colors cursor-pointer">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <div className="space-y-1">
                                <CardTitle className="text-base font-semibold">
                                    {campaign.title}
                                </CardTitle>
                                <CardDescription>
                                    Subject: {campaign.subject}
                                </CardDescription>
                            </div>
                            <div className="flex items-center gap-2">
                                <StatusBadge status={campaign.status} />
                                <span className="text-xs text-muted-foreground">
                                    {format(new Date(campaign.created_at), 'MMM d, yyyy')}
                                </span>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="flex gap-4 text-sm text-muted-foreground">
                                <div>
                                    <span className="font-medium text-foreground">{campaign.recipient_count || 0}</span> recipients
                                </div>
                                <div className="border-l pl-4">
                                    <span className="font-medium text-foreground">{campaign.sent_count || 0}</span> sent
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </Link>
            ))}
        </div>
    )
}

function StatusBadge({ status }: { status: string }) {
    switch (status) {
        case 'draft':
            return <Badge variant="secondary"><FileText className="w-3 h-3 mr-1" /> Draft</Badge>
        case 'sending':
            return <Badge className="bg-blue-500"><Send className="w-3 h-3 mr-1 animate-pulse" /> Sending</Badge>
        case 'sent':
            return <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" /> Sent</Badge>
        case 'failed':
            return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" /> Failed</Badge>
        default:
            return <Badge variant="outline">{status}</Badge>
    }
}
