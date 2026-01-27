import { WorkflowBuilder } from '@/components/admin/marketing/workflow-builder'
import { getEmailTemplates } from '@/app/actions/email-template-actions'
import { getAdminRewards } from '@/app/actions/admin-actions'
import { getMarketingWorkflow } from '@/app/actions/workflow-actions'
import { notFound } from 'next/navigation'

export default async function EditWorkflowPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params

    const [workflow, templates, rewards] = await Promise.all([
        getMarketingWorkflow(id),
        getEmailTemplates(),
        getAdminRewards()
    ])

    if (!workflow) {
        notFound()
    }

    return <WorkflowBuilder initialData={workflow} emailTemplates={templates} rewards={rewards} />
}
