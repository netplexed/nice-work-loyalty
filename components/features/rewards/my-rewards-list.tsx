'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Copy, CheckCircle, QrCode, Clock } from "lucide-react"
import { formatDistanceToNow, isPast, differenceInHours } from "date-fns"
import type { Database } from '@/lib/supabase/database.types'
import { toast } from "sonner"
import { VoucherQR } from "./voucher-qr"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"

// Type definition for the joined data
type RedemptionWithReward = Database['public']['Tables']['redemptions']['Row'] & {
    expires_at?: string | null // Manually added as it's missing in generated types
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
                        <div className="text-xs text-muted-foreground space-y-1">
                            <div>
                                Claimed on {new Date(created_at).toLocaleDateString()} • {points_spent} pts
                            </div>
                            {(status === 'pending' || status === 'approved') && redemption.expires_at && (
                                <div className={`flex items-center gap-1 font-medium ${isPast(new Date(redemption.expires_at)) ? 'text-destructive' : 'text-amber-600 dark:text-amber-400'}`}>
                                    <Clock className="w-3 h-3" />
                                    <span>
                                        {(() => {
                                            if (isPast(new Date(redemption.expires_at!))) return 'Expired'

                                            const hours = differenceInHours(new Date(redemption.expires_at!), new Date())
                                            if (hours < 48) {
                                                return `Expires in ${hours} hours`
                                            }

                                            return `Expires in ${formatDistanceToNow(new Date(redemption.expires_at!))}`
                                        })()}
                                    </span>
                                </div>
                            )}
                        </div>


                    </div>

                    {/* Voucher Code Section */}
                    {status === 'pending' || status === 'approved' ? (
                        <div className="bg-muted/50 p-2 rounded-md border flex items-center justify-between gap-2">
                            <div className="font-mono font-medium text-sm tracking-widest pl-2">
                                {voucher_code}
                            </div>
                            <div className="flex gap-1">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={copyToClipboard}
                                >
                                    <Copy className="h-4 w-4" />
                                </Button>
                                {/* QR Code Dialog Trigger */}
                                <Dialog>
                                    <DialogTrigger asChild>
                                        <Button variant="outline" size="sm" className="h-8 gap-1">
                                            <QrCode className="w-4 h-4" />
                                            <span className="hidden sm:inline">QR</span>
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent className="sm:max-w-xs">
                                        <DialogHeader>
                                            <DialogTitle className="text-center">Show to Staff</DialogTitle>
                                        </DialogHeader>
                                        <div className="flex flex-col items-center gap-4 py-4">
                                            <VoucherQR code={voucher_code!} size={200} />
                                            <div className="font-mono font-bold text-2xl tracking-widest bg-muted px-4 py-2 rounded">
                                                {voucher_code}
                                            </div>
                                            <p className="text-center text-sm text-muted-foreground">
                                                Ask staff to scan this code to redeem your reward.
                                            </p>
                                        </div>
                                    </DialogContent>
                                </Dialog>
                            </div>
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

    const available = redemptions.filter(r => {
        const isExpired = r.expires_at ? isPast(new Date(r.expires_at)) : false
        return (r.status === 'pending' || r.status === 'approved') && !isExpired
    })

    const history = redemptions.filter(r => {
        const isExpired = r.expires_at ? isPast(new Date(r.expires_at)) : false
        return (r.status !== 'pending' && r.status !== 'approved') || isExpired
    })

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
