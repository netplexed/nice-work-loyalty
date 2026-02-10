'use client'

import { createClient } from '@/lib/supabase/client'
import { createContext, useContext, useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { toast } from 'sonner'

type SessionContextType = {
    isLoadingSession: boolean
}

const SessionContext = createContext<SessionContextType>({
    isLoadingSession: true,
})

export const useSessionLoading = () => useContext(SessionContext)

export function SessionProvider({ children }: { children: React.ReactNode }) {
    const [isLoadingSession, setIsLoadingSession] = useState(true)
    const router = useRouter()
    const pathname = usePathname()
    const supabase = createClient()

    useEffect(() => {
        const restoreSession = async () => {
            // 1. Check if we have a current session (from cookies)
            const { data: { session: currentSession } } = await supabase.auth.getSession()

            if (currentSession) {
                // We are fine. Backup the refresh token just in case.
                if (currentSession.refresh_token) {
                    localStorage.setItem('supabase-backup-token', currentSession.refresh_token)
                }
                setIsLoadingSession(false)

                // If we are logged in but on the login page, redirect to home
                if (pathname === '/login') {
                    router.push('/')
                }
                return
            }

            // 2. No session? Check for backup.
            const backupToken = localStorage.getItem('supabase-backup-token')
            if (!backupToken) {
                // No backup, truly logged out.
                setIsLoadingSession(false)
                return
            }

            console.log('[SessionProvider] No active session found, attempting restore from backup...')
            const toastId = toast.loading('Restoring session...')

            // 3. Attempt restore
            const { data, error } = await supabase.auth.refreshSession({ refresh_token: backupToken })

            if (error || !data.session) {
                console.warn('[SessionProvider] Failed to restore session:', error)
                localStorage.removeItem('supabase-backup-token')
                setIsLoadingSession(false)
                toast.dismiss(toastId)
                return
            }

            // 4. Success! Save new token
            console.log('[SessionProvider] Session restored!')
            if (data.session.refresh_token) {
                localStorage.setItem('supabase-backup-token', data.session.refresh_token)
            }

            toast.success('Session restored', { id: toastId })
            setIsLoadingSession(false)

            // If on login page, go home. Any other protected route will re-run middleware/server components 
            // after the router.refresh() or next navigation.
            if (pathname === '/login') {
                router.push('/')
            } else {
                router.refresh()
            }
        }

        restoreSession()

        // Listen for changes to keep backup in sync
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_IN' && session?.refresh_token) {
                localStorage.setItem('supabase-backup-token', session.refresh_token)
            } else if (event === 'SIGNED_OUT') {
                localStorage.removeItem('supabase-backup-token')
            }
        })

        return () => subscription.unsubscribe()
    }, [router, pathname, supabase])

    return (
        <SessionContext.Provider value={{ isLoadingSession }}>
            {children}
        </SessionContext.Provider>
    )
}
