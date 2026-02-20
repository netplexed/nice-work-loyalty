'use client'

import { updateAnnouncement, getAnnouncementById, Announcement } from '@/app/actions/announcement-actions'
import { ImageUpload } from '@/components/admin/image-upload'
import { RichTextEditor } from '@/components/admin/rich-text-editor'
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

    // Controlled states
    const [imageUrl, setImageUrl] = useState('')
    const [content, setContent] = useState('')

    useEffect(() => {
        const load = async () => {
            const item = await getAnnouncementById(resolvedParams.id)
            if (!item) {
                toast.error('Announcement not found')
                router.push('/admin/announcements')
                return
            }
            setData(item)
            setImageUrl(item.image_url || '')
            setContent(item.content || '')
            setFetching(false)
        }
        load()
    }, [resolvedParams.id, router])

    async function handleSubmit(formData: FormData) {
        setLoading(true)
        try {
            const updateData = {
                title: formData.get('title') as string,
                content: content,
                image_url: imageUrl,
                action_url: formData.get('action_url') as string,
                action_label: formData.get('action_label') as string,
                send_push: formData.get('send_push') === 'on',
                active: formData.get('active') === 'on',
                priority: parseInt(formData.get('priority') as string) || 0,
                start_date: formData.get('start_date') ? new Date(formData.get('start_date') as string).toISOString() : new Date().toISOString(),
                end_date: formData.get('end_date') ? new Date(formData.get('end_date') as string).toISOString() : undefined
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
                            <Label>Image</Label>
                            <ImageUpload value={imageUrl} onChange={setImageUrl} />
                        </div>

                        <div className="space-y-2">
                            <Label>Content</Label>
                            <RichTextEditor value={content} onChange={setContent} />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="priority">Priority</Label>
                                <Input id="priority" name="priority" type="number" defaultValue={data.priority} min="0" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="active">Status</Label>
                                <div className="flex items-center gap-2 h-10 border rounded-md px-3">
                                    <Switch id="active" name="active" defaultChecked={data.active} />
                                    <Label htmlFor="active" className="cursor-pointer">Active</Label>
                                </div>
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
                            <div className="space-y-2">
                                <Label htmlFor="end_date">End Date</Label>
                                <Input
                                    id="end_date"
                                    name="end_date"
                                    type="datetime-local"
                                    defaultValue={data.end_date ? new Date(data.end_date).toISOString().slice(0, 16) : ''}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="send_push">Push Notification</Label>
                                <div className="flex items-center gap-2 h-10 border rounded-md px-3">
                                    <Switch id="send_push" name="send_push" defaultChecked={data.send_push ?? true} />
                                    <Label htmlFor="send_push" className="cursor-pointer">Send push notification</Label>
                                </div>
                            </div>
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
