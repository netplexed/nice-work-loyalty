'use client'

import React from 'react'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { CohortData, CohortType } from '@/app/actions/reporting-actions'
import { cn } from '@/lib/utils'

interface CohortTableProps {
    data: CohortData[]
    type: CohortType
}

export function CohortTable({ data, type }: CohortTableProps) {
    if (!data.length) return <div className="p-4 text-center text-muted-foreground">No data available</div>

    // Determine max columns for header
    const maxMonths = data.reduce((max, cohort) => {
        const lastIndex = cohort.data.length > 0 ? cohort.data[cohort.data.length - 1].monthIndex : 0
        return Math.max(max, lastIndex)
    }, 0)

    // Find max value for heatmap scaling
    // For people: 100% is max
    // For spend: Find global max ARPU
    const globalMaxValue = type === 'people'
        ? 100
        : data.reduce((max, c) => Math.max(max, ...c.data.map(d => d.value)), 0)

    // Helper for cell color
    const getCellColor = (value: number) => {
        // Base color is Blue-500 (#3b82f6)
        // We adjust opacity
        const intensity = globalMaxValue > 0 ? value / globalMaxValue : 0
        // Use rgba for transparency over white/dark bg
        // Blue-600 is approx 37, 99, 235
        return `rgba(37, 99, 235, ${Math.max(intensity, 0.05)})` // min 5% opacity
    }

    const getTextColor = (value: number) => {
        const intensity = globalMaxValue > 0 ? value / globalMaxValue : 0
        return intensity > 0.5 ? 'white' : 'black'
    }

    return (
        <div className="rounded-md border overflow-x-auto">
            <Table className="min-w-[800px]">
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-[100px]">Cohort</TableHead>
                        <TableHead className="w-[80px]">Users</TableHead>
                        {Array.from({ length: maxMonths + 1 }).map((_, i) => (
                            <TableHead key={i} className="text-center w-[80px]">
                                Month {i}
                            </TableHead>
                        ))}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {data.map((cohort) => (
                        <TableRow key={cohort.month}>
                            <TableCell className="font-medium">{cohort.month}</TableCell>
                            <TableCell>{cohort.totalUsers}</TableCell>

                            {/* Render Cells */}
                            {Array.from({ length: maxMonths + 1 }).map((_, i) => {
                                const dataPoint = cohort.data.find(d => d.monthIndex === i)

                                if (!dataPoint) {
                                    return <TableCell key={i} className="bg-slate-50/50" />
                                }

                                return (
                                    <TableCell
                                        key={i}
                                        className="text-center p-0 h-full"
                                    >
                                        <div
                                            className="h-full w-full py-4 flex flex-col items-center justify-center text-xs"
                                            style={{
                                                backgroundColor: getCellColor(dataPoint.value),
                                                color: getTextColor(dataPoint.value)
                                            }}
                                        >
                                            <span className="font-bold">
                                                {type === 'people'
                                                    ? `${dataPoint.absolute}`
                                                    : `$${dataPoint.value.toFixed(2)}`
                                                }
                                            </span>
                                            {type === 'people' && (
                                                <span className="opacity-80">
                                                    ({dataPoint.value.toFixed(1)}%)
                                                </span>
                                            )}
                                        </div>
                                    </TableCell>
                                )
                            })}
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    )
}
