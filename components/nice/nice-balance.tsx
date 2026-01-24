import { motion, useSpring, useTransform } from 'framer-motion'
import { useEffect } from 'react'

interface NiceBalanceProps {
    balance: number
}

export function NiceBalance({ balance }: NiceBalanceProps) {
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

        </div>
    )
}
