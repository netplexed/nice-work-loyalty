'use client'

import { useEffect, useState } from 'react'
import { useRewards, useRedemptions } from '@/hooks/use-rewards'
import { RewardCard } from '@/components/features/rewards/reward-card'
import { MyRewardsList } from '@/components/features/rewards/my-rewards-list'
import { RedemptionModal } from '@/components/features/rewards/redemption-modal'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Loader2, ChevronDown, Trophy } from 'lucide-react'
import { SpinWheel } from '@/components/features/gamification/spin-wheel'
import { getSpinConfig, SpinPrize } from '@/app/actions/spin-actions'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Button } from '@/components/ui/button'

export default function RewardsPage() {
    const { rewards, loading: loadingRewards } = useRewards()
    const { redemptions, loading: loadingRedimptions, mutate: mutateRedemptions } = useRedemptions()

    const [selectedReward, setSelectedReward] = useState<any>(null)
    const [modalOpen, setModalOpen] = useState(false)

    const [spinConfig, setSpinConfig] = useState<SpinPrize[]>([])
    const [spinConfigLoading, setSpinConfigLoading] = useState(true)
    const [isSpinOpen, setIsSpinOpen] = useState(false)

    useEffect(() => {
        getSpinConfig().then(config => {
            setSpinConfig(config)
            setSpinConfigLoading(false)
        })
    }, [])

    const categories = ['all', 'food', 'drink', 'voucher']

    const handleRedeem = (reward: any) => {
        setSelectedReward(reward)
        setModalOpen(true)
    }

    if (loadingRewards && loadingRedimptions) {
        return (
            <div className="flex justify-center items-center h-[50vh]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    return (
        <div className="p-4 pb-24 space-y-6">
            <h1 className="text-2xl font-bold">Rewards</h1>

            {/* Daily Spin Section */}
            <Card className="border-primary/20 bg-gradient-to-b from-primary/5 to-transparent overflow-hidden">
                <CardHeader className="pb-2">
                    <Collapsible open={isSpinOpen} onOpenChange={setIsSpinOpen}>
                        <div className="flex items-center justify-between">
                            <div className="space-y-1">
                                <CardTitle className="flex items-center gap-2 text-xl">
                                    <Trophy className="h-5 w-5 text-primary" />
                                    Daily Spin
                                </CardTitle>
                                <CardDescription>
                                    Spin for a chance to win exclusive prizes and points!
                                </CardDescription>
                            </div>
                            <CollapsibleTrigger asChild>
                                <Button variant="ghost" size="sm" className="w-9 p-0">
                                    <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isSpinOpen ? 'rotate-180' : ''}`} />
                                    <span className="sr-only">Toggle Spin Wheel</span>
                                </Button>
                            </CollapsibleTrigger>
                        </div>
                        <CollapsibleContent className="pt-6">
                            {spinConfigLoading ? (
                                <div className="h-[300px] flex items-center justify-center">
                                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                                </div>
                            ) : (
                                <SpinWheel
                                    prizes={spinConfig}
                                    onSpinComplete={() => {
                                        // Refresh my rewards
                                        mutateRedemptions()
                                    }}
                                />
                            )}
                        </CollapsibleContent>
                    </Collapsible>
                </CardHeader>
            </Card>

            <Tabs defaultValue="catalog" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-6">
                    <TabsTrigger value="catalog">Reward Catalog</TabsTrigger>
                    <TabsTrigger value="my-rewards">My Rewards</TabsTrigger>
                </TabsList>

                {/* Catalog Tab */}
                <TabsContent value="catalog">
                    <Tabs defaultValue="all" className="w-full">
                        <TabsList className="w-full justify-start overflow-x-auto no-scrollbar mb-4">
                            {categories.map((cat) => (
                                <TabsTrigger key={cat} value={cat} className="capitalize">
                                    {cat}
                                </TabsTrigger>
                            ))}
                        </TabsList>

                        {categories.map((cat) => (
                            <TabsContent key={cat} value={cat}>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {rewards
                                        .filter((r) => cat === 'all' || r.category === cat)
                                        .map((reward) => (
                                            <RewardCard key={reward.id} reward={reward} onRedeem={handleRedeem} />
                                        ))}

                                    {rewards.filter((r) => cat === 'all' || r.category === cat).length === 0 && (
                                        <div className="col-span-full text-center py-10 text-muted-foreground">
                                            No rewards found in this category.
                                        </div>
                                    )}
                                </div>
                            </TabsContent>
                        ))}
                    </Tabs>
                </TabsContent>

                {/* My Rewards Tab */}
                <TabsContent value="my-rewards">
                    <MyRewardsList redemptions={redemptions} />
                </TabsContent>
            </Tabs>

            <RedemptionModal
                reward={selectedReward}
                open={modalOpen}
                onOpenChange={setModalOpen}
                onSuccess={(newRedemption) => {
                    mutateRedemptions([newRedemption, ...redemptions], false) // Optimistic
                    mutateRedemptions() // Revalidate
                }}
            />
        </div>
    )
}



