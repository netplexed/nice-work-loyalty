'use client'

import { useState } from 'react'
import { Switch } from '@/components/ui/switch'
import { updateUserProfile } from '@/app/actions/user-actions'
import { toast } from 'sonner'

export function MarketingConsentToggle({ initialConsent }: { initialConsent: boolean }) {
    const [consent, setConsent] = useState(initialConsent)
    const [loading, setLoading] = useState(false)

    const handleToggle = async (checked: boolean) => {
        setConsent(checked) // Optimistic
        setLoading(true)
        try {
            await updateUserProfile({ marketing_consent: checked })
            toast.success(checked ? 'Subscribed to emails' : 'Unsubscribed from emails')
        } catch (error) {
            setConsent(!checked) // Revert
            toast.error('Failed to update settings')
        } finally {
            setLoading(false)
        }
    }

    return (
        <Switch
            checked={consent}
            onCheckedChange={handleToggle}
            disabled={loading}
        />
    )
}
