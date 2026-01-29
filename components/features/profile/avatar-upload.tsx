'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Camera, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

interface AvatarUploadProps {
    profile: {
        id: string
        full_name: string | null
        avatar_url: string | null
    }
}

export function AvatarUpload({ profile }: AvatarUploadProps) {
    const [uploading, setUploading] = useState(false)
    const [avatarUrl, setAvatarUrl] = useState<string | null>(profile.avatar_url)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const router = useRouter()
    const supabase = createClient()

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        try {
            setUploading(true)
            if (!event.target.files || event.target.files.length === 0) {
                throw new Error('You must select an image to upload.')
            }

            const file = event.target.files[0]
            const fileExt = file.name.split('.').pop()
            const fileName = `${profile.id}/${Date.now()}.${fileExt}`
            const filePath = `${fileName}`

            // Upload image to Supabase Storage
            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file)

            if (uploadError) {
                throw uploadError
            }

            // Get Public URL
            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath)

            // Update Profile
            const { error: updateError } = await supabase
                .from('profiles')
                .update({ avatar_url: publicUrl })
                .eq('id', profile.id)

            if (updateError) {
                throw updateError
            }

            setAvatarUrl(publicUrl)
            toast.success('Profile picture updated!')
            router.refresh()

        } catch (error: any) {
            toast.error(error.message || 'Error uploading avatar')
        } finally {
            setUploading(false)
        }
    }

    return (
        <div className="relative group">
            <Avatar className="w-24 h-24 border-4 border-white shadow-lg cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                <AvatarImage src={avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.full_name}`} className="object-cover" />
                <AvatarFallback>{profile.full_name?.[0]}</AvatarFallback>
            </Avatar>

            <div
                className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
            >
                {uploading ? (
                    <Loader2 className="w-6 h-6 text-white animate-spin" />
                ) : (
                    <Camera className="w-6 h-6 text-white" />
                )}
            </div>

            <input
                type="file"
                id="avatar-upload"
                accept="image/*"
                onChange={handleFileChange}
                ref={fileInputRef}
                className="hidden"
                disabled={uploading}
            />
        </div>
    )
}
