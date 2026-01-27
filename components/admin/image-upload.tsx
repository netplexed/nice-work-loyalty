'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Loader2, Upload, X, Image as ImageIcon } from 'lucide-react'
import { toast } from 'sonner'
import Image from 'next/image'

interface ImageUploadProps {
    value?: string
    onChange: (url: string) => void
    bucket?: string
}

export function ImageUpload({ value, onChange, bucket = 'announcements' }: ImageUploadProps) {
    const [uploading, setUploading] = useState(false)
    const supabase = createClient()
    const [mode, setMode] = useState<'upload' | 'url'>('upload')
    const [manualUrl, setManualUrl] = useState('')

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        try {
            setUploading(true)
            const file = e.target.files?.[0]
            if (!file) return

            const fileExt = file.name.split('.').pop()
            const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`
            const filePath = `${fileName}`

            const { error: uploadError } = await supabase.storage
                .from(bucket)
                .upload(filePath, file)

            if (uploadError) {
                throw uploadError
            }

            const { data: { publicUrl } } = supabase.storage
                .from(bucket)
                .getPublicUrl(filePath)

            onChange(publicUrl)
            toast.success('Image uploaded')
        } catch (error: any) {
            toast.error('Upload failed: ' + error.message)
        } finally {
            setUploading(false)
        }
    }

    const handleRemove = () => {
        onChange('')
        setManualUrl('')
    }

    const handleManualUrlSubmit = () => {
        if (manualUrl) {
            onChange(manualUrl)
        }
    }

    return (
        <div className="space-y-4 w-full">
            {value ? (
                <div className="relative aspect-video w-full max-w-sm rounded-lg overflow-hidden border bg-gray-100">
                    <img
                        src={value}
                        alt="Upload"
                        className="object-cover w-full h-full"
                    />
                    <Button
                        onClick={handleRemove}
                        size="icon"
                        variant="destructive"
                        className="absolute top-2 right-2 h-6 w-6"
                        type="button"
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>
            ) : (
                <div className="space-y-2">
                    <div className="flex gap-2 text-sm">
                        <button
                            type="button"
                            onClick={() => setMode('upload')}
                            className={`px-3 py-1 rounded-full transition-colors ${mode === 'upload' ? 'bg-black text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                        >
                            Upload File
                        </button>
                        <button
                            type="button"
                            onClick={() => setMode('url')}
                            className={`px-3 py-1 rounded-full transition-colors ${mode === 'url' ? 'bg-black text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                        >
                            Paste URL
                        </button>
                    </div>

                    {mode === 'upload' ? (
                        <div className="flex items-center justify-center w-full max-w-sm">
                            <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
                                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                    {uploading ? (
                                        <Loader2 className="w-8 h-8 text-gray-400 animate-spin mb-2" />
                                    ) : (
                                        <Upload className="w-8 h-8 text-gray-400 mb-2" />
                                    )}
                                    <p className="mb-2 text-sm text-gray-500">
                                        <span className="font-semibold">Click to upload</span> or drag and drop
                                    </p>
                                    <p className="text-xs text-gray-500">PNG, JPG, WEBP or GIF</p>
                                </div>
                                <Input
                                    type="file"
                                    className="hidden"
                                    accept="image/*"
                                    onChange={handleUpload}
                                    disabled={uploading}
                                />
                            </label>
                        </div>
                    ) : (
                        <div className="flex gap-2 w-full max-w-sm">
                            <Input
                                placeholder="https://giphy.com/..."
                                value={manualUrl}
                                onChange={(e) => setManualUrl(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleManualUrlSubmit())}
                            />
                            <Button type="button" onClick={handleManualUrlSubmit}>
                                Add
                            </Button>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
