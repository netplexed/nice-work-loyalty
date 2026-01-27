import { WorkflowBuilder } from '@/components/admin/marketing/workflow-builder'
import { getEmailTemplates } from '@/app/actions/email-template-actions'
import { getAdminRewards } from '@/app/actions/admin-actions'

export default async function NewWorkflowPage() {
    const [templates, rewards] = await Promise.all([
        getEmailTemplates(),
        getAdminRewards()
    ])

    return <WorkflowBuilder emailTemplates={templates} rewards={rewards} />
}
