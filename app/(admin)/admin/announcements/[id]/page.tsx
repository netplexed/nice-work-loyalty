'use client'

import { updateAnnouncement, getAnnouncementById, Announcement } from '@/app/actions/announcement-actions'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { useRouter } from 'next/navigation'
import { useState, useEffect, use } from 'react'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

export default function EditAnnouncementPage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter()
    const resolvedParams = use(params)
    const [loading, setLoading] = useState(false)
    const [fetching, setFetching] = useState(true)
    const [data, setData] = useState<Announcement | null>(null)

    useEffect(() => {
        const load = async () => {
            const item = await getAnnouncementById(resolvedParams.id)
            if (!item) {
                toast.error('Announcement not found')
                router.push('/admin/announcements')
                return
            }
            setData(item)
            setFetching(false)
        }
        load()
    }, [resolvedParams.id, router])

    async function handleSubmit(formData: FormData) {
        setLoading(true)
        try {
            const updateData = {
                title: formData.get('title') as string,
                content: formData.get('content') as string,
                image_url: formData.get('image_url') as string,
                action_url: formData.get('action_url') as string,
                action_label: formData.get('action_label') as string,
                active: formData.get('active') === 'on',
                priority: parseInt(formData.get('priority') as string) || 0,
                start_date: formData.get('start_date') ? new Date(formData.get('start_date') as string).toISOString() : new Date().toISOString()
            }

            await updateAnnouncement(resolvedParams.id, updateData)
            toast.success('Announcement updated!')
            router.push('/admin/announcements')
        } catch (e: any) {
            toast.error(e.message || 'Failed to update')
            setLoading(false)
        }
    }

    if (fetching) {
        return <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>
    }

    if (!data) return null

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold">Edit Announcement</h1>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Details</CardTitle>
                </CardHeader>
                <CardContent>
                    <form action={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="title">Title</Label>
                            <Input id="title" name="title" defaultValue={data.title} required />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="content">Content</Label>
                            <Textarea id="content" name="content" defaultValue={data.content} required />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="image_url">Image URL</Label>
                                <Input id="image_url" name="image_url" defaultValue={data.image_url} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="priority">Priority</Label>
                                <Input id="priority" name="priority" type="number" defaultValue={data.priority} min="0" />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="action_url">Action URL</Label>
                                <Input id="action_url" name="action_url" defaultValue={data.action_url} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="action_label">Action Button Label</Label>
                                <Input id="action_label" name="action_label" defaultValue={data.action_label} />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="start_date">Start Date</Label>
                                <Input
                                    id="start_date"
                                    name="start_date"
                                    type="datetime-local"
                                    defaultValue={data.start_date ? new Date(data.start_date).toISOString().slice(0, 16) : ''}
                                />
                            </div>
                        </div>

                        <div className="flex items-center gap-2 pt-2">
                            <Switch id="active" name="active" defaultChecked={data.active} />
                            <Label htmlFor="active">Active</Label>
                        </div>

                        <div className="pt-4 flex justify-end gap-2">
                            <Button type="button" variant="ghost" onClick={() => router.back()}>Cancel</Button>
                            <Button type="submit" disabled={loading}>
                                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                Save Changes
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
