import { getAllAnnouncements, deleteAnnouncement } from '@/app/actions/announcement-actions'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Plus, Trash2, Edit, Megaphone } from 'lucide-react'
import Link from 'next/link'
import { revalidatePath } from 'next/cache'

export default async function AdminAnnouncementsPage() {
    const announcements = await getAllAnnouncements()

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
                    announcements.map((item) => (
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
                                    {!item.active && (
                                        <div className="absolute inset-0 bg-white/50 flex items-center justify-center">
                                            <span className="bg-gray-800 text-white text-xs px-2 py-1 rounded">Inactive</span>
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 p-4 flex flex-col justify-between">
                                    <div>
                                        <h3 className="font-semibold">{item.title}</h3>
                                        <p className="text-sm text-gray-500 line-clamp-1">{item.content}</p>
                                    </div>
                                    <div className="flex gap-2 text-xs text-gray-400 mt-2">
                                        <span>Priority: {item.priority}</span>
                                        <span>•</span>
                                        <span>Start: {new Date(item.start_date).toLocaleDateString()}</span>
                                    </div>
                                </div>
                                <div className="p-4 flex flex-col gap-2 justify-center border-l bg-gray-50/50">
                                    <Button variant="ghost" size="icon" asChild>
                                        {/* Edit Link (To be implemented) */}
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
                    ))
                )}
            </div>
        </div>
    )
}
