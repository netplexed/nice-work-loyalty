import { getCohortStats, CohortType } from '@/app/actions/reporting-actions'
import { CohortTable } from '@/components/admin/reports/cohort-table'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import Link from 'next/link'

interface PageProps {
    searchParams: Promise<{ type?: string }>
}

export default async function CohortReportPage(props: PageProps) {
    const searchParams = await props.searchParams;
    const type = (searchParams.type as CohortType) || 'people'
    const data = await getCohortStats(type)

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Cohort Analysis</h1>
                <p className="text-muted-foreground mt-2">
                    Track user retention and spending behavior over time based on join month.
                </p>
            </div>

            <Tabs defaultValue={type} className="w-full">
                <TabsList>
                    <Link href="/admin/reports/cohort?type=people">
                        <TabsTrigger value="people">People (Retention)</TabsTrigger>
                    </Link>
                    <Link href="/admin/reports/cohort?type=spend">
                        <TabsTrigger value="spend">Spending (ARPU)</TabsTrigger>
                    </Link>
                </TabsList>
            </Tabs>

            <Card>
                <CardHeader>
                    <CardTitle>
                        {type === 'people' ? 'User Retention by Cohort' : 'Average Revenue Per User (ARPU)'}
                    </CardTitle>
                    <CardDescription>
                        {type === 'people'
                            ? 'Percentage of users who were active (visit or purchase) in subsequent months.'
                            : 'Average amount spent per user in subsequent months.'}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <CohortTable data={data} type={type} />
                </CardContent>
            </Card>
        </div>
    )
}
