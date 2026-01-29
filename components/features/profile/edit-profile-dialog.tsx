'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { updateUserProfile } from '@/app/actions/user-actions'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Loader2, Pen, Camera, RefreshCcw } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { mutate } from 'swr'
import { useRouter } from 'next/navigation'

interface EditProfileDialogProps {
    profile: any
}

const TANUKI_AVATARS = [
    '/images/tanuki-1.png',
    '/images/tanuki-2.png'
]

export function EditProfileDialog({ profile }: EditProfileDialogProps) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [fullName, setFullName] = useState(profile.full_name || '')
    const [email, setEmail] = useState(profile.email || '')
    const [phone, setPhone] = useState(profile.phone || '')
    const [birthday, setBirthday] = useState(profile.birthday || '')
    const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url || TANUKI_AVATARS[0])
    const fileInputRef = useRef<HTMLInputElement>(null)
    const supabase = createClient()
    const router = useRouter()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            await updateUserProfile({
                full_name: fullName,
                email: email,
                phone: phone || null,
                birthday: birthday || null,
                avatar_url: avatarUrl
            })

            toast.success('Profile updated')
            setOpen(false)

            // Invalidate SWR cache to force re-fetch on Profile page
            await mutate('user-profile')

            // Also refresh server components just in case
            router.refresh()

        } catch (error: any) {
            toast.error(error.message)
        } finally {
            setLoading(false)
        }
    }

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        try {
            if (!event.target.files || event.target.files.length === 0) return

            setLoading(true)
            const file = event.target.files[0]
            const fileExt = file.name.split('.').pop()
            const fileName = `${profile.id}/${Date.now()}.${fileExt}`
            const filePath = `${fileName}`

            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file)

            if (uploadError) throw uploadError

            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath)

            setAvatarUrl(publicUrl)
            toast.success('Image uploaded successfully')

        } catch (error: any) {
            toast.error(error.message || 'Error uploading image')
        } finally {
            setLoading(false)
            if (fileInputRef.current) {
                fileInputRef.current.value = ''
            }
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                    <Pen className="w-4 h-4 mr-2" /> Edit Profile
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Edit Profile</DialogTitle>
                    <DialogDescription>
                        Update your personal information.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="flex flex-col items-center gap-4 mb-4">
                        <div className="relative group">
                            <img
                                src={avatarUrl}
                                alt="Avatar Preview"
                                className="w-24 h-24 rounded-full border-4 border-primary object-cover bg-slate-100"
                            />
                        </div>

                        <div className="flex gap-2">
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                    >
                                        <RefreshCcw className="w-3 h-3 mr-2" />
                                        Use Tanuki
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-fit p-2">
                                    <div className="flex gap-2">
                                        {TANUKI_AVATARS.map((url, i) => (
                                            <button
                                                key={i}
                                                type="button"
                                                onClick={() => setAvatarUrl(url)}
                                                className="hover:scale-105 transition-transform"
                                            >
                                                <img
                                                    src={url}
                                                    className="w-12 h-12 rounded-full border border-slate-200"
                                                    alt={`Tanuki ${i + 1}`}
                                                />
                                            </button>
                                        ))}
                                    </div>
                                </PopoverContent>
                            </Popover>

                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={loading}
                            >
                                <Camera className="w-3 h-3 mr-2" />
                                Change Picture
                            </Button>
                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                accept="image/*"
                                onChange={handleFileChange}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                            id="email"
                            type="email"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="name">Full Name</Label>
                        <Input
                            id="name"
                            value={fullName}
                            onChange={e => setFullName(e.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="phone">Phone Number</Label>
                        <Input
                            id="phone"
                            type="tel"
                            placeholder="+65 1234 5678"
                            value={phone}
                            onChange={e => setPhone(e.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="birthday">Date of Birth</Label>
                        <Input
                            id="birthday"
                            type="date"
                            value={birthday}
                            onChange={e => setBirthday(e.target.value)}
                        />
                    </div>
                    <DialogFooter>
                        <Button type="submit" disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save Changes
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog >
    )
}
