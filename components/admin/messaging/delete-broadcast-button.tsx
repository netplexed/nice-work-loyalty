'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Trash2 } from 'lucide-react'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import { deleteBroadcast } from '@/app/actions/messaging-actions'
import { toast } from 'sonner'

interface DeleteBroadcastButtonProps {
    id: string
    title: string
}

export function DeleteBroadcastButton({ id, title }: DeleteBroadcastButtonProps) {
    const [open, setOpen] = useState(false)
    const [isLoading, setIsLoading] = useState(false)

    async function handleDelete() {
        setIsLoading(true)
        try {
            const result = await deleteBroadcast(id)
            if (result.success) {
                toast.success('Message deleted successfully')
                setOpen(false)
            } else {
                toast.error('Failed to delete message')
            }
        } catch (error: any) {
            toast.error(error.message || 'Something went wrong')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive/90 hover:bg-destructive/10">
                    <Trash2 className="h-4 w-4" />
                    <span className="sr-only">Delete</span>
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Delete Message</DialogTitle>
                    <DialogDescription>
                        Are you sure you want to delete the broadcast "{title}"? This will also remove the notification for all users who received it. This action cannot be undone.
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter className="gap-2 sm:gap-0">
                    <Button variant="outline" onClick={() => setOpen(false)} disabled={isLoading}>
                        Cancel
                    </Button>
                    <Button variant="destructive" onClick={handleDelete} disabled={isLoading}>
                        {isLoading ? 'Deleting...' : 'Delete Message'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
