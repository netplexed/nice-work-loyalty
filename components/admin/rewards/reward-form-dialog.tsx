'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { createReward, updateReward } from '@/app/actions/admin-actions'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Loader2, Plus, Pen, Image as ImageIcon, Upload } from 'lucide-react'
import { Checkbox } from "@/components/ui/checkbox"

interface RewardFormDialogProps {
    reward?: any // If provided, it's edit mode
    trigger?: React.ReactNode
}

export function RewardFormDialog({ reward, trigger }: RewardFormDialogProps) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)

    // Form State
    const [name, setName] = useState('')
    const [description, setDescription] = useState('')
    const [pointsCost, setPointsCost] = useState('')
    const [category, setCategory] = useState('food')
    const [category, setCategory] = useState('food')
    const [imageUrl, setImageUrl] = useState('')
    const [imageFile, setImageFile] = useState<File | null>(null)
    const [inventory, setInventory] = useState('')
    const [selectedLocations, setSelectedLocations] = useState<string[]>([])

    const supabase = createClient()

    const LOCATIONS = [
        "Tanuki Raw",
        "Standing Sushi Bar"
    ]

    // Initialize form when reward changes or dialog opens
    useEffect(() => {
        if (reward) {
            setName(reward.name)
            setDescription(reward.description || '')
            setPointsCost(reward.points_cost.toString())
            setCategory(reward.category || 'food')
            setImageUrl(reward.image_url || '')
            setInventory(reward.inventory_remaining ? reward.inventory_remaining.toString() : '')
            setSelectedLocations(reward.locations || [])
        } else {
            // Reset if creating new
            setName('')
            setDescription('')
            setPointsCost('')
            setCategory('food')
            setPointsCost('')
            setCategory('food')
            setImageUrl('')
            setImageFile(null)
            setInventory('')
            setSelectedLocations([])
        }
    }, [reward, open])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            try {
                let finalImageUrl = imageUrl

                if (imageFile) {
                    const fileExt = imageFile.name.split('.').pop()
                    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
                    const { error: uploadError } = await supabase.storage
                        .from('rewards')
                        .upload(fileName, imageFile)

                    if (uploadError) throw uploadError

                    const { data: { publicUrl } } = supabase.storage
                        .from('rewards')
                        .getPublicUrl(fileName)

                    finalImageUrl = publicUrl
                }

                const payload = {
                    name,
                    description,
                    points_cost: parseInt(pointsCost),
                    category,
                    image_url: finalImageUrl,
                    inventory_remaining: inventory ? parseInt(inventory) : undefined,
                    locations: selectedLocations.length > 0 ? selectedLocations : undefined
                }

                if (reward) {
                    await updateReward(reward.id, payload)
                    toast.success('Reward updated successfully')
                } else {
                    await createReward(payload)
                    toast.success('Reward created successfully')
                }

                setOpen(false)
            } catch (error: any) {
                toast.error(error.message)
            } finally {
                setLoading(false)
            }
        }

    return (
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                    {trigger || (
                        reward ? (
                            <Button variant="ghost" size="icon"><Pen className="h-4 w-4" /></Button>
                        ) : (
                            <Button>
                                <Plus className="mr-2 h-4 w-4" /> Add Reward
                            </Button>
                        )
                    )}
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{reward ? 'Edit Reward' : 'Create New Reward'}</DialogTitle>
                        <DialogDescription>
                            {reward ? 'Update the details below.' : 'Add a new item to the redemption catalog.'}
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label>Name</Label>
                            <Input
                                placeholder="e.g. Free Coffee"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Description</Label>
                            <Textarea
                                placeholder="Details about the reward..."
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Points Cost</Label>
                                <Input
                                    type="number"
                                    placeholder="100"
                                    value={pointsCost}
                                    onChange={e => setPointsCost(e.target.value)}
                                    required
                                    min="1"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Category</Label>
                                <Select value={category} onValueChange={setCategory}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="food">Food</SelectItem>
                                        <SelectItem value="drink">Drink</SelectItem>
                                        <SelectItem value="merchandise">Merchandise</SelectItem>
                                        <SelectItem value="voucher">Voucher</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <Label>Valid Locations</Label>
                            <div className="flex flex-col gap-2">
                                {LOCATIONS.map((loc) => (
                                    <div key={loc} className="flex items-center space-x-2">
                                        <Checkbox
                                            id={loc}
                                            checked={selectedLocations.includes(loc)}
                                            onCheckedChange={(checked: boolean | string) => {
                                                if (checked === true) {
                                                    setSelectedLocations([...selectedLocations, loc])
                                                } else {
                                                    setSelectedLocations(selectedLocations.filter(l => l !== loc))
                                                }
                                            }}
                                        />
                                        <Label htmlFor={loc} className="font-normal cursor-pointer text-sm">{loc}</Label>
                                    </div>
                                ))}
                                <p className="text-[10px] text-muted-foreground">Leave unchecked to enable for "All Outlets".</p>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Current Inventory (Optional)</Label>
                            <Input
                                type="number"
                                placeholder="e.g. 50 (Leave empty for unlimited)"
                                value={inventory}
                                onChange={e => setInventory(e.target.value)}
                                min="0"
                            />
                            <p className="text-xs text-muted-foreground">Number of items available for redemption.</p>
                        </div>

                        <div className="space-y-2">
                            <Label>Reward Image</Label>
                            <div className="flex flex-col gap-4">
                                <div className="flex gap-4 items-start">
                                    <div className="grid w-full max-w-sm items-center gap-1.5">
                                        <Label htmlFor="picture" className="text-xs text-muted-foreground">Upload Image</Label>
                                        <Input
                                            id="picture"
                                            type="file"
                                            accept="image/*"
                                            onChange={e => {
                                                const file = e.target.files?.[0]
                                                if (file) {
                                                    setImageFile(file)
                                                    // Create local preview
                                                    const url = URL.createObjectURL(file)
                                                    setImageUrl(url)
                                                }
                                            }}
                                        />
                                    </div>
                                </div>

                                {imageUrl && (
                                    <div className="space-y-1">
                                        <Label className="text-xs text-muted-foreground">Preview</Label>
                                        <div className="relative h-40 w-full border rounded-md overflow-hidden bg-muted/20 flex items-center justify-center">
                                            <img src={imageUrl} alt="Preview" className="h-full w-full object-contain" />
                                        </div>
                                        <p className="text-[10px] text-muted-foreground break-all">{imageFile ? `Moving to storage on save...` : 'Current Image'}</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <DialogFooter>
                            <Button type="submit" disabled={loading}>
                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {reward ? 'Update Reward' : 'Create Reward'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        )
    }
