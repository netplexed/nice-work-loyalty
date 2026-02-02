'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { createWeeklyDrawingAdmin, executeDrawingAdmin } from '@/app/actions/admin-lottery-actions'
import { toast } from 'sonner'
import { Loader2, Plus, Play } from 'lucide-react'

export function LotteryManagementButtons() {
    const [isPending, startTransition] = useTransition()

    const handleCreate = () => {
        startTransition(async () => {
            try {
                await createWeeklyDrawingAdmin()
                toast.success('New lottery drawing created')
            } catch (error: any) {
                toast.error(error.message)
            }
        })
    }

    return (
        <Button onClick={handleCreate} disabled={isPending}>
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
            Create Weekly Drawing
        </Button>
    )
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
