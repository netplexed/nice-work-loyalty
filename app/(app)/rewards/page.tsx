'use client'

import { useEffect, useState } from 'react'
import { useRewards, useRedemptions } from '@/hooks/use-rewards'
import { RewardCard } from '@/components/features/rewards/reward-card'
import { MyRewardsList } from '@/components/features/rewards/my-rewards-list'
import { RedemptionModal } from '@/components/features/rewards/redemption-modal'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Loader2 } from 'lucide-react'

export default function RewardsPage() {
    const { rewards, loading: loadingRewards } = useRewards()
    const { redemptions, loading: loadingRedimptions, mutate: mutateRedemptions } = useRedemptions()

    const [selectedReward, setSelectedReward] = useState<any>(null)
    const [modalOpen, setModalOpen] = useState(false)

    // No Effect needed

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



            <Tabs defaultValue="my-rewards" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-6">
                    <TabsTrigger value="my-rewards">My Rewards</TabsTrigger>
                    <TabsTrigger value="catalog">Reward Catalog</TabsTrigger>
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



