'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Copy, CheckCircle } from "lucide-react"
import type { Database } from '@/lib/supabase/database.types'
import { toast } from "sonner"

// Type definition for the joined data
type RedemptionWithReward = Database['public']['Tables']['redemptions']['Row'] & {
    rewards: {
        name: string
        description: string | null
        image_url: string | null
        category: string | null
    }
}

interface MyRewardsListProps {
    redemptions: RedemptionWithReward[]
}

function RewardItem({ redemption }: { redemption: RedemptionWithReward }) {
    const { rewards, voucher_code, status, points_spent, created_at } = redemption

    const copyToClipboard = () => {
        if (voucher_code) {
            navigator.clipboard.writeText(voucher_code)
            toast.success("Voucher code copied!")
        }
    }

    return (
        <Card className="mb-4 overflow-hidden border-l-4 border-l-primary/50">
            <div className="flex flex-col sm:flex-row">
                {/* Image Section */}
                <div className="relative w-full sm:w-32 h-32 sm:h-auto bg-muted">
                    {rewards.image_url ? (
                        <img
                            src={rewards.image_url}
                            alt={rewards.name}
                            className="absolute inset-0 w-full h-full object-cover"
                        />
                    ) : (
                        <div className="flex items-center justify-center h-full text-muted-foreground text-xs">
                            No Image
                        </div>
                    )}
                </div>

                {/* Content Section */}
                <div className="flex-1 p-4 flex flex-col justify-between gap-4">
                    <div>
                        <div className="flex justify-between items-start mb-1">
                            <div>
                                <h3 className="font-bold text-lg">{rewards.name}</h3>
                                <p className="text-sm text-muted-foreground line-clamp-1">{rewards.description}</p>
                            </div>
                            <Badge variant={status === 'redeemed' ? 'secondary' : 'default'} className="capitalize">
                                {status === 'pending' ? 'Available' : status}
                            </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground">
                            Claimed on {new Date(created_at).toLocaleDateString()} • {points_spent} pts
                        </div>
                    </div>

                    {/* Voucher Code Section */}
                    {status === 'pending' || status === 'approved' ? (
                        <div className="bg-muted/50 p-2 rounded-md border flex items-center justify-between gap-2">
                            <div className="font-mono font-medium text-sm tracking-widest">
                                {voucher_code}
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={copyToClipboard}
                            >
                                <Copy className="h-4 w-4" />
                            </Button>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground p-2 bg-muted/30 rounded-md">
                            <CheckCircle className="h-4 w-4" />
                            <span>Already Used</span>
                        </div>
                    )}
                </div>
            </div>
        </Card>
    )
}

export function MyRewardsList({ redemptions }: MyRewardsListProps) {
    if (redemptions.length === 0) {
        return (
            <div className="text-center py-12 text-muted-foreground">
                <p>You haven't claimed any rewards yet.</p>
                <p className="text-sm mt-2">Earn points and redeem them for cool stuff!</p>
            </div>
        )
    }

    const available = redemptions.filter(r => r.status === 'pending' || r.status === 'approved')
    const history = redemptions.filter(r => r.status !== 'pending' && r.status !== 'approved')

    return (
        <div className="space-y-8">
            {/* Available Section */}
            <div className="space-y-4">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Available to Use</h3>
                {available.length > 0 ? (
                    available.map(redemption => (
                        <RewardItem key={redemption.id} redemption={redemption} />
                    ))
                ) : (
                    <div className="p-4 border border-dashed rounded-lg text-center text-sm text-muted-foreground">
                        No available rewards. Check the catalog!
                    </div>
                )}
            </div>

            {/* History Section */}
            {history.length > 0 && (
                <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider pt-4 border-t">Past Redemptions</h3>
                    <div className="opacity-80">
                        {history.map(redemption => (
                            <RewardItem key={redemption.id} redemption={redemption} />
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}
