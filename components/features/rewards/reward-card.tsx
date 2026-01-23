'use client'

import { useState } from 'react'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2 } from 'lucide-react'
import image from 'next/image'

interface RewardCardProps {
    reward: any
    onRedeem: (reward: any) => void
}

export function RewardCard({ reward, onRedeem }: RewardCardProps) {
    return (
        <Card className="overflow-hidden flex flex-col h-full shadow-sm hover:shadow-md transition-shadow">
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
            </CardContent>
            <CardFooter className="p-4 pt-0">
                <Button
                    className="w-full bg-blue-600 hover:bg-blue-700"
                    size="sm"
                    onClick={() => onRedeem(reward)}
                >
                    Redeem
                </Button>
            </CardFooter>
        </Card>
    )
}
