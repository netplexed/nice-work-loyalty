import { getAdminLotteryDrawings } from '@/app/actions/admin-lottery-actions'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { LotteryManagementButtons, ExecuteDrawingButton } from '@/components/admin/lottery-management'
import { format } from 'date-fns'

const SafeDate = ({ date, fmt = 'MMM d, yyyy' }: { date: string | null | undefined, fmt?: string }) => {
    if (!date) return <span>-</span>
    try {
        return <span>{format(new Date(date), fmt)}</span>
    } catch (e) {
        return <span className="text-red-500 text-xs">Invalid Date</span>
    }
}

export default async function AdminLotteryPage() {
    const drawings = await getAdminLotteryDrawings()

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Lottery Management</h1>
                    <p className="text-muted-foreground mt-2">Manage weekly drawings and view results.</p>
                </div>
                <LotteryManagementButtons />
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Drawing History</CardTitle>
                    <CardDescription>All past and upcoming lottery drawings.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Status</TableHead>
                                <TableHead>Draw Date</TableHead>
                                <TableHead>Prize</TableHead>
                                <TableHead>Entries</TableHead>
                                <TableHead>Players</TableHead>
                                <TableHead>Winner Ticket</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {drawings?.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                        No drawings found. Create one to get started.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                drawings?.map((drawing) => (
                                    <TableRow key={drawing.id}>
                                        <TableCell>
                                            <Badge variant={
                                                drawing.status === 'active' ? 'default' :
                                                    drawing.status === 'drawn' ? 'secondary' :
                                                        drawing.status === 'upcoming' ? 'outline' : 'destructive'
                                            }>
                                                {drawing.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="font-medium"><SafeDate date={drawing.draw_date} /></span>
                                                <span className="text-xs text-muted-foreground"><SafeDate date={drawing.draw_date} fmt="h:mm a" /></span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {drawing.prize_description}
                                            <div className="text-xs text-muted-foreground">{drawing.prize_value} NICE</div>
                                        </TableCell>
                                        <TableCell>{drawing.total_entries}</TableCell>
                                        <TableCell>{drawing.total_participants}</TableCell>
                                        <TableCell className="font-mono text-xs">
                                            {drawing.winning_ticket_number ?? '-'}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {drawing.status === 'active' && (
                                                <ExecuteDrawingButton drawingId={drawing.id} />
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    )
}
