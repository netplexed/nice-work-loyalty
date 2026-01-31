'use client'

import { useEffect, useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Camera, X, RefreshCw } from 'lucide-react'
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { toast } from "sonner"

interface VoucherScannerProps {
    onScan: (data: string) => void
    className?: string
}

export function VoucherScanner({ onScan, className }: VoucherScannerProps) {
    const [open, setOpen] = useState(false)
    const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment')
    const [isScanning, setIsScanning] = useState(false)

    // Store the scanner instance ref
    const scannerRef = useRef<Html5Qrcode | null>(null)
    const scannerId = "reader-custom"

    // Cleanup function
    const stopScanner = async () => {
        if (scannerRef.current && isScanning) {
            try {
                await scannerRef.current.stop()
                setIsScanning(false)
            } catch (err) {
                console.error("Failed to stop scanner", err)
            }
        }
    }

    // Start function
    const startScanner = async () => {
        // Ensure previous instance is stopped
        await stopScanner()

        // Small delay to ensure DOM is ready and previous tear down is complete
        setTimeout(async () => {
            if (!open) return

            try {
                const scanner = new Html5Qrcode(scannerId)
                scannerRef.current = scanner

                await scanner.start(
                    { facingMode: facingMode },
                    {
                        fps: 10,
                        qrbox: { width: 250, height: 250 },
                        aspectRatio: 1.0,
                    },
                    (decodedText) => {
                        onScan(decodedText)
                        setOpen(false)
                        stopScanner()
                    },
                    (errorMessage) => {
                        // ignore
                    }
                )
                setIsScanning(true)
            } catch (err) {
                console.error("Failed to start scanner", err)
                toast.error("Failed to start camera")
            }
        }, 300)
    }

    // Toggle Camera
    const toggleCamera = async () => {
        await stopScanner()
        setFacingMode(prev => prev === 'environment' ? 'user' : 'environment')
    }

    // Effect to handle start/restart when open or facingMode changes
    useEffect(() => {
        if (open) {
            startScanner()
        } else {
            stopScanner()
        }

        return () => {
            stopScanner()
        }
    }, [open, facingMode])

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="secondary" className={`gap-2 w-full sm:w-auto ${className || ''}`}>
                    <Camera className="w-4 h-4" />
                    Scan Camera
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-black text-white border-zinc-800">
                <DialogHeader className="absolute top-0 left-0 right-0 z-10 p-4 bg-gradient-to-b from-black/80 to-transparent">
                    <div className="flex justify-between items-center">
                        <DialogTitle className="text-white">Scan Voucher</DialogTitle>
                        <div className="flex gap-2">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="text-white hover:bg-white/20 h-8 w-8 rounded-full"
                                onClick={toggleCamera}
                                title="Switch Camera"
                            >
                                <RefreshCw className="w-5 h-5" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="text-white hover:bg-white/20 h-8 w-8 rounded-full"
                                onClick={() => setOpen(false)}
                            >
                                <X className="w-5 h-5" />
                            </Button>
                        </div>
                    </div>
                </DialogHeader>

                <div className="relative aspect-square bg-black flex items-center justify-center overflow-hidden">
                    <div id={scannerId} className="w-full h-full object-cover" />

                    {/* Overlay Guide */}
                    <div className="absolute inset-0 pointer-events-none border-[30px] border-black/50 flex items-center justify-center">
                        <div className="w-64 h-64 border-2 border-white/50 rounded-lg relative">
                            <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-primary -mt-1 -ml-1"></div>
                            <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-primary -mt-1 -mr-1"></div>
                            <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-primary -mb-1 -ml-1"></div>
                            <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-primary -mb-1 -mr-1"></div>
                        </div>
                    </div>
                </div>

                <div className="p-4 text-center text-sm text-zinc-400 bg-black">
                    Point camera at the customer's QR code
                </div>
            </DialogContent>
        </Dialog>
    )
}
