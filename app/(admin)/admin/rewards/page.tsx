import { getAdminRewards, toggleRewardStatus } from '@/app/actions/admin-actions'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { RewardFormDialog } from '@/components/admin/rewards/reward-form-dialog'
import { ToggleRewardButton } from '@/components/admin/rewards/toggle-reward-button'

export default async function AdminRewardsPage() {
    const rewards = await getAdminRewards()

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Rewards</h1>
                    <p className="text-muted-foreground">Manage catalog items ({rewards.length} items)</p>
                </div>
                <RewardFormDialog />
            </div>

            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Image</TableHead>
                                <TableHead>Name</TableHead>
                                <TableHead>Category</TableHead>
                                <TableHead className="text-right">Cost</TableHead>
                                <TableHead className="text-center">Inventory</TableHead>
                                <TableHead className="text-center">Redemptions</TableHead>
                                <TableHead>Expires</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {rewards.map((reward: any) => (
                                <TableRow key={reward.id} className={!reward.active ? 'opacity-50' : ''}>
                                    <TableCell>
                                        {reward.image_url ? (
                                            <img src={reward.image_url} alt="" className="w-8 h-8 rounded object-cover bg-gray-100" />
                                        ) : (
                                            <div className="w-8 h-8 rounded bg-gray-200" />
                                        )}
                                    </TableCell>
                                    <TableCell className="font-medium">
                                        {reward.name}
                                    </TableCell>
                                    <TableCell className="capitalize">{reward.category}</TableCell>
                                    <TableCell className="text-right font-mono font-bold">
                                        {reward.points_cost}
                                    </TableCell>
                                    <TableCell className="text-center">
                                        {reward.inventory_remaining !== null ? (
                                            <span className={reward.inventory_remaining === 0 ? "text-red-500 font-bold" : ""}>
                                                {reward.inventory_remaining}
                                            </span>
                                        ) : (
                                            <span className="text-muted-foreground text-lg">∞</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-center font-mono">
                                        {reward.redemptions?.[0]?.count || 0}
                                    </TableCell>
                                    <TableCell className="text-xs">
                                        {reward.expires_at ? (
                                            <span className={new Date(reward.expires_at) < new Date() ? "text-red-500" : ""}>
                                                {new Date(reward.expires_at).toLocaleDateString()}
                                            </span>
                                        ) : (
                                            <span className="text-muted-foreground">—</span>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex gap-1 items-center">
                                            <Badge variant={reward.active ? 'default' : 'secondary'}>
                                                {reward.active ? 'Active' : 'Archived'}
                                            </Badge>
                                            {reward.is_hidden && (
                                                <Badge variant="outline">
                                                    Hidden
                                                </Badge>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right flex items-center justify-end gap-2">
                                        <ToggleRewardButton id={reward.id} isActive={reward.active} />
                                        <RewardFormDialog reward={reward} />
                                    </TableCell>
                                </TableRow>
                            ))}
                            {rewards.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                        No rewards found. Create one!
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
