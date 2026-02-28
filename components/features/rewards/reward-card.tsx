'use client'

import { useState } from 'react'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Loader2 } from 'lucide-react'
import image from 'next/image'

interface RewardCardProps {
    reward: any
    onRedeem: (reward: any) => void
}

export function RewardCard({ reward, onRedeem }: RewardCardProps) {
    const [detailsOpen, setDetailsOpen] = useState(false)

    return (
        <>
            <Card
                className="overflow-hidden flex flex-col h-full shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => setDetailsOpen(true)}
            >
                <div className="aspect-video bg-gray-100 relative">
                    {/* Placeholder for real image */}
                    <div className="absolute inset-0 flex items-center justify-center text-gray-400 bg-gray-50">
                        {reward.image_url ? (
                            <img src={reward.image_url} alt={reward.name} className="w-full h-full object-cover" />
                        ) : (
                            <span className="text-xs">No Image</span>
                        )}
                    </div>
                    <Badge className="absolute top-2 right-2 bg-white/90 text-black hover:bg-white">
                        {reward.points_cost} pts
                    </Badge>
                </div>
                <CardHeader className="p-4 pb-2">
                    <div className="flex justify-between items-start gap-2">
                        <CardTitle className="text-base font-semibold line-clamp-2">{reward.name}</CardTitle>
                    </div>
                </CardHeader>
                <CardContent className="p-4 pt-0 flex-1 space-y-2">
                    <div className="flex flex-wrap gap-1">
                        {!reward.locations || reward.locations.length === 0 ? (
                            <Badge variant="outline" className="text-[10px] h-5 bg-green-50 text-green-700 border-green-200">
                                All Outlets
                            </Badge>
                        ) : (
                            reward.locations.map((loc: string) => (
                                <Badge key={loc} variant="outline" className="text-[10px] h-5">
                                    {loc}
                                </Badge>
                            ))
                        )}
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-3">
                        {reward.description}
                    </p>
                    {reward.expires_at && (
                        <p className="text-[10px] text-orange-600 font-medium mt-1">
                            Expires: {new Date(reward.expires_at).toLocaleDateString()}
                        </p>
                    )}
                </CardContent>
                <CardFooter className="p-4 pt-0">
                    <Button
                        className="w-full bg-blue-600 hover:bg-blue-700"
                        size="sm"
                        onClick={(e) => {
                            e.stopPropagation()
                            onRedeem(reward)
                        }}
                    >
                        Redeem
                    </Button>
                </CardFooter>
            </Card>

            <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
                <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{reward.name}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="aspect-video bg-gray-100 relative rounded-md overflow-hidden">
                            {reward.image_url ? (
                                <img src={reward.image_url} alt={reward.name} className="w-full h-full object-cover" />
                            ) : (
                                <div className="absolute inset-0 flex items-center justify-center text-gray-400 bg-gray-50">
                                    <span className="text-xs">No Image</span>
                                </div>
                            )}
                            <Badge className="absolute top-2 right-2 bg-white/90 text-black hover:bg-white">
                                {reward.points_cost} pts
                            </Badge>
                        </div>

                        <div className="flex flex-wrap gap-1">
                            {!reward.locations || reward.locations.length === 0 ? (
                                <Badge variant="outline" className="text-xs h-6 bg-green-50 text-green-700 border-green-200">
                                    All Outlets
                                </Badge>
                            ) : (
                                reward.locations.map((loc: string) => (
                                    <Badge key={loc} variant="outline" className="text-xs h-6">
                                        {loc}
                                    </Badge>
                                ))
                            )}
                        </div>

                        <div className="text-sm text-foreground whitespace-pre-wrap">
                            {reward.description}
                        </div>

                        {reward.expires_at && (
                            <p className="text-xs text-orange-600 font-medium">
                                Expires: {new Date(reward.expires_at).toLocaleDateString()}
                            </p>
                        )}

                        <Button
                            className="w-full bg-blue-600 hover:bg-blue-700 mt-4"
                            onClick={() => {
                                setDetailsOpen(false)
                                onRedeem(reward)
                            }}
                        >
                            Redeem Reward
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    )
}
