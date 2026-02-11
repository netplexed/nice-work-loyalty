'use client'

import { Utensils, Globe, Calendar, Phone, Mail } from 'lucide-react'
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import Image from 'next/image'

export function DiningNav() {
    return (
        <Sheet>
            <SheetTrigger asChild>
                <button
                    className={cn(
                        "flex flex-col items-center justify-center w-16 h-full space-y-1 transition-colors text-muted-foreground hover:text-gray-900",
                    )}
                >
                    <Utensils className="w-5 h-5" />
                    <span className="text-[10px] font-medium">Dining</span>
                </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[85vh] rounded-t-[20px] p-0 overflow-hidden flex flex-col">
                <SheetHeader className="p-6 pb-2 text-left">
                    <SheetTitle className="text-2xl font-bold">Dining & Reservations</SheetTitle>
                    <SheetDescription>
                        Visit our partner restaurants. Earn points with every visit!
                    </SheetDescription>
                </SheetHeader>

                <div className="flex-1 overflow-y-auto p-6 pt-2 gap-6 flex flex-col">
                    {/* Tanuki Raw */}
                    <Card className="border-none shadow-md bg-zinc-50 overflow-hidden">
                        <div className="h-32 bg-black relative flex items-center justify-center">
                            <div className="flex items-center gap-4 px-6 z-10">
                                <div className="relative w-16 h-16 shrink-0 bg-white rounded-full p-2 flex items-center justify-center">
                                    <Image
                                        src="/images/logos/tanuki-raw-logo.png"
                                        alt="Tanuki Raw Logo"
                                        width={64}
                                        height={64}
                                        className="object-contain"
                                    />
                                </div>
                                <div className="text-white">
                                    <h3 className="text-xl font-black">Tanuki Raw</h3>
                                    <p className="text-sm opacity-90">Orchard Central</p>
                                </div>
                            </div>
                            {/* Subtle pattern or gradient overlay if desired, but user asked for black */}
                        </div>
                        <CardContent className="p-5 space-y-4">
                            <div className="space-y-2 text-sm text-muted-foreground">
                                <p>Modern Japanese bar and restaurant serving donburi and small plates. Home to Singapore's best happy hour.</p>
                                <div className="pt-2 space-y-1">
                                    <div className="flex items-center gap-2">
                                        <Phone className="w-4 h-4" />
                                        <a href="tel:+6566365949" className="hover:text-primary transition-colors">+65 6636 5949</a>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Mail className="w-4 h-4" />
                                        <a href="mailto:tanuki@tanukibar.com" className="hover:text-primary transition-colors">tanuki@tanukibar.com</a>
                                    </div>
                                </div>
                            </div>

                            <div className="grid gap-2">
                                <Button className="w-full" asChild>
                                    <a href="https://tableagent.com/singapore/tanuki-raw-at-orchard-central/table-search/" target="_blank" rel="noopener noreferrer">
                                        <Calendar className="mr-2 h-4 w-4" />
                                        Book a Table
                                    </a>
                                </Button>
                                <Button variant="outline" className="w-full" asChild>
                                    <a href="https://tanukiraw.com" target="_blank" rel="noopener noreferrer">
                                        <Globe className="mr-2 h-4 w-4" />
                                        Visit Website
                                    </a>
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Standing Sushi Bar */}
                    <Card className="border-none shadow-md bg-zinc-50 overflow-hidden">
                        <div className="h-32 bg-[#F47920] relative flex items-center justify-center">
                            <div className="flex items-center gap-4 px-6 z-10">
                                <div className="relative w-16 h-16 shrink-0 bg-white rounded-full p-2 flex items-center justify-center">
                                    <Image
                                        src="/images/logos/standing-sushi-bar-logo.png"
                                        alt="Standing Sushi Bar Logo"
                                        width={64}
                                        height={64}
                                        className="object-contain"
                                    />
                                </div>
                                <div className="text-white">
                                    <h3 className="text-xl font-black">Standing Sushi Bar</h3>
                                    <p className="text-sm opacity-90">Odeon Towers</p>
                                </div>
                            </div>
                        </div>
                        <CardContent className="p-5 space-y-4">
                            <div className="space-y-2 text-sm text-muted-foreground">
                                <p>Casual Japanese restaurant with sushi, sashimi, sake, and Japanese favorites. Open since 2009.</p>
                                <div className="pt-2 space-y-1">
                                    <div className="flex items-center gap-2">
                                        <Phone className="w-4 h-4" />
                                        <a href="tel:+6563331335" className="hover:text-primary transition-colors">+65 6333 1335</a>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Mail className="w-4 h-4" />
                                        <a href="mailto:eat@standingsushibar.com" className="hover:text-primary transition-colors">eat@standingsushibar.com</a>
                                    </div>
                                </div>
                            </div>

                            <div className="grid gap-2">
                                <Button className="w-full" asChild>
                                    <a href="https://tableagent.com/singapore/standing-sushi-bar-odeon-towers/table-search/" target="_blank" rel="noopener noreferrer">
                                        <Calendar className="mr-2 h-4 w-4" />
                                        Book a Table
                                    </a>
                                </Button>
                                <Button variant="outline" className="w-full" asChild>
                                    <a href="https://standingsushibar.com" target="_blank" rel="noopener noreferrer">
                                        <Globe className="mr-2 h-4 w-4" />
                                        Visit Website
                                    </a>
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="p-6 bg-zinc-100 border-t mt-auto">
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <span className="font-medium">Loyalty Program Questions?</span>
                        <a href="mailto:hello@nicework.sg" className="flex items-center gap-2 hover:text-primary transition-colors">
                            <Mail className="w-4 h-4" />
                            hello@nicework.sg
                        </a>
                    </div>
                </div>
            </SheetContent>
        </Sheet >
    )
}
