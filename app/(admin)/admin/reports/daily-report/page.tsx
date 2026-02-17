'use client'

import React, { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
    Table,
    TableBody,
    TableCell,
    TableRow,
} from '@/components/ui/table'
import { DailyReportData, getDailyReport } from '@/app/actions/reporting-actions'

function formatCurrency(value: number) {
    return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export default function DailyReportPage() {
    const [loading, setLoading] = useState(false)
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
    const [data, setData] = useState<DailyReportData | null>(null)

    const fetchData = async () => {
        setLoading(true)
        try {
            const result = await getDailyReport(selectedDate)
            setData(result)
        } catch (error) {
            console.error(error)
            setData(null)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchData()
    }, []) // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Daily Report</h1>
                <p className="text-muted-foreground mt-2">
                    Daily KPI snapshot for one selected date.
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Filter Options</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col sm:flex-row gap-4 items-end">
                        <div className="grid w-full max-w-sm items-center gap-1.5">
                            <label htmlFor="report-date" className="text-sm font-medium">Date</label>
                            <Input
                                id="report-date"
                                type="date"
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                            />
                        </div>
                        <Button onClick={fetchData} disabled={loading}>
                            {loading ? 'Loading...' : 'Search'}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Metrics</CardTitle>
                    <CardDescription>
                        Report date: {data?.reportDate || selectedDate}
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableBody>
                            <TableRow>
                                <TableCell className="font-medium"># of unique users that opened the app</TableCell>
                                <TableCell className="text-right">{data?.uniqueUsersOpenedApp.toLocaleString() ?? '-'}</TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell className="font-medium"># of rewards redeemed that day</TableCell>
                                <TableCell className="text-right">{data?.rewardsRedeemed.toLocaleString() ?? '-'}</TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell className="font-medium"># of rewards used that day</TableCell>
                                <TableCell className="text-right">{data?.rewardsUsed.toLocaleString() ?? '-'}</TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell className="font-medium"># of new users registered</TableCell>
                                <TableCell className="text-right">{data?.newUsersRegistered.toLocaleString() ?? '-'}</TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell className="font-medium"># of points earned that day by all users</TableCell>
                                <TableCell className="text-right">{data?.pointsEarned.toLocaleString() ?? '-'}</TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell className="font-medium">Total amount of spend that day by all users</TableCell>
                                <TableCell className="text-right">{data ? formatCurrency(data.totalSpend) : '-'}</TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell className="font-medium"># of nice earned that day by all users</TableCell>
                                <TableCell className="text-right">{data?.niceEarned.toLocaleString() ?? '-'}</TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell className="font-medium"># of nice used that day by all users</TableCell>
                                <TableCell className="text-right">{data?.niceUsed.toLocaleString() ?? '-'}</TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell className="font-medium">Total # of members as of that day</TableCell>
                                <TableCell className="text-right">{data?.totalMembersAsOfDate.toLocaleString() ?? '-'}</TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell className="font-medium">
                                    Total # of active members as of that day (had 1 visit within previous 3 months)
                                </TableCell>
                                <TableCell className="text-right">{data?.activeMembersAsOfDate.toLocaleString() ?? '-'}</TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <p className="text-xs text-muted-foreground">
                Unique app opens are computed from unique users with recorded activity on that date
                (purchases, check-ins, rewards, points, nice, or registration).
            </p>
        </div>
    )
}
