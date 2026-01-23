import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { getAdminStats } from '@/app/actions/admin-actions'
import { Users, Gift, RotateCcw, ShoppingBag, CreditCard, Activity } from 'lucide-react'

export default async function AdminDashboard() {
    const stats = await getAdminStats()

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Dashboard Overview</h1>
                <p className="text-muted-foreground mt-2">Welcome back, Admin. Here is what is happening today.</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.totalUsers}</div>
                        <p className="text-xs text-muted-foreground">Registered accounts</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Points Issued</CardTitle>
                        <Gift className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">+{stats.totalPointsIssued.toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground">Lifetime points earned</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Points Redeemed</CardTitle>
                        <ShoppingBag className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-orange-600">-{stats.totalPointsRedeemed.toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground">Lifetime points spent</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Redemptions</CardTitle>
                        <CreditCard className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.totalRedemptions}</div>
                        <p className="text-xs text-muted-foreground">Rewards claimed</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <Card className="col-span-4">
                    <CardHeader>
                        <CardTitle>Recent Activity</CardTitle>
                        <CardDescription>
                            Latest points transactions across the platform.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>User</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Points</TableHead>
                                    <TableHead className="text-right">Date</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {/* @ts-ignore - DB types might need ignoring for complex joins */}
                                {stats.recentActivity.map((activity) => (
                                    <TableRow key={activity.id}>
                                        <TableCell>
                                            <div className="font-medium">{activity.profiles?.full_name || 'Unknown'}</div>
                                            <div className="text-xs text-muted-foreground">{activity.profiles?.email}</div>
                                        </TableCell>
                                        <TableCell className="capitalize">
                                            {activity.transaction_type.replace('_', ' ')}
                                        </TableCell>
                                        <TableCell>
                                            <span className={activity.points > 0 ? "text-green-600 font-medium" : "text-orange-600 font-medium"}>
                                                {activity.points > 0 ? '+' : ''}{activity.points}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-right text-muted-foreground">
                                            {new Date(activity.created_at).toLocaleDateString()}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                <Card className="col-span-3">
                    <CardHeader>
                        <CardTitle>Platform Health</CardTitle>
                        <CardDescription>
                            Quick snapshot of system metrics.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center">
                            <RotateCcw className="mr-2 h-4 w-4 text-muted-foreground" />
                            <div className="flex-1 space-y-1">
                                <p className="text-sm font-medium leading-none">Total Spins</p>
                                <p className="text-sm text-muted-foreground">
                                    Number of times users spun the wheel.
                                </p>
                            </div>
                            <div className="font-bold">{stats.totalSpins}</div>
                        </div>
                        {/* Placeholder for more health metrics later */}
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
