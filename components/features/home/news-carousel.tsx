'use client'

import React, { useEffect, useState } from 'react'
import useEmblaCarousel from 'embla-carousel-react'
import { Announcement, getActiveAnnouncements } from '@/app/actions/announcement-actions'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, Megaphone, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

export function NewsCarousel() {
    const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, align: 'start' })
    const [announcements, setAnnouncements] = useState<Announcement[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedIndex, setSelectedIndex] = useState(0)
    const [scrollSnaps, setScrollSnaps] = useState<number[]>([])

    useEffect(() => {
        const load = async () => {
            try {
                const data = await getActiveAnnouncements()
                setAnnouncements(data)
            } catch (e) {
                console.error(e)
            } finally {
                setLoading(false)
            }
        }
        load()
    }, [])

    useEffect(() => {
        if (!emblaApi) return

        setScrollSnaps(emblaApi.scrollSnapList())
        const onSelect = () => {
            setSelectedIndex(emblaApi.selectedScrollSnap())
        }

        emblaApi.on('select', onSelect)
        emblaApi.on('reInit', onSelect)

        return () => {
            emblaApi.off('select', onSelect)
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

    return (
        <div className="space-y-4">
            <div className="overflow-hidden" ref={emblaRef}>
                <div className="flex touch-pan-y touch-pinch-zoom -ml-4">
                    {announcements.map((item) => (
                        <div className="flex-[0_0_85%] min-w-0 pl-4 sm:flex-[0_0_50%]" key={item.id}>
                            <Card className="overflow-hidden h-full border-0 shadow-sm bg-white hover:shadow-md transition-shadow">
                                <div className="relative h-32 bg-gray-100">
                                    {item.image_url ? (
                                        <img
                                            src={item.image_url}
                                            alt={item.title}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 text-blue-200">
                                            <Megaphone className="w-12 h-12" />
                                        </div>
                                    )}
                                </div>
                                <CardContent className="p-4 space-y-2">
                                    <h3 className="font-bold text-gray-900 line-clamp-1">{item.title}</h3>
                                    <p className="text-sm text-gray-500 line-clamp-2 min-h-[2.5rem]">
                                        {item.content}
                                    </p>

                                    {item.action_url && (
                                        <div className="pt-2">
                                            <Button asChild size="sm" variant="outline" className="w-full text-xs h-8 group">
                                                <Link
                                                    href={item.action_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                >
                                                    {item.action_label || 'Learn More'}
                                                    <ChevronRight className="w-3 h-3 ml-1 group-hover:translate-x-0.5 transition-transform" />
                                                </Link>
                                            </Button>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    ))}
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
