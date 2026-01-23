'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { updateUserProfile } from '@/app/actions/user-actions'
import { toast } from 'sonner'
import { Loader2, Pen } from 'lucide-react'

interface EditProfileDialogProps {
    profile: any
}

export function EditProfileDialog({ profile }: EditProfileDialogProps) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [fullName, setFullName] = useState(profile.full_name || '')
    const [email, setEmail] = useState(profile.email || '')
    const [phone, setPhone] = useState(profile.phone || '')
    const [birthday, setBirthday] = useState(profile.birthday || '')
    const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url || '')

    // Default Tanuki Avatars
    const TANUKI_AVATAR = "https://images.unsplash.com/photo-1618641986557-6ecd23ff938f?q=80&w=200&auto=format&fit=crop"

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            await updateUserProfile({
                full_name: fullName,
                email: email,
                phone: phone || null,
                birthday: birthday || null,
                avatar_url: avatarUrl || TANUKI_AVATAR // Default to Tanuki if empty
            })
            toast.success('Profile updated')
            setOpen(false)
            // Ideally we'd trigger a refresh or update local state, but revalidatePath in action handles next visit
            // For immediate UI update, we might ultimately need to hoist state or reload page
            window.location.reload()
        } catch (error: any) {
            toast.error(error.message)
        } finally {
            setLoading(false)
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
                        <img
                            src={avatarUrl || TANUKI_AVATAR}
                            alt="Avatar Preview"
                            className="w-24 h-24 rounded-full border-4 border-primary object-cover"
                        />
                        <div className="flex gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setAvatarUrl(TANUKI_AVATAR)}
                            >
                                Use Tanuki
                            </Button>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setAvatarUrl(`https://api.dicebear.com/7.x/avataaars/svg?seed=${fullName}`)}
                            >
                                Use Cartoon
                            </Button>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="avatar">Avatar URL (Optional)</Label>
                        <Input
                            id="avatar"
                            value={avatarUrl}
                            onChange={e => setAvatarUrl(e.target.value)}
                            placeholder="https://..."
                        />
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
