'use client'

import { Button } from "@/components/ui/button"
import { Eye, EyeOff, Loader2 } from "lucide-react"
import { toggleRewardStatus } from "@/app/actions/admin-actions"
import { useState } from "react"
import { toast } from "sonner"

export function ToggleRewardButton({ id, isActive }: { id: string, isActive: boolean }) {
    const [loading, setLoading] = useState(false)

    const handleToggle = async () => {
        setLoading(true)
        try {
            await toggleRewardStatus(id, !isActive)
            toast.success(isActive ? 'Reward deactivated' : 'Reward activated')
        } catch (error) {
            toast.error('Failed to update status')
        } finally {
            setLoading(false)
        }
    }

    return (
        <Button
            variant="ghost"
            size="icon"
            onClick={handleToggle}
            disabled={loading}
            title={isActive ? 'Deactivate' : 'Activate'}
        >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                isActive ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4 text-muted-foreground" />
            )}
        </Button>
    )
}
