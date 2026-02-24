'use client'

import * as React from 'react'
import { Info } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface InfoModalProps {
    title: string
    description: React.ReactNode
    className?: string
}

export function InfoModal({ title, description, className }: InfoModalProps) {
    return (
        <div
            onClick={e => {
                e.preventDefault();
                e.stopPropagation();
            }}
            onPointerDown={e => {
                e.stopPropagation();
            }}
            className="inline-flex cursor-pointer touch-none"
        >
            <Dialog>
                <DialogTrigger asChild>
                    <button
                        type="button"
                        className={cn(
                            "inline-flex items-center justify-center w-[44px] h-[44px] ml-1 -mr-3 text-muted-foreground/70 hover:text-foreground transition-colors",
                            className
                        )}
                        aria-label={`Info about ${title}`}
                    >
                        <Info className="w-5 h-5" />
                    </button>
                </DialogTrigger>
                {/* 
        Custom styling to match requirements:
        max-width 320px
        padding 20px
        radius 12px
        animation scale & fade are handled by DialogContent defaults
      */}
                <DialogContent
                    showCloseButton={false}
                    className="w-[calc(100%-2rem)] max-w-[320px] p-5 rounded-[12px] gap-0"
                >
                    <DialogHeader className="text-left mb-3">
                        <DialogTitle className="text-[18px] font-bold">{title}</DialogTitle>
                    </DialogHeader>
                    <div className="text-[14px] leading-[1.5] text-foreground/90 mb-6">
                        {description}
                    </div>
                    <DialogClose asChild>
                        <Button className="w-full font-semibold rounded-[8px]">Got it</Button>
                    </DialogClose>
                </DialogContent>
            </Dialog>
        </div>
    )
}
