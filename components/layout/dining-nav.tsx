'use client'

import { Utensils, Globe, Calendar } from 'lucide-react'
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
                        <div className="h-32 bg-zinc-200 relative">
                            {/* Placeholder pattern or image if we had one. Using a gradient for now */}
                            <div className="absolute inset-0 bg-gradient-to-r from-orange-400 to-red-500 opacity-90" />
                            <div className="absolute bottom-4 left-4 text-white">
                                <h3 className="text-xl font-black">Tanuki Raw</h3>
                                <p className="text-sm opacity-90">Orchard Central</p>
                            </div>
                        </div>
                        <CardContent className="p-5 space-y-4">
                            <div className="space-y-2 text-sm text-muted-foreground">
                                <p>Modern Japanese bar serving raw bar, rice bowls, and cocktail happy hours.</p>
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
                        <div className="h-32 bg-zinc-200 relative">
                            <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-indigo-500 opacity-90" />
                            <div className="absolute bottom-4 left-4 text-white">
                                <h3 className="text-xl font-black">Standing Sushi Bar</h3>
                                <p className="text-sm opacity-90">Odeon Towers</p>
                            </div>
                        </div>
                        <CardContent className="p-5 space-y-4">
                            <div className="space-y-2 text-sm text-muted-foreground">
                                <p>Handmade sushi and sashimi, robatayaki, and extensive sake selection.</p>
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
            </SheetContent>
        </Sheet>
    )
}
