'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { getStoreActivityStats, StoreActivityData } from '@/app/actions/reporting-actions'

export default function StoreActivityPage() {
    const [data, setData] = useState<StoreActivityData[]>([])
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
            const result = await getStoreActivityStats(startDate, endDate)
            setData(result)
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    React.useEffect(() => {
        fetchData()
    }, [])

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Activity by Store</h1>
                <p className="text-muted-foreground mt-2">
                    Performance breakdown by location (Check-ins & Sales).
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

            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-slate-50">
                                <TableHead>Location</TableHead>
                                <TableHead className="text-right">Check-ins</TableHead>
                                <TableHead className="text-right">Orders</TableHead>
                                <TableHead className="text-right">Total Revenue</TableHead>
                                <TableHead className="text-right">Avg Ticket</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {data.length === 0 && !loading && (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center h-24">
                                        No data found.
                                    </TableCell>
                                </TableRow>
                            )}
                            {data.map((row) => (
                                <TableRow key={row.location}>
                                    <TableCell className="font-medium">{row.location}</TableCell>
                                    <TableCell className="text-right">{row.checkIns}</TableCell>
                                    <TableCell className="text-right">{row.purchasesCount}</TableCell>
                                    <TableCell className="text-right font-medium">
                                        ${row.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </TableCell>
                                    <TableCell className="text-right text-muted-foreground">
                                        ${row.avgTicket.toFixed(2)}
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
