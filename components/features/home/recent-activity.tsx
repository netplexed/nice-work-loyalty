'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useEffect, useState } from 'react'
import { getPointsHistory } from '@/app/actions/user-actions'
import { format } from 'date-fns'

export function RecentActivity() {
    const [history, setHistory] = useState<any[]>([])

    useEffect(() => {
        getPointsHistory(5).then(setHistory)
    }, [])

    return (
        <div className="space-y-4">
            <h2 className="text-lg font-semibold px-1">Recent Activity</h2>
            <div className="space-y-3">
                {history.length === 0 ? (
                    <Card className="bg-gray-50 border-dashed">
                        <CardContent className="p-8 text-center text-muted-foreground text-sm">
                            No recent activity yet.
                            <br />
                            Start earning points today!
                        </CardContent>
                    </Card>
                ) : (
                    history.map((item) => (
                        <Card key={item.id} className="overflow-hidden">
                            <div className="flex items-center p-4 gap-4">
                                <div className={`
                   w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold shrink-0
                   ${item.points > 0
                                        ? 'bg-green-100 text-green-700'
                                        : item.points === 0
                                            ? 'bg-blue-50 text-blue-600'
                                            : 'bg-orange-100 text-orange-700'}
                 `}>
                                    {item.points > 0 ? '+' : ''}{item.points}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">{item.description}</p>
                                    <p className="text-xs text-muted-foreground">
                                        {format(new Date(item.created_at), 'MMM d, yyyy • h:mm a')}
                                    </p>
                                </div>
                            </div>
                        </Card>
                    ))
                )}
            </div>
        </div>
    )
}
