import { getAllUsers } from '@/app/actions/admin-actions'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { PointsAdjustmentDialog } from '@/components/admin/users/points-adjustment-dialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default async function UsersPage() {
    const { users, total } = await getAllUsers()

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Users</h1>
                    <p className="text-muted-foreground">Manage your customer base ({total} total)</p>
                </div>
            </div>

            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Customer</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Tier</TableHead>
                                <TableHead className="text-right">Points</TableHead>
                                <TableHead className="text-right">Spent</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {users.map((user: any) => (
                                <TableRow key={user.id}>
                                    <TableCell className="font-medium">
                                        {user.full_name || 'Unnamed User'}
                                    </TableCell>
                                    <TableCell>{user.email}</TableCell>
                                    <TableCell>
                                        <Badge variant={
                                            user.tier === 'platinum' ? 'default' :
                                                user.tier === 'gold' ? 'secondary' : 'outline'
                                        } className="capitalize">
                                            {user.tier}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right font-mono font-bold">
                                        {user.points_balance}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        ${user.total_spent}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <PointsAdjustmentDialog
                                            userId={user.id}
                                            userName={user.full_name || user.email}
                                            currentBalance={user.points_balance}
                                        />
                                    </TableCell>
                                </TableRow>
                            ))}
                            {users.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                        No users found
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    )
}
