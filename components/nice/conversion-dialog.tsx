'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { convertNiceToPoints } from '@/app/actions/nice-actions'
import { ArrowRight, Sparkles, X, Coins, ArrowLeftRight } from 'lucide-react'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"

interface ConversionDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    niceBalance: number
    onConvertSuccess: (niceAmount: number, pointsGained: number) => void
}

const CONVERSION_RATE = 4 // 4 Nice = 1 Point

export function ConversionDialog({ open, onOpenChange, niceBalance, onConvertSuccess }: ConversionDialogProps) {
    const [amountToConvert, setAmountToConvert] = useState<number>(0)
    const [isConverting, setIsConverting] = useState(false)

    const pointsToReceive = Math.floor(amountToConvert / CONVERSION_RATE)
    const maxConvertible = Math.floor(niceBalance)

    const handlePercentageClick = (percentage: number) => {
        setAmountToConvert(Math.floor(maxConvertible * percentage))
    }

    const handleConvert = async () => {
        if (amountToConvert < CONVERSION_RATE) return

        setIsConverting(true)
        try {
            await convertNiceToPoints(amountToConvert)

            // Close dialog and reset
            onOpenChange(false)
            setAmountToConvert(0)

            // Callback to update parent state
            onConvertSuccess(amountToConvert, pointsToReceive)

            toast.success('Conversion Successful!', {
                description: `You swapped ${amountToConvert} Nice for ${pointsToReceive} Points.`
            })
        } catch (error: any) {
            console.error(error)
            toast.error('Conversion Failed', {
                description: error.message || 'Please try again.'
            })
        } finally {
            setIsConverting(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl">
                        <ArrowLeftRight className="text-amber-500" /> Convert Nice to Points
                    </DialogTitle>
                    <DialogDescription>
                        Swap your earned Nice for Points. Rate: <strong>{CONVERSION_RATE} Nice = 1 Point</strong>
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">

                    {/* Visualizer */}
                    <div className="bg-slate-50 p-4 rounded-xl flex items-center justify-between relative overflow-hidden">
                        {/* Connecting Line Animation */}
                        {isConverting && (
                            <motion.div
                                className="absolute top-0 bottom-0 left-0 bg-blue-100/30 z-0"
                                initial={{ width: "0%" }}
                                animate={{ width: "100%" }}
                                transition={{ duration: 0.8, ease: "easeInOut" }}
                            />
                        )}

                        <div className="text-center flex-1 relative z-10">
                            <div className="text-2xl font-bold font-mono text-slate-700">{amountToConvert}</div>
                            <div className="text-xs text-slate-400 font-medium uppercase">Nice Paying</div>
                        </div>
                        <div className="text-slate-300 relative z-10 flex items-center justify-center">
                            <motion.div
                                animate={isConverting ? {
                                    x: [0, 3, -3, 0],
                                    scale: [1, 1.2, 1],
                                    color: "#3b82f6"
                                } : {}}
                                transition={{ repeat: Infinity, duration: 0.4 }}
                            >
                                <ArrowRight />
                            </motion.div>
                        </div>
                        <div className="text-center flex-1 relative z-10">
                            <div className="text-2xl font-bold font-mono text-blue-600">+{pointsToReceive}</div>
                            <div className="text-xs text-blue-400 font-medium uppercase">Points Receiving</div>
                        </div>
                    </div>

                    {/* Input Controls */}
                    <div className="space-y-4">
                        <div className="flex justify-between text-sm">
                            <Label>Amount to Convert</Label>
                            <span className="text-slate-400">Max: {maxConvertible}</span>
                        </div>

                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handlePercentageClick(0.25)}
                                className="flex-1 text-xs"
                                disabled={isConverting}
                            >
                                25%
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handlePercentageClick(0.5)}
                                className="flex-1 text-xs"
                                disabled={isConverting}
                            >
                                50%
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handlePercentageClick(1)}
                                className="flex-1 text-xs"
                                disabled={isConverting}
                            >
                                Max
                            </Button>
                        </div>

                        <Slider
                            value={[amountToConvert]}
                            max={maxConvertible}
                            step={1}
                            onValueChange={(vals) => setAmountToConvert(vals[0])}
                            className="py-4"
                            disabled={isConverting}
                        />

                        <div className="flex items-center gap-2 pt-2">
                            <Input
                                type="number"
                                value={amountToConvert}
                                onChange={(e) => setAmountToConvert(Math.min(Number(e.target.value), maxConvertible))}
                                className="font-mono text-lg"
                                disabled={isConverting}
                            />
                        </div>
                    </div>
                </div>

                <Button
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold transition-all"
                    size="lg"
                    disabled={amountToConvert < CONVERSION_RATE || isConverting}
                    onClick={handleConvert}
                >
                    {isConverting ? (
                        <motion.div
                            className="flex items-center gap-2"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                        >
                            <Sparkles className="animate-spin" size={18} /> Converting...
                        </motion.div>
                    ) : (
                        <>Convert for {pointsToReceive} Points</>
                    )}
                </Button>
            </DialogContent>
        </Dialog>
    )
}
