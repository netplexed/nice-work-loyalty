import { getAllAnnouncements, deleteAnnouncement } from '@/app/actions/announcement-actions'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Plus, Trash2, Edit, Megaphone } from 'lucide-react'
import Link from 'next/link'
import { revalidatePath } from 'next/cache'

export default async function AdminAnnouncementsPage() {
    const announcements = await getAllAnnouncements()

    const getStatus = (item: any) => {
        const now = new Date()
        const start = new Date(item.start_date)
        const end = item.end_date ? new Date(item.end_date) : null

        if (!item.active) return { label: 'Draft', color: 'bg-gray-100 text-gray-600' }
        if (start > now) return { label: 'Scheduled', color: 'bg-blue-100 text-blue-700' }
        if (end && end < now) return { label: 'Expired', color: 'bg-yellow-100 text-yellow-700' }
        return { label: 'Active', color: 'bg-emerald-100 text-emerald-700' }
    }

    // Helper to strip HTML for preview
    const stripHtml = (html: string) => {
        return html.replace(/<[^>]*>?/gm, '')
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Announcements</h1>
                    <p className="text-muted-foreground">Manage news and updates shown on the user dashboard.</p>
                </div>
                <Button asChild>
                    <Link href="/admin/announcements/new">
                        <Plus className="w-4 h-4 mr-2" />
                        Create New
                    </Link>
                </Button>
            </div>

            <div className="grid gap-4">
                {announcements.length === 0 ? (
                    <div className="p-8 text-center bg-gray-50 border rounded-xl border-dashed">
                        <Megaphone className="w-12 h-12 mx-auto text-gray-300 mb-2" />
                        <p className="text-muted-foreground">No announcements yet.</p>
                    </div>
                ) : (
                    announcements.map((item) => {
                        const status = getStatus(item)
                        return (
                            <Card key={item.id} className="overflow-hidden">
                                <CardContent className="p-0 flex items-stretch">
                                    <div className="w-32 bg-gray-100 flex-shrink-0 relative">
                                        {item.image_url ? (
                                            <img src={item.image_url} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-gray-300">
                                                <Megaphone className="w-6 h-6" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1 p-4 flex flex-col justify-between">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${status.color}`}>
                                                    {status.label}
                                                </span>
                                                <h3 className="font-semibold">{item.title}</h3>
                                            </div>
                                            <p className="text-sm text-gray-500 line-clamp-2">{stripHtml(item.content)}</p>
                                        </div>
                                        <div className="flex gap-4 text-xs text-gray-400 mt-2">
                                            <span>Priority: {item.priority}</span>
                                            <span>Start: {new Date(item.start_date).toLocaleDateString()}</span>
                                            {item.end_date && <span>End: {new Date(item.end_date).toLocaleDateString()}</span>}
                                        </div>
                                    </div>
                                    <div className="p-4 flex flex-col gap-2 justify-center border-l bg-gray-50/50">
                                        <Button variant="ghost" size="icon" asChild>
                                            <Link href={`/admin/announcements/${item.id}`}>
                                                <Edit className="w-4 h-4 text-blue-600" />
                                            </Link>
                                        </Button>
                                        <form action={async () => {
                                            'use server'
                                            await deleteAnnouncement(item.id)
                                        }}>
                                            <Button variant="ghost" size="icon" className="hover:bg-red-50">
                                                <Trash2 className="w-4 h-4 text-red-600" />
                                            </Button>
                                        </form>
                                    </div>
                                </CardContent>
                            </Card>
                        )
                    })
                )}
            </div>
        </div>
    )
}
