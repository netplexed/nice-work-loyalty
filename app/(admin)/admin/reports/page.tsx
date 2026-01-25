import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Users } from "lucide-react"
import Link from "next/link"

export default function ReportsPage() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
                <p className="text-muted-foreground mt-2">
                    Detailed analysis and insights.
                </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Link href="/admin/reports/cohort">
                    <Card className="hover:bg-slate-50 transition-colors cursor-pointer h-full">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Users className="h-5 w-5" />
                                Cohort Analysis
                            </CardTitle>
                            <CardDescription>
                                Analyze user retention and spending behavior over time.
                            </CardDescription>
                        </CardHeader>
                    </Card>
                </Link>

                <Link href="/admin/reports/points-summary">
                    <Card className="hover:bg-slate-50 transition-colors cursor-pointer h-full">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Users className="h-5 w-5" />
                                Points Summary by Date
                            </CardTitle>
                            <CardDescription>
                                Daily breakdown of points awarded, redeemed, and adjusted.
                            </CardDescription>
                        </CardHeader>
                    </Card>
                </Link>

                <Link href="/admin/reports/store-activity">
                    <Card className="hover:bg-slate-50 transition-colors cursor-pointer h-full">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Users className="h-5 w-5" />
                                Activity by Store
                            </CardTitle>
                            <CardDescription>
                                Revenue and visit stats breakdown per location.
                            </CardDescription>
                        </CardHeader>
                    </Card>
                </Link>

                <Link href="/admin/reports/top-members">
                    <Card className="hover:bg-slate-50 transition-colors cursor-pointer h-full">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Users className="h-5 w-5" />
                                Top Members
                            </CardTitle>
                            <CardDescription>
                                Leaderboard by lifetime points earned.
                            </CardDescription>
                        </CardHeader>
                    </Card>
                </Link>

                <Link href="/admin/reports/activity-by-tier">
                    <Card className="hover:bg-slate-50 transition-colors cursor-pointer h-full">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Users className="h-5 w-5" />
                                Activity by Tier
                            </CardTitle>
                            <CardDescription>
                                Breakdown of members by Nice Level.
                            </CardDescription>
                        </CardHeader>
                    </Card>
                </Link>
            </div>
        </div>
    )
}
