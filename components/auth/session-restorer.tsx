'use client'

import { createClient } from '@/lib/supabase/client'
import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { toast } from 'sonner'

/**
 * iOS PWA often clears cookies on force quit.
 * This component backs up the refresh token to localStorage and attempts to restore it if the cookie session is lost.
 */
export function SessionRestorer() {
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

                // If we are logged in but on the login page (e.g. after refresh), redirect to home
                if (pathname === '/login') {
                    router.push('/')
                }
                return
            }

            // 2. No session? Check for backup.
            const backupToken = localStorage.getItem('supabase-backup-token')
            if (!backupToken) return // No backup, truly logged out.

            console.log('[SessionRestorer] No active session found, attempting restore from backup...')
            const toastId = toast.loading('Restoring session...')

            // 3. Attempt restore
            const { data, error } = await supabase.auth.refreshSession({ refresh_token: backupToken })

            if (error || !data.session) {
                console.warn('[SessionRestorer] Failed to restore session:', error)
                localStorage.removeItem('supabase-backup-token')
                toast.dismiss(toastId)
                return
            }

            // 4. Success! Save new token and reload to sync server cookies
            console.log('[SessionRestorer] Session restored! Reloading...')
            if (data.session.refresh_token) {
                localStorage.setItem('supabase-backup-token', data.session.refresh_token)
            }

            toast.success('Session restored', { id: toastId })

            // If on login page, go home. Otherwise just refresh logic/data.
            if (pathname === '/login') {
                router.push('/')
                // We don't need refresh() here because push() will navigate to a protected page 
                // which will re-run middleware/server components with the new cookie.
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

    return null // Invisible component
}
