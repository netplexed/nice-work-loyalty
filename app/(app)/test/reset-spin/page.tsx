'use client'

import { Button } from '@/components/ui/button'
import { resetDailySpin } from '@/app/actions/debug-actions'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { RotateCcw } from 'lucide-react'
import { useSpinWheel } from '@/hooks/use-spin-wheel'

export default function ResetSpinPage() {
    const { mutateStatus } = useSpinWheel()

    const handleReset = async () => {
        try {
            await resetDailySpin()
            await mutateStatus()
            toast.success('Spin history reset! You can spin again.')
        } catch (e) {
            toast.error('Failed to reset spin.')
        }
    }

    return (
        <div className="flex items-center justify-center min-h-[60vh] p-4">
            <Card className="w-full max-w-md border-destructive/20">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-destructive">
                        <RotateCcw className="w-5 h-5" />
                        Debug Tool
                    </CardTitle>
                    <CardDescription>
                        Reset your daily spin availability for testing purposes.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Button
                        variant="destructive"
                        className="w-full"
                        onClick={handleReset}
                    >
                        Reset My Daily Spin
                    </Button>
                </CardContent>
            </Card>
        </div>
    )
}
