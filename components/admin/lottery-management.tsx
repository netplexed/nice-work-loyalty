'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { CreateLotteryDialog } from '@/components/admin/create-lottery-dialog'
import { executeDrawingAdmin } from '@/app/actions/admin-lottery-actions'
import { toast } from 'sonner'
import { Loader2, Play } from 'lucide-react'

// This component is now just a container for the dialog, or we can export the dialog directly
// For backward compatibility with the page usage, let's keep the name but render the dialog
export function LotteryManagementButtons() {
    return <CreateLotteryDialog />
}

export function ExecuteDrawingButton({ drawingId }: { drawingId: string }) {
    const [isPending, startTransition] = useTransition()

    const handleExecute = () => {
        if (!confirm('Are you sure you want to execute this drawing now?')) return

        startTransition(async () => {
            try {
                const result = await executeDrawingAdmin(drawingId)
                if (result.success) {
                    toast.success('Drawing executed successfully!')
                } else {
                    toast.error('Failed: ' + result.error)
                }
            } catch (error: any) {
                toast.error('Error: ' + error.message)
            }
        })
    }

    return (
        <Button variant="destructive" size="sm" onClick={handleExecute} disabled={isPending}>
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
            Execute Drawing
        </Button>
    )
}

import { cancelLotteryDrawingAdmin } from '@/app/actions/admin-lottery-actions'
import { Ban } from 'lucide-react'

export function CancelDrawingButton({ drawingId }: { drawingId: string }) {
    const [isPending, startTransition] = useTransition()

    const handleCancel = () => {
        if (!confirm('Are you sure you want to CANCEL this drawing?\n\nThis will refund all purchased tickets to users.')) return

        startTransition(async () => {
            try {
                await cancelLotteryDrawingAdmin(drawingId)
                toast.success('Drawing cancelled and refunds processed.')
            } catch (error: any) {
                toast.error('Error: ' + error.message)
            }
        })
    }

    return (
        <Button variant="outline" size="icon" onClick={handleCancel} disabled={isPending} title="Cancel Drawing" className="text-muted-foreground hover:text-red-500">
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ban className="h-4 w-4" />}
        </Button>
    )
}
