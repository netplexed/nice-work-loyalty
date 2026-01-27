import Link from 'next/link'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, Edit, Trash2 } from "lucide-react"
import { getEmailTemplates, deleteEmailTemplate } from '@/app/actions/email-template-actions'
import { format } from 'date-fns'

export default async function TemplatesPage() {
    const templates = await getEmailTemplates()

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Email Templates</h1>
                    <p className="text-muted-foreground">
                        Manage reusable email templates for campaigns and automations.
                    </p>
                </div>
                <Link href="/admin/marketing/templates/new">
                    <Button>
                        <Plus className="mr-2 h-4 w-4" />
                        New Template
                    </Button>
                </Link>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {templates?.map((template: any) => (
                    <Card key={template.id} className="group relative hover:shadow-lg transition-shadow">
                        <CardHeader>
                            <CardTitle className="text-xl flex justify-between items-start gap-2">
                                <span className="truncate">{template.name}</span>
                            </CardTitle>
                            <CardDescription className="line-clamp-2 min-h-[40px]">
                                {template.description || 'No description'}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2 text-sm text-muted-foreground">
                                <p>Subject: <span className="text-foreground">{template.subject}</span></p>
                                <p>Updated: {format(new Date(template.updated_at), 'MMM d, yyyy')}</p>
                            </div>
                            <div className="mt-4 flex gap-2">
                                <Link href={`/admin/marketing/templates/${template.id}`} className="flex-1">
                                    <Button variant="outline" className="w-full">
                                        <Edit className="mr-2 h-4 w-4" />
                                        Edit
                                    </Button>
                                </Link>
                                <form action={async () => {
                                    'use server'
                                    await deleteEmailTemplate(template.id)
                                }}>
                                    <Button variant="destructive" size="icon" type="submit">
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </form>
                            </div>
                        </CardContent>
                    </Card>
                ))}

                {templates?.length === 0 && (
                    <div className="col-span-full text-center py-12 text-muted-foreground">
                        <p>No templates found. Create your first one!</p>
                    </div>
                )}
            </div>
        </div>
    )
}
