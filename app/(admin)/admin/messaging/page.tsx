import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, MessageSquare } from "lucide-react"
import { getBroadcasts } from '@/app/actions/messaging-actions'
import { DeleteBroadcastButton } from '@/components/admin/messaging/delete-broadcast-button'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"

export default async function MessagingPage() {
    const broadcasts = await getBroadcasts()

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Messaging</h1>
                    <p className="text-muted-foreground mt-2">
                        Broadcast announcements to your members.
                    </p>
                </div>
                <Link href="/admin/messaging/new">
                    <Button>
                        <Plus className="mr-2 h-4 w-4" />
                        New Message
                    </Button>
                </Link>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <MessageSquare className="h-5 w-5" />
                        Sent Messages
                    </CardTitle>
                    <CardDescription>
                        History of broadcasts sent to users.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Title</TableHead>
                                <TableHead>Target</TableHead>
                                <TableHead className="text-right">Recipients</TableHead>
                                <TableHead className="text-right w-[80px]">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {broadcasts.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                                        No messages sent yet.
                                    </TableCell>
                                </TableRow>
                            )}
                            {broadcasts.map((msg: any) => (
                                <TableRow key={msg.id}>
                                    <TableCell className="whitespace-nowrap">
                                        {new Date(msg.created_at).toLocaleDateString()}
                                    </TableCell>
                                    <TableCell className="font-medium">{msg.title}</TableCell>
                                    <TableCell>
                                        {msg.target_criteria?.tier
                                            ? `VIP Tier ${msg.target_criteria.tier}+`
                                            : 'All Users'}
                                    </TableCell>
                                    <TableCell className="text-right">{msg.sent_count}</TableCell>
                                    <TableCell className="text-right">
                                        <DeleteBroadcastButton id={msg.id} title={msg.title} />
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    )
}
