'use client'

import React, { useEffect, useState } from 'react'
import useEmblaCarousel from 'embla-carousel-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, Megaphone, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { cn } from '@/lib/utils'
import { useAnnouncements } from '@/hooks/use-announcements'
import { isExternalActionUrl, normalizeActionUrl } from '@/lib/action-url'

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
// import { ScrollArea } from '@/components/ui/scroll-area'

export function NewsCarousel() {
    const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, align: 'start' })
    const { announcements, loading } = useAnnouncements()
    const [selectedIndex, setSelectedIndex] = useState(0)
    const [scrollSnaps, setScrollSnaps] = useState<number[]>([])

    // Removed manual useEffect fetching - handled by SWR

    useEffect(() => {
        if (!emblaApi) return

        const syncSnaps = () => {
            setScrollSnaps(emblaApi.scrollSnapList())
        }

        const onSelect = () => {
            setSelectedIndex(emblaApi.selectedScrollSnap())
        }

        // Defer initial state sync to avoid synchronous state updates in effect.
        const initTimer = window.setTimeout(() => {
            syncSnaps()
            onSelect()
        }, 0)

        emblaApi.on('select', onSelect)
        emblaApi.on('reInit', syncSnaps)
        emblaApi.on('reInit', onSelect)

        return () => {
            window.clearTimeout(initTimer)
            emblaApi.off('select', onSelect)
            emblaApi.off('reInit', syncSnaps)
            emblaApi.off('reInit', onSelect)
        }
    }, [emblaApi, announcements])

    if (loading) {
        return (
            <div className="w-full h-48 bg-gray-100 animate-pulse rounded-xl flex items-center justify-center text-gray-400">
                <Loader2 className="w-6 h-6 animate-spin" />
            </div>
        )
    }

    if (announcements.length === 0) {
        return null // Don't show if empty
    }

    const isSupabaseImage = (url: string) => url.includes('supabase.co')

    return (
        <div className="space-y-4">
            <div className="overflow-hidden" ref={emblaRef}>
                <div className="flex touch-pan-y touch-pinch-zoom -ml-4">
                    {announcements.map((item) => {
                        const actionHref = normalizeActionUrl(item.action_url)
                        const isExternalAction = actionHref ? isExternalActionUrl(actionHref) : false

                        return (
                            <div className="flex-[0_0_85%] min-w-0 pl-4 sm:flex-[0_0_50%]" key={item.id}>
                                <Dialog>
                                    <DialogTrigger asChild>
                                        <div className="cursor-pointer h-full">
                                            <Card className="overflow-hidden h-full border-0 shadow-sm bg-white hover:shadow-md transition-shadow">
                                                <div className="relative h-32 bg-gray-100">
                                                    {item.image_url ? (
                                                        <Image
                                                            src={item.image_url}
                                                            alt={item.title}
                                                            fill
                                                            className="object-cover"
                                                            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                                                            unoptimized={!isSupabaseImage(item.image_url)}
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 text-blue-200">
                                                            <Megaphone className="w-12 h-12" />
                                                        </div>
                                                    )}
                                                </div>
                                                <CardContent className="p-4 space-y-2">
                                                    <h3 className="font-bold text-gray-900 line-clamp-1">{item.title}</h3>
                                                    <div
                                                        className="text-sm text-gray-500 line-clamp-2 min-h-[2.5rem] prose prose-sm max-w-none prose-p:m-0 prose-p:leading-tight"
                                                        dangerouslySetInnerHTML={{ __html: item.content }}
                                                    />
                                                </CardContent>
                                            </Card>
                                        </div>
                                    </DialogTrigger>
                                    <DialogContent className="max-w-md w-[90%] rounded-xl overflow-hidden p-0 gap-0">
                                        <div className="relative w-full bg-black flex items-center justify-center">
                                            {item.image_url ? (
                                                <div className="relative w-full h-[300px]">
                                                    <Image
                                                        src={item.image_url}
                                                        alt={item.title}
                                                        fill
                                                        className="object-contain"
                                                        sizes="100vw"
                                                        unoptimized={!isSupabaseImage(item.image_url)}
                                                    />
                                                </div>
                                            ) : (
                                                <div className="w-full h-48 flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 text-blue-200">
                                                    <Megaphone className="w-16 h-16" />
                                                </div>
                                            )}
                                        </div>

                                        <div className="p-6 pb-2">
                                            <DialogHeader>
                                                <DialogTitle className="text-xl font-bold leading-tight text-gray-900">
                                                    {item.title}
                                                </DialogTitle>
                                            </DialogHeader>
                                        </div>

                                        <div className="overflow-y-auto max-h-[40vh] px-6 pb-6">
                                            <div
                                                className="prose prose-sm max-w-none text-gray-600"
                                                dangerouslySetInnerHTML={{ __html: item.content }}
                                            />

                                            {actionHref && (
                                                <div className="pt-6">
                                                    <Button asChild className="w-full group">
                                                        {isExternalAction ? (
                                                            <a href={actionHref} target="_blank" rel="noopener noreferrer">
                                                                {item.action_label || 'Learn More'}
                                                                <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-0.5 transition-transform" />
                                                            </a>
                                                        ) : (
                                                            <Link href={actionHref}>
                                                                {item.action_label || 'Learn More'}
                                                                <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-0.5 transition-transform" />
                                                            </Link>
                                                        )}
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    </DialogContent>
                                </Dialog>
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* Dot Indicators */}
            {scrollSnaps.length > 1 && (
                <div className="flex justify-center gap-2">
                    {scrollSnaps.map((_, index) => (
                        <button
                            key={index}
                            className={cn(
                                "w-2 h-2 rounded-full transition-all duration-300",
                                index === selectedIndex
                                    ? "bg-indigo-600 w-4"
                                    : "bg-gray-300 hover:bg-gray-400"
                            )}
                            onClick={() => emblaApi?.scrollTo(index)}
                            aria-label={`Go to slide ${index + 1}`}
                        />
                    ))}
                </div>
            )}
        </div>
    )
}
