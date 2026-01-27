import { TemplateForm } from '@/components/admin/marketing/template-form'
import { getEmailTemplate } from '@/app/actions/email-template-actions'
import { notFound } from 'next/navigation'

export default async function EditTemplatePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const template = await getEmailTemplate(id)

    if (!template) {
        notFound()
    }

    return <TemplateForm initialData={template} />
}
