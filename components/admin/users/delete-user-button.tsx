'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { adminDeleteUser } from '@/app/actions/admin-actions'

type DeleteUserButtonProps = {
    userId: string
    userLabel: string
}

export function DeleteUserButton({ userId, userLabel }: DeleteUserButtonProps) {
    const [loading, setLoading] = useState(false)
    const router = useRouter()

    const handleDelete = async () => {
        const confirmed = window.confirm(`Delete user "${userLabel}"? This action cannot be undone.`)
        if (!confirmed) return

        setLoading(true)
        try {
            await adminDeleteUser(userId)
            toast.success('User deleted')
            router.refresh()
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Failed to delete user'
            toast.error(message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <Button
            variant="destructive"
            size="icon"
            onClick={handleDelete}
            disabled={loading}
            title="Delete user"
        >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
        </Button>
    )
}
