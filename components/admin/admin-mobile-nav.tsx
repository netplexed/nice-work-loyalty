'use client'

import React from 'react'
import { Menu } from 'lucide-react'
import {
    Sheet,
    SheetContent,
    SheetTrigger,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { AdminSidebar } from './admin-sidebar'

export function AdminMobileNav() {
    return (
        <div className="flex items-center justify-between p-4 border-b bg-slate-900 border-slate-800 md:hidden">
            <div className="font-bold text-white">Nice Work Admin</div>
            <Sheet>
                <SheetTrigger asChild>
                    <Button variant="ghost" size="icon" className="text-white hover:bg-slate-800">
                        <Menu className="h-6 w-6" />
                    </Button>
                </SheetTrigger>
                {/* We reuse the AdminSidebar inside the sheet. 
            However, AdminSidebar has h-screen layout etc which might conflict. 
            We might need to adjust AdminSidebar to be flexible or wrap it. 
            Given AdminSidebar uses h-screen, putting it in a Sheet (which is fixed/absolute) might be fine if we strip the width.
            Let's invoke it but we need to verify its width storage. 
            AdminSidebar is hardcoded w-64. Sheet content width is handled by sheet.
            Let's see. 
        */}
                <SheetContent side="left" className="p-0 bg-slate-900 border-r-slate-800 w-64">
                    {/* We need to make sure AdminSidebar doesn't set its own width strictly or we override it.
               Actually AdminSidebar has `w-64` class. We might want to make it flexible?
               Or just render it as is, since SheetContent is also width constrained.
           */}
                    <AdminSidebar />
                </SheetContent>
            </Sheet>
        </div>
    )
}
