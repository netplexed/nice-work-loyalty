'use client'

import { useState, useEffect } from 'react'
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
} from "@/components/ui/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { getUserProfile } from '@/app/actions/admin-actions'
import { RecentActivity } from '@/components/features/home/recent-activity'

type UserProfileDrawerProps = {
    userId: string | null
    onClose: () => void
}

export function UserProfileDrawer({ userId, onClose }: UserProfileDrawerProps) {
    const [loading, setLoading] = useState(false)
    const [data, setData] = useState<any>(null)

    useEffect(() => {
        if (!userId) {
            setData(null)
            return
        }

        let isMounted = true
        setLoading(true)

        getUserProfile(userId)
            .then(res => {
                if (isMounted) {
                    setData(res)
                    setLoading(false)
                }
            })
            .catch(err => {
                console.error("Failed to fetch user profile", err)
                if (isMounted) setLoading(false)
            })

        return () => { isMounted = false }
    }, [userId])

    return (
        <Sheet open={!!userId} onOpenChange={(open) => {
            if (!open) onClose()
        }}>
            <SheetContent className="w-full sm:max-w-md overflow-y-auto">
                <SheetHeader className="text-left mb-6">
                    <SheetTitle>User Profile</SheetTitle>
                    <SheetDescription>
                        Detailed information and history for this user.
                    </SheetDescription>
                </SheetHeader>

                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <p className="text-muted-foreground">Loading profile...</p>
                    </div>
                ) : data ? (
                    <div className="space-y-6 pb-6">
                        {/* Header Section */}
                        <div className="flex items-start gap-4">
                            <Avatar className="h-16 w-16">
                                <AvatarImage src={data.profile.avatar_url || ''} />
                                <AvatarFallback>{data.profile.full_name?.charAt(0) || data.profile.email?.charAt(0) || 'U'}</AvatarFallback>
                            </Avatar>
                            <div>
                                <h2 className="text-xl font-bold">{data.profile.full_name || 'Unnamed User'}</h2>
                                <p className="text-sm text-muted-foreground">{data.profile.email}</p>
                                <div className="flex items-center gap-2 mt-2">
                                    <Badge variant={
                                        data.profile.tier === 'platinum' ? 'default' :
                                            data.profile.tier === 'gold' ? 'secondary' : 'outline'
                                    } className="capitalize">
                                        {{ 'bronze': 'Hi My Name Is', 'silver': 'Good to See You', 'gold': 'Local Legend', 'platinum': 'Platinum' }[data.profile.tier as string] || data.profile.tier}
                                    </Badge>
                                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                                        Joined {data.profile.created_at ? new Date(data.profile.created_at).toLocaleDateString() : 'Unknown'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Balances */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-muted p-4 rounded-lg">
                                <p className="text-sm text-muted-foreground font-medium mb-1">Points</p>
                                <p className="text-2xl font-bold font-mono">{data.profile.points_balance || 0}</p>
                            </div>
                            <div className="bg-amber-50 dark:bg-amber-950/20 p-4 rounded-lg border border-amber-100 dark:border-amber-900/50">
                                <p className="text-sm text-amber-600 dark:text-amber-500 font-medium mb-1">Nice</p>
                                <p className="text-2xl font-bold font-mono text-amber-700 dark:text-amber-400">
                                    {data.niceAccount?.nice_collected_balance || 0}
                                </p>
                            </div>
                        </div>

                        {/* Recent Activity */}
                        <RecentActivity data={data.pointsTransactions?.slice(0, 5)} />

                        {/* Tabs */}
                        <Tabs defaultValue="spending" className="w-full">
                            <TabsList className="w-full grid grid-cols-3">
                                <TabsTrigger value="spending">Spending</TabsTrigger>
                                <TabsTrigger value="rewards">Rewards</TabsTrigger>
                                <TabsTrigger value="points">Points</TabsTrigger>
                            </TabsList>

                            {/* Spending Tab */}
                            <TabsContent value="spending" className="mt-4">
                                <div className="space-y-4">
                                    <h3 className="font-semibold text-sm">Purchase History</h3>
                                    {(!data.purchases || data.purchases.length === 0) ? (
                                        <p className="text-sm text-muted-foreground">No purchases found.</p>
                                    ) : (
                                        <div className="border rounded-md divide-y overflow-hidden max-h-[350px] overflow-y-auto">
                                            {data.purchases.map((purchase: any) => (
                                                <div key={purchase.id} className="p-3 text-sm flex justify-between items-center bg-white dark:bg-zinc-950 hover:bg-muted/50 transition-colors">
                                                    <div>
                                                        <p className="font-medium capitalize">{purchase.location?.replace(/_/g, ' ')}</p>
                                                        <p className="text-xs text-muted-foreground mt-0.5">
                                                            {new Date(purchase.created_at).toLocaleString(undefined, {
                                                                month: 'short', day: 'numeric', year: 'numeric',
                                                                hour: 'numeric', minute: '2-digit'
                                                            })}
                                                        </p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="font-bold">${purchase.amount}</p>
                                                        <p className="text-xs text-green-600 font-medium">+{purchase.points_earned} pts</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </TabsContent>

                            {/* Rewards Tab */}
                            <TabsContent value="rewards" className="mt-4">
                                <div className="space-y-4">
                                    <h3 className="font-semibold text-sm">Redeemed Rewards</h3>
                                    {(!data.redemptions || data.redemptions.length === 0) ? (
                                        <p className="text-sm text-muted-foreground">No rewards redeemed yet.</p>
                                    ) : (
                                        <div className="border rounded-md divide-y overflow-hidden max-h-[350px] overflow-y-auto">
                                            {data.redemptions.map((redemption: any) => (
                                                <div key={redemption.id} className="p-3 text-sm flex justify-between items-center bg-white dark:bg-zinc-950 hover:bg-muted/50 transition-colors">
                                                    <div>
                                                        <p className="font-medium">{redemption.rewards?.name || 'Unknown Reward'}</p>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <Badge variant={redemption.status === 'redeemed' || redemption.status === 'approved' ? 'default' : 'outline'} className="text-[10px] capitalize px-1 py-0 h-4">
                                                                {redemption.status}
                                                            </Badge>
                                                            <span className="text-xs text-muted-foreground">
                                                                {new Date(redemption.created_at).toLocaleDateString(undefined, {
                                                                    month: 'short', day: 'numeric', year: 'numeric'
                                                                })}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="text-right whitespace-nowrap">
                                                        <p className="font-bold text-red-600">-{redemption.points_spent} pts</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </TabsContent>

                            {/* Points Tab */}
                            <TabsContent value="points" className="mt-4">
                                <div className="space-y-4">
                                    <h3 className="font-semibold text-sm">Points Ledger</h3>
                                    {(!data.pointsTransactions || data.pointsTransactions.length === 0) ? (
                                        <p className="text-sm text-muted-foreground">No point transactions found.</p>
                                    ) : (
                                        <div className="border rounded-md divide-y overflow-hidden max-h-[350px] overflow-y-auto">
                                            {data.pointsTransactions.map((tx: any) => (
                                                <div key={tx.id} className="p-3 text-sm flex justify-between items-start gap-3 bg-white dark:bg-zinc-950 hover:bg-muted/50 transition-colors">
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-medium capitalize truncate">{tx.transaction_type?.replace(/_/g, ' ')}</p>
                                                        {tx.description && (
                                                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                                                                {tx.description}
                                                            </p>
                                                        )}
                                                        <p className="text-[10px] text-muted-foreground mt-1">
                                                            {new Date(tx.created_at).toLocaleString(undefined, {
                                                                month: 'short', day: 'numeric', year: 'numeric',
                                                                hour: 'numeric', minute: '2-digit'
                                                            })}
                                                        </p>
                                                    </div>
                                                    <div className="text-right shrink-0">
                                                        <p className={`font-bold ${tx.points >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                            {tx.points >= 0 ? '+' : ''}{tx.points}
                                                        </p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </TabsContent>
                        </Tabs>
                    </div>
                ) : (
                    <div className="flex items-center justify-center h-64">
                        <p className="text-muted-foreground">User not found</p>
                    </div>
                )}
            </SheetContent>
        </Sheet>
    )
}
