import Link from 'next/link'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Plus, Edit, Trash2, Workflow } from "lucide-react"
import { getMarketingWorkflows, deleteMarketingWorkflow, toggleWorkflowStatus } from '@/app/actions/workflow-actions'

export default async function WorkflowsPage() {
    const workflows = await getMarketingWorkflows()

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Marketing Workflows</h1>
                    <p className="text-muted-foreground">
                        Create custom automation flows triggered by events.
                    </p>
                </div>
                <Link href="/admin/marketing/workflows/new">
                    <Button>
                        <Plus className="mr-2 h-4 w-4" />
                        New Workflow
                    </Button>
                </Link>
            </div>

            <div className="grid gap-6">
                {workflows?.map((wf: any) => (
                    <Card key={wf.id} className="group relative hover:shadow-md transition-shadow">
                        <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                            <div className="space-y-1">
                                <CardTitle className="text-xl flex items-center gap-2">
                                    <Workflow className="h-5 w-5 text-indigo-500" />
                                    {wf.name}
                                </CardTitle>
                                <CardDescription>{wf.description || 'No description'}</CardDescription>
                            </div>
                            <div className="flex items-center gap-2">
                                <Badge variant={wf.active ? 'default' : 'secondary'}>
                                    {wf.active ? 'Active' : 'Inactive'}
                                </Badge>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center justify-between mt-4">
                                <div className="text-sm text-muted-foreground space-y-1">
                                    <p>Trigger: <Badge variant="outline">{wf.trigger_type} / {wf.trigger_config?.event || 'custom'}</Badge></p>
                                    <p>Steps: {wf.steps?.length || 0}</p>
                                    <p>Enrollments: {wf.enrollments?.[0]?.count || 0}</p>
                                </div>
                                <div className="flex gap-2">
                                    <form action={async () => {
                                        'use server'
                                        await toggleWorkflowStatus(wf.id, !wf.active)
                                    }}>
                                        <Button variant="outline" size="sm" type="submit">
                                            {wf.active ? 'Disable' : 'Enable'}
                                        </Button>
                                    </form>
                                    <Link href={`/admin/marketing/workflows/${wf.id}/edit`}>
                                        <Button variant="outline" size="sm">
                                            <Edit className="mr-2 h-4 w-4" />
                                            Edit
                                        </Button>
                                    </Link>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}

                {workflows?.length === 0 && (
                    <div className="text-center py-12 text-muted-foreground">
                        <p>No workflows found. Create your first custom automation!</p>
                    </div>
                )}
            </div>
        </div>
    )
}
