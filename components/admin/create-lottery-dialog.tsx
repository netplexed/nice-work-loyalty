'use client'

import { useState, useTransition } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Plus, Calendar } from 'lucide-react'
import { createLotteryDrawingAdmin } from '@/app/actions/admin-lottery-actions'
import { toast } from 'sonner'

export function CreateLotteryDialog() {
    const [open, setOpen] = useState(false)
    const [isPending, startTransition] = useTransition()

    // Default values
    const [description, setDescription] = useState('Weekly 1000 Nice Prize')
    const [value, setValue] = useState('1000')
    const [drawDate, setDrawDate] = useState('')

    // Initialize date to next Sunday 8PM on mount/open would be nice, but simple default is fine

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()

        if (!drawDate) {
            toast.error('Please select a draw date')
            return
        }

        const dateObj = new Date(drawDate)
        if (dateObj < new Date()) {
            toast.error('Draw date must be in the future')
            return
        }

        startTransition(async () => {
            try {
                await createLotteryDrawingAdmin({
                    prizeDescription: description,
                    prizeValue: parseInt(value),
                    drawDate: dateObj.toISOString()
                })
                toast.success('Lottery drawing created successfully')
                setOpen(false)
            } catch (error: any) {
                toast.error('Failed to create lottery: ' + error.message)
            }
        })
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    New Drawing
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>Create New Lottery</DialogTitle>
                        <DialogDescription>
                            Set the prize and schedule for the next lottery drawing.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="description" className="text-right">
                                Prize
                            </Label>
                            <Input
                                id="description"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="col-span-3"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="value" className="text-right">
                                Value (Nice)
                            </Label>
                            <Input
                                id="value"
                                type="number"
                                value={value}
                                onChange={(e) => setValue(e.target.value)}
                                className="col-span-3"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="date" className="text-right">
                                Draw Date
                            </Label>
                            <div className="col-span-3 relative">
                                <Input
                                    id="date"
                                    type="datetime-local"
                                    value={drawDate}
                                    onChange={(e) => setDrawDate(e.target.value)}
                                    className="w-full block"
                                />
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="submit" disabled={isPending}>
                            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Create Drawing
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
