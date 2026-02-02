'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Plus, Trash2, Edit, Loader2 } from 'lucide-react'
import { SpinPrizeForm } from '@/components/admin/spin-wheel/spin-prize-form'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'

export default function SpinWheelAdminPage() {
    const [prizes, setPrizes] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [formOpen, setFormOpen] = useState(false)
    const [editingPrize, setEditingPrize] = useState<any>(null)
    const supabase = createClient()

    const fetchPrizes = async () => {
        setLoading(true)
        const { data, error } = await supabase
            .from('spin_prizes')
            .select('*, rewards(name)')
            .eq('active', true)
            .order('probability', { ascending: false })

        if (error) {
            toast.error('Failed to load prizes')
        } else {
            setPrizes(data || [])
        }
        setLoading(false)
    }

    useEffect(() => {
        fetchPrizes()
    }, [])

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to remove this prize?')) return

        // Soft delete (set active = false)
        const { error } = await supabase
            .from('spin_prizes')
            .update({ active: false })
            .eq('id', id)

        if (error) {
            toast.error('Failed to delete prize')
        } else {
            toast.success('Prize removed')
            fetchPrizes()
        }
    }

    const handleEdit = (prize: any) => {
        setEditingPrize(prize)
        setFormOpen(true)
    }

    const handleAdd = () => {
        setEditingPrize(null)
        setFormOpen(true)
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Spin Wheel Configuration</h1>
                    <p className="text-muted-foreground">Manage the prizes and probabilities for the daily spin.</p>
                </div>
                <Button onClick={handleAdd}>
                    <Plus className="mr-2 h-4 w-4" /> Add Segment
                </Button>
            </div>

            {loading ? (
                <div className="flex justify-center items-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {prizes.map((prize) => (
                        <Card key={prize.id} className="relative overflow-hidden group">
                            <div
                                className="absolute top-0 left-0 w-1 h-full"
                                style={{ backgroundColor: prize.color }}
                            />
                            <CardHeader className="pl-6 pb-2">
                                <div className="flex justify-between items-start">
                                    <div className="space-y-1">
                                        <CardTitle className="text-lg">{prize.label}</CardTitle>
                                        <Badge variant="outline" className="capitalize">
                                            {prize.type}
                                        </Badge>
                                    </div>
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button variant="ghost" size="icon" onClick={() => handleEdit(prize)}>
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDelete(prize.id)}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="pl-6 text-sm text-muted-foreground space-y-2">
                                {prize.type === 'points' && (
                                    <div>Value: <span className="font-medium text-foreground">{prize.points_value} pts</span></div>
                                )}
                                {prize.type === 'nice' && (
                                    <div>Value: <span className="font-medium text-foreground">{prize.points_value} Nice</span></div>
                                )}
                                {prize.type === 'reward' && (
                                    <div>Reward: <span className="font-medium text-foreground">{prize.rewards?.name || 'Unknown'}</span></div>
                                )}
                                <div className="flex items-center gap-2">
                                    <span>Weight: {prize.probability}</span>
                                    <div className="h-2 flex-1 bg-muted rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-primary/50"
                                            style={{ width: `${Math.min(prize.probability * 100, 100)}%` }} // Visual approx
                                        />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}

                    {prizes.length === 0 && (
                        <div className="col-span-full text-center py-12 border border-dashed rounded-lg bg-muted/20">
                            <p className="text-muted-foreground">No active prizes found.</p>
                            <Button variant="link" onClick={handleAdd}>Create your first prize segment</Button>
                        </div>
                    )}
                </div>
            )}

            <SpinPrizeForm
                open={formOpen}
                onOpenChange={setFormOpen}
                initialData={editingPrize}
                onSuccess={fetchPrizes}
            />
        </div>
    )
}
