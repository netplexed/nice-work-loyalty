'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { getTopMembers, TopMemberData } from '@/app/actions/reporting-actions'

export default function TopMembersPage() {
    const [data, setData] = useState<TopMemberData[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        getTopMembers(100).then(res => {
            setData(res)
            setLoading(false)
        })
    }, [])

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Top Members</h1>
                <p className="text-muted-foreground mt-2">
                    Leaderboard based on lifetime points earned.
                </p>
            </div>

            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-slate-50">
                                <TableHead className="w-[50px]">Rank</TableHead>
                                <TableHead>Member</TableHead>
                                <TableHead className="text-right">Lifetime Points Earned</TableHead>
                                <TableHead className="text-right">Current Balance</TableHead>
                                <TableHead className="text-right">Total Spend</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {data.length === 0 && !loading && (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center h-24">
                                        No members found.
                                    </TableCell>
                                </TableRow>
                            )}
                            {data.map((row, index) => (
                                <TableRow key={row.id}>
                                    <TableCell className="font-medium text-muted-foreground">
                                        #{index + 1}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="font-medium">{row.full_name || 'Unnamed'}</span>
                                            <span className="text-xs text-muted-foreground">{row.email}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right font-bold text-blue-600">
                                        {row.lifetime_earned.toLocaleString()}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {row.points_balance.toLocaleString()}
                                    </TableCell>
                                    <TableCell className="text-right text-green-600">
                                        ${row.lifetime_spend.toLocaleString(undefined, { minimumFractionDigits: 2 })}
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
