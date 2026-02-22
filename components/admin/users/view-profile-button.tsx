'use client'

import { useState } from 'react'
import { UserProfileDrawer } from './user-profile-drawer'

export function ViewProfileButton({ userId, userName }: { userId: string, userName: string }) {
    const [open, setOpen] = useState(false)

    return (
        <>
            <button
                onClick={() => setOpen(true)}
                className="text-left hover:underline focus:outline-none focus:ring-2 focus:ring-ring rounded-sm font-medium"
            >
                {userName}
            </button>
            {open && <UserProfileDrawer userId={userId} onClose={() => setOpen(false)} />}
        </>
    )
}
