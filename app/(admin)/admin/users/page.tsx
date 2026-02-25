import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getAllUsers } from '@/app/actions/admin-actions'
import { getCurrentAdminUser, listAdminUsers } from '@/lib/admin/admin-users'
import type { AdminRole } from '@/lib/admin/permissions'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
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
import { AdminStaffPanel, type AdminStaffRow } from '@/components/admin/users/admin-staff-panel'

type MemberUserRow = {
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

type UsersTab = 'members' | 'admin-staff'

function MembersTable({ users }: { users: MemberUserRow[] }) {
    return (
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
                        {users.map((user) => {
                            const userLabel = user.full_name || user.email || user.id

                            return (
                                <TableRow key={user.id}>
                                    <TableCell className="font-medium">
                                        <ViewProfileButton userId={user.id} userName={user.full_name || 'Unnamed User'} />
                                    </TableCell>
                                    <TableCell>{user.email}</TableCell>
                                    <TableCell>
                                        <Badge
                                            variant={
                                                user.tier === 'platinum'
                                                    ? 'default'
                                                    : user.tier === 'gold'
                                                        ? 'secondary'
                                                        : 'outline'
                                            }
                                            className="capitalize"
                                        >
                                            {{
                                                bronze: 'Hi My Name Is',
                                                silver: 'Good to See You',
                                                gold: 'Local Legend',
                                                platinum: 'Platinum',
                                            }[user.tier] || user.tier}
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
    )
}

function UsersTabLink({
    tab,
    activeTab,
    label,
    query,
}: {
    tab: UsersTab
    activeTab: UsersTab
    label: string
    query: string
}) {
    const href = `/admin/users?tab=${tab}${query ? `&query=${encodeURIComponent(query)}` : ''}`

    return (
        <Link
            href={href}
            className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${activeTab === tab
                ? 'bg-indigo-600 text-white'
                : 'bg-white text-slate-700 hover:bg-slate-100'
                }`}
        >
            {label}
        </Link>
    )
}

export default async function UsersPage(props: {
    searchParams: Promise<{
        query?: string
        page?: string
        tab?: UsersTab
    }>
}) {
    const searchParams = await props.searchParams
    const query = searchParams?.query || ''
    const currentPage = Number(searchParams?.page) || 1
    const requestedTab = searchParams?.tab || 'members'

    const currentAdmin = await getCurrentAdminUser()
    if (!currentAdmin || currentAdmin.status !== 'active') {
        redirect('/')
    }

    const currentRole = currentAdmin.role as AdminRole
    const activeTab: UsersTab = currentRole === 'staff' ? 'admin-staff' : requestedTab

    let totalMembers = 0
    let memberUsers: MemberUserRow[] = []
    if (activeTab === 'members') {
        const membersResult = await getAllUsers(currentPage, 20, query)
        memberUsers = membersResult.users as MemberUserRow[]
        totalMembers = membersResult.total
    }

    let adminStaffRows: AdminStaffRow[] = []
    if (activeTab === 'admin-staff') {
        const adminUsers = await listAdminUsers()
        adminStaffRows = adminUsers.map((user) => ({
            id: user.id,
            email: user.email,
            full_name: user.full_name || user.email,
            role: user.role,
            status: user.status,
            invited_at: user.invited_at,
            last_login_at: user.last_login_at,
        }))
    }

    return (
        <div className="space-y-6">
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Users</h1>
                        <p className="text-muted-foreground">
                            {activeTab === 'members'
                                ? `Manage your customer base (${totalMembers} total)`
                                : 'Manage portal access for your team'}
                        </p>
                    </div>

                    {activeTab === 'members' ? (
                        <div className="flex items-center gap-4">
                            <UserSearch />
                            <CreateUserDialog />
                        </div>
                    ) : null}
                </div>

                <div className="flex items-center gap-2">
                    {currentRole !== 'staff' ? (
                        <UsersTabLink tab="members" activeTab={activeTab} label="Members" query={query} />
                    ) : null}
                    <UsersTabLink tab="admin-staff" activeTab={activeTab} label="Admin & Staff" query={query} />
                </div>
            </div>

            {activeTab === 'members' ? (
                <MembersTable users={memberUsers} />
            ) : (
                <AdminStaffPanel
                    currentAdminId={currentAdmin.id}
                    currentAdminRole={currentRole}
                    users={adminStaffRows}
                />
            )}
        </div>
    )
}
