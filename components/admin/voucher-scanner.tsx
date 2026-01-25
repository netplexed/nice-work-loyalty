'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Camera, X } from 'lucide-react'
import { Html5QrcodeScanner } from 'html5-qrcode'
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

    useEffect(() => {
        let scanner: Html5QrcodeScanner | null = null

        if (open) {
            // Small timeout to ensure DOM is ready
            const timer = setTimeout(() => {
                scanner = new Html5QrcodeScanner(
                    "reader",
                    {
                        fps: 10,
                        qrbox: { width: 250, height: 250 },
                        aspectRatio: 1.0,
                        showTorchButtonIfSupported: true
                    },
                    false
                )

                scanner.render((decodedText) => {
                    onScan(decodedText)
                    setOpen(false)
                    scanner?.clear()
                }, (error) => {
                    // console.warn(error)
                })
            }, 100)

            return () => {
                clearTimeout(timer)
                if (scanner) {
                    try {
                        scanner.clear().catch(console.error)
                    } catch (e) {
                        console.error('Failed to clear scanner', e)
                    }
                }
            }
        }
    }, [open, onScan])

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

                <div className="relative aspect-square bg-black flex items-center justify-center">
                    {/* The Html5QrcodeScanner renders here */}
                    <div id="reader" className="w-full h-full" />
                </div>

                <div className="p-4 text-center text-sm text-zinc-400 bg-black">
                    Point camera at the customer's QR code
                </div>
            </DialogContent>
        </Dialog>
    )
}
