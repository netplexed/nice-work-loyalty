'use client'

import { useState } from 'react'
import { QrReader } from 'react-qr-reader'
import { Button } from '@/components/ui/button'
import { Camera, X } from 'lucide-react'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"

interface VoucherScannerProps {
    onScan: (data: string) => void
}

export function VoucherScanner({ onScan }: VoucherScannerProps) {
    const [open, setOpen] = useState(false)

    const handleResult = (result: any, error: any) => {
        if (!!result) {
            onScan(result?.text)
            setOpen(false) // Close on success
        }
        if (!!error) {
            // console.info(error)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="secondary" className="gap-2">
                    <Camera className="w-4 h-4" />
                    Scan Camera
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-black text-white border-zinc-800">
                <DialogHeader className="absolute top-0 left-0 right-0 z-10 p-4 bg-gradient-to-b from-black/80 to-transparent">
                    <div className="flex justify-between items-center">
                        <DialogTitle className="text-white">Scan Voucher</DialogTitle>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="text-white hover:bg-white/20 h-8 w-8 rounded-full"
                            onClick={() => setOpen(false)}
                        >
                            <X className="w-5 h-5" />
                        </Button>
                    </div>
                </DialogHeader>

                <div className="relative aspect-square bg-black">
                    {open && (
                        <QrReader
                            onResult={handleResult}
                            constraints={{ facingMode: 'environment' }}
                            containerStyle={{ width: '100%', paddingTop: '100%' }}
                            videoStyle={{ objectFit: 'cover' }}
                            scanDelay={500}
                        />
                    )}

                    {/* Overlay Guidelines */}
                    <div className="absolute inset-0 border-[40px] border-black/50 pointer-events-none flex items-center justify-center">
                        <div className="w-full h-full border-2 border-white/50 rounded-lg relative">
                            <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-primary -mt-1 -ml-1"></div>
                            <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-primary -mt-1 -mr-1"></div>
                            <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-primary -mb-1 -ml-1"></div>
                            <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-primary -mb-1 -mr-1"></div>
                        </div>
                    </div>
                </div>

                <div className="p-4 text-center text-sm text-zinc-400 bg-black">
                    Point camera at the customer's QR code called "Voucher"
                </div>
            </DialogContent>
        </Dialog>
    )
}
