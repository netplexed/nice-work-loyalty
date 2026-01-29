'use client'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog'
import { ZoomIn } from 'lucide-react'

interface AvatarUploadProps {
    profile: {
        id: string
        full_name: string | null
        avatar_url: string | null
    }
}

export function AvatarUpload({ profile }: AvatarUploadProps) {
    const avatarUrl = profile.avatar_url || '/images/tanuki-1.png'

    return (
        <Dialog>
            <DialogTrigger asChild>
                <div className="relative group cursor-pointer inline-block">
                    <Avatar className="w-24 h-24 border-4 border-white shadow-lg transition-transform group-hover:scale-105">
                        <AvatarImage src={avatarUrl} className="object-cover" />
                        <AvatarFallback>{profile.full_name?.[0]}</AvatarFallback>
                    </Avatar>

                    <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                        <ZoomIn className="w-8 h-8 text-white drop-shadow-md" />
                    </div>
                </div>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] flex items-center justify-center bg-transparent border-none shadow-none p-0">
                <div className="relative w-80 h-80 sm:w-96 sm:h-96 rounded-full overflow-hidden border-4 border-white shadow-2xl">
                    <img
                        src={avatarUrl}
                        alt={profile.full_name || 'Avatar'}
                        className="w-full h-full object-cover"
                    />
                </div>
            </DialogContent>
        </Dialog>
    )
}
