'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { getPointsSummaryByDate, PointsSummaryData } from '@/app/actions/reporting-actions'

export default function PointsSummaryPage() {
    const [data, setData] = useState<PointsSummaryData[]>([])
    const [loading, setLoading] = useState(false)

    // Default to last 30 days
    const [startDate, setStartDate] = useState(
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    )
    const [endDate, setEndDate] = useState(
        new Date().toISOString().split('T')[0]
    )

    const fetchData = async () => {
        setLoading(true)
        try {
            const result = await getPointsSummaryByDate(startDate, endDate)
            setData(result)
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    // Load on mount
    React.useEffect(() => {
        fetchData()
    }, []) // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Points Summary by Date</h1>
                <p className="text-muted-foreground mt-2">
                    Daily breakdown of points earned and redeemed.
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Filter Options</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col sm:flex-row gap-4 items-end">
                        <div className="grid w-full max-w-sm items-center gap-1.5">
                            <label htmlFor="start" className="text-sm font-medium">From Date</label>
                            <Input
                                type="date"
                                id="start"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                            />
                        </div>
                        <div className="grid w-full max-w-sm items-center gap-1.5">
                            <label htmlFor="end" className="text-sm font-medium">To Date</label>
                            <Input
                                type="date"
                                id="end"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                            />
                        </div>
                        <Button onClick={fetchData} disabled={loading}>
                            {loading ? 'Loading...' : 'Search'}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <Card className="overflow-hidden">
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-slate-50">
                                    <TableHead className="w-[120px]">DATE</TableHead>
                                    <TableHead className="text-right">POINTS AWARDED<br />ACTION</TableHead>
                                    <TableHead className="text-right">POINTS AWARDED<br />NO SUB TYPE</TableHead>
                                    <TableHead className="text-right">POINTS AWARDED<br />WITH SUB TYPE</TableHead>
                                    <TableHead className="text-right">POINTS REDEEMED<br />NO SUB TYPE</TableHead>
                                    <TableHead className="text-right">POINTS ADJUSTED<br />ADD</TableHead>
                                    <TableHead className="text-right">POINTS ADJUSTED<br />DEDUCT</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {data.length === 0 && !loading && (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center h-24">
                                            No records found for this period.
                                        </TableCell>
                                    </TableRow>
                                )}
                                {data.map((row) => (
                                    <TableRow key={row.date} className="hover:bg-slate-50/50">
                                        <TableCell className="font-medium text-slate-600">
                                            {row.date}
                                        </TableCell>
                                        <TableCell className="text-right">{row.awardedAction}</TableCell>
                                        <TableCell className="text-right">{row.awardedNoSubType}</TableCell>
                                        <TableCell className="text-right">{row.awardedWithSubType}</TableCell>
                                        <TableCell className="text-right text-orange-600">-{row.redeemed}</TableCell>
                                        <TableCell className="text-right text-green-600">{row.adjustedAdd}</TableCell>
                                        <TableCell className="text-right text-red-600">{row.adjustedDeduct}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
