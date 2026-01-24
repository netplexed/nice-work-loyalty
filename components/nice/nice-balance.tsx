import { motion, useSpring, useTransform } from 'framer-motion'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { ArrowLeftRight } from 'lucide-react'
import { ConversionDialog } from './conversion-dialog'

interface NiceBalanceProps {
    balance: number
    onSwapSuccess?: (pointsGained: number) => void
}

export function NiceBalance({ balance, onSwapSuccess }: NiceBalanceProps) {
    const [showConversion, setShowConversion] = useState(false)

    const spring = useSpring(balance, {
        mass: 0.8,
        stiffness: 75,
        damping: 15
    })

    const display = useTransform(spring, (current) => Math.round(current).toLocaleString())

    useEffect(() => {
        spring.set(balance)
    }, [balance, spring])

    return (
        <div className="bg-slate-900 text-white rounded-xl p-4 flex items-center justify-between shadow-lg">
            <div>
                <div className="text-slate-400 text-xs uppercase tracking-wider font-semibold">Your Balance</div>
                <div className="text-2xl font-bold font-mono text-amber-400">
                    <motion.span>{display}</motion.span> <span className="text-sm text-slate-400 font-sans font-normal">nice</span>
                </div>
            </div>

            <Button
                size="sm"
                variant="outline"
                className="bg-white/10 border-white/10 hover:bg-white/20 text-white border-0"
                onClick={() => setShowConversion(true)}
            >
                <ArrowLeftRight className="mr-2" size={14} /> Swap for points
            </Button>

            <ConversionDialog
                open={showConversion}
                onOpenChange={setShowConversion}
                niceBalance={balance}
                onConvertSuccess={(nice, points) => {
                    // Animation will handle value update automatically via props
                    if (onSwapSuccess) onSwapSuccess(points);
                }}
            />
        </div>
    )
}
