'use client'

import { useEffect, useState } from 'react'
import { getSpinConfig, SpinPrize } from '@/app/actions/spin-actions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

export default function SpinDebugPage() {
    const [prizes, setPrizes] = useState<SpinPrize[]>([])

    useEffect(() => {
        getSpinConfig().then(setPrizes)
    }, [])

    return (
        <div className="p-8 space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Spin Wheel Configuration (Debug)</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Label</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Points Value</TableHead>
                                <TableHead>Probability</TableHead>
                                <TableHead>Active</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {prizes.map((prize) => (
                                <TableRow key={prize.id}>
                                    <TableCell className="font-medium">{prize.label}</TableCell>
                                    <TableCell>{prize.type}</TableCell>
                                    <TableCell>{prize.points_value}</TableCell>
                                    <TableCell>{prize.probability}</TableCell>
                                    <TableCell>Yes</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    )
}
