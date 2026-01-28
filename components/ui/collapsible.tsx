"use client"

import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cn } from "@/lib/utils"

interface CollapsibleProps {
    open?: boolean
    onOpenChange?: (open: boolean) => void
    children: React.ReactNode
    className?: string
    defaultOpen?: boolean
}

const CollapsibleContext = React.createContext<{
    open: boolean
    onOpenChange: (open: boolean) => void
}>({
    open: false,
    onOpenChange: () => { },
})

const Collapsible = ({
    open: controlledOpen,
    onOpenChange: controlledOnOpenChange,
    children,
    className,
    defaultOpen = false,
    ...props
}: CollapsibleProps) => {
    const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen)

    const isControlled = controlledOpen !== undefined
    const open = isControlled ? controlledOpen : uncontrolledOpen
    const onOpenChange = isControlled ? controlledOnOpenChange : setUncontrolledOpen

    return (
        <CollapsibleContext.Provider value={{ open: !!open, onOpenChange: onOpenChange || (() => { }) }}>
            <div className={cn(className)} {...props}>
                {children}
            </div>
        </CollapsibleContext.Provider>
    )
}

interface CollapsibleTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    asChild?: boolean
}

const CollapsibleTrigger = React.forwardRef<HTMLButtonElement, CollapsibleTriggerProps>(
    ({ className, children, asChild = false, onClick, ...props }, ref) => {
        const { open, onOpenChange } = React.useContext(CollapsibleContext)
        const Comp = asChild ? Slot : "button"

        const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
            onOpenChange(!open)
            onClick?.(e)
        }

        return (
            <Comp
                ref={ref}
                className={cn(className)}
                onClick={handleClick}
                data-state={open ? "open" : "closed"}
                {...props}
            >
                {children}
            </Comp>
        )
    }
)
CollapsibleTrigger.displayName = "CollapsibleTrigger"

interface CollapsibleContentProps extends React.HTMLAttributes<HTMLDivElement> { }

const CollapsibleContent = React.forwardRef<HTMLDivElement, CollapsibleContentProps>(
    ({ className, children, ...props }, ref) => {
        const { open } = React.useContext(CollapsibleContext)

        if (!open) return null

        return (
            <div
                ref={ref}
                className={cn("overflow-hidden animate-in slide-in-from-top-1 fade-in-0 duration-200", className)}
                {...props}
            >
                {children}
            </div>
        )
    }
)
CollapsibleContent.displayName = "CollapsibleContent"

export { Collapsible, CollapsibleTrigger, CollapsibleContent }
