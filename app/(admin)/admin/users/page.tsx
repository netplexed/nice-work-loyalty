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
import { NiceAdjustmentDialog } from '@/components/admin/users/nice-adjustment-dialog'
import { SpendAdjustmentDialog } from '@/components/admin/users/spend-adjustment-dialog'
import { TierAdjustmentDialog } from '@/components/admin/users/tier-adjustment-dialog'
import { GiveRewardDialog } from '@/components/admin/give-reward-dialog'
import { DeleteUserButton } from '@/components/admin/users/delete-user-button'
import { Card, CardContent } from '@/components/ui/card'

import { UserSearch } from '@/components/admin/users/user-search'
import { CreateUserDialog } from '@/components/admin/users/create-user-dialog'
import { ViewProfileButton } from '@/components/admin/users/view-profile-button'

type AdminUserRow = {
    id: string
    full_name: string | null
    email: string | null
    tier: string
    points_balance: number
    total_spent: number | null
    nice_accounts?: {
        nice_collected_balance?: number | null
    } | null
}

export default async function UsersPage(props: {
    searchParams: Promise<{
        query?: string
        page?: string
    }>
}) {
    const searchParams = await props.searchParams
    const query = searchParams?.query || ''
    const currentPage = Number(searchParams?.page) || 1

    const { users, total } = await getAllUsers(currentPage, 20, query)

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Users</h1>
                    <p className="text-muted-foreground">Manage your customer base ({total} total)</p>
                </div>
                <div className="flex items-center gap-4">
                    <UserSearch />
                    <CreateUserDialog />
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
                                <TableHead className="text-right">Nice</TableHead>
                                <TableHead className="text-right">Spent</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {users.map((user: AdminUserRow) => {
                                const userLabel = user.full_name || user.email || user.id

                                return (
                                    <TableRow key={user.id}>
                                        <TableCell className="font-medium">
                                            <ViewProfileButton userId={user.id} userName={user.full_name || 'Unnamed User'} />
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
                                        <TableCell className="text-right font-mono font-bold text-amber-600">
                                            {user.nice_accounts?.nice_collected_balance || 0}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            ${user.total_spent}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex flex-wrap justify-end gap-2">
                                                <SpendAdjustmentDialog
                                                    userId={user.id}
                                                    userName={userLabel}
                                                />
                                                <PointsAdjustmentDialog
                                                    userId={user.id}
                                                    userName={userLabel}
                                                    currentBalance={user.points_balance}
                                                />
                                                <NiceAdjustmentDialog
                                                    userId={user.id}
                                                    userName={userLabel}
                                                    currentBalance={user.nice_accounts?.nice_collected_balance || 0}
                                                />
                                                <TierAdjustmentDialog
                                                    userId={user.id}
                                                    userName={userLabel}
                                                    currentTier={user.tier}
                                                />
                                                <GiveRewardDialog
                                                    userId={user.id}
                                                    userName={userLabel}
                                                />
                                                <DeleteUserButton
                                                    userId={user.id}
                                                    userLabel={userLabel}
                                                />
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )
                            })}
                            {users.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
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
