'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter
} from '@/components/ui/dialog'
import { deleteAccount } from '@/app/actions/delete-account'
import { toast } from 'sonner'
import { Trash2 } from 'lucide-react'

export function DeleteAccountDialog() {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)

    const handleDelete = async () => {
        setLoading(true)
        try {
            const result = await deleteAccount()
            if (!result.success) {
                throw new Error(result.error || 'Failed to delete account')
            }

            // Sign out client-side to clear session
            const supabase = createClient()
            await supabase.auth.signOut()
            localStorage.removeItem('supabase-backup-token')

            toast.success('Account deleted successfully')
            // Redirect to login page with deleted flag
            window.location.href = '/login?deleted=true'
        } catch (error: any) {
            toast.error(error.message)
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Account
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="text-destructive">Delete Account</DialogTitle>
                    <DialogDescription>
                        Are you sure you want to delete your account? This action cannot be undone.
                        All your points, rewards, and history will be permanently removed.
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter className="gap-2 sm:gap-0">
                    <Button variant="ghost" onClick={() => setOpen(false)} disabled={loading}>
                        Cancel
                    </Button>
                    <Button variant="destructive" onClick={handleDelete} disabled={loading}>
                        {loading ? 'Deleting...' : 'Yes, Delete My Account'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
