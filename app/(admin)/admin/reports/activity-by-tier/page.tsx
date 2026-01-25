'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { getTierActivityStats, TierActivityData } from '@/app/actions/reporting-actions'
import { Badge } from '@/components/ui/badge'

export default function TierActivityPage() {
    const [data, setData] = useState<TierActivityData[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        getTierActivityStats().then(res => {
            setData(res)
            setLoading(false)
        })
    }, [])

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Activity by Tier</h1>
                <p className="text-muted-foreground mt-2">
                    Breakdown of members by Nice Level (Tier Bonus).
                </p>
            </div>

            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-slate-50">
                                <TableHead>Tier Level</TableHead>
                                <TableHead className="text-right">Member Count</TableHead>
                                <TableHead className="text-right">Avg Points Balance</TableHead>
                                <TableHead className="text-right">Avg Nice Balance</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {data.length === 0 && !loading && (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center h-24">
                                        No tier data found.
                                    </TableCell>
                                </TableRow>
                            )}
                            {data.map((row) => (
                                <TableRow key={row.tier_bonus}>
                                    <TableCell className="font-medium">
                                        <Badge variant="outline" className="text-base px-3 py-1">
                                            {row.tier_bonus}x Bonus
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right font-medium">
                                        {row.member_count}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {Math.round(row.avg_points_balance).toLocaleString()}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {Math.round(row.avg_nice_balance).toLocaleString()}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    )
}
