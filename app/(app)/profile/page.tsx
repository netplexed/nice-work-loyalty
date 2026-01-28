'use client'

import { useEffect, useState } from 'react'
import { useUserProfile } from '@/hooks/use-user-profile'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { useRouter } from 'next/navigation'
import { LogOut, Mail, Phone, Cake } from 'lucide-react'
import { NotificationsToggle } from '@/components/pwa/notifications-toggle'
import { MarketingConsentToggle } from '@/components/features/profile/marketing-consent-toggle'
import { VoucherQR } from '@/components/features/rewards/voucher-qr'
import { EditProfileDialog } from '@/components/features/profile/edit-profile-dialog'
import { DeleteAccountDialog } from '@/components/features/profile/delete-account-dialog'

export default function ProfilePage() {
    const { profile, loading } = useUserProfile()
    const router = useRouter()
    const supabase = createClient()

    // No manual fetching needed

    const handleSignOut = async () => {
        await supabase.auth.signOut()
        router.push('/login')
    }

    if (!profile) return null

    return (
        <div className="p-4 pb-24 space-y-6">
            <div className="flex flex-col items-center space-y-4 pt-4">
                <Avatar className="w-24 h-24 border-4 border-white shadow-lg">
                    <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.full_name}`} />
                    <AvatarFallback>{profile.full_name?.[0]}</AvatarFallback>
                </Avatar>
                <div className="text-center">
                    <h1 className="text-2xl font-bold">{profile.full_name}</h1>
                    <p className="text-muted-foreground capitalize">{profile.tier} Member</p>
                </div>
            </div>




            <Card>
                <CardContent className="flex flex-col items-center">
                    <div className="w-48 mx-auto mb-4">
                        <VoucherQR code={`user:${profile.id}`} size={180} className="w-full" />
                    </div>
                    <p className="text-sm text-center text-muted-foreground">Scan at counter to earn points</p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-lg">Personal Info</CardTitle>
                    <EditProfileDialog profile={profile} />
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                            <Phone className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-sm font-medium">Phone</p>
                            <p className="text-sm text-muted-foreground">{profile.phone}</p>
                        </div>
                    </div>
                    <Separator />
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                            <Mail className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-sm font-medium">Email</p>
                            <p className="text-sm text-muted-foreground">{profile.email || 'Not set'}</p>
                        </div>
                    </div>
                    <Separator />
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                            <Cake className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-sm font-medium">Birthday</p>
                            <p className="text-sm text-muted-foreground">{profile.birthday ? new Date(profile.birthday).toLocaleDateString() : 'Not set'}</p>
                        </div>
                    </div>
                </CardContent>
            </Card>



            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Account</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Push Notifications</span>
                        <NotificationsToggle />
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Marketing Emails</span>
                        <MarketingConsentToggle initialConsent={profile.marketing_consent} />
                    </div>
                    <Separator />
                    <Separator />
                    <Button variant="ghost" className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50" onClick={handleSignOut}>
                        <LogOut className="w-4 h-4 mr-2" />
                        Sign Out
                    </Button>
                    <Separator />
                    <Button variant="ghost" className="w-full justify-start text-muted-foreground" onClick={() => router.push('/debug')}>
                        <span className="text-xs">System Debugger</span>
                    </Button>
                    <Separator />
                    <div className="pt-2">
                        <DeleteAccountDialog />
                    </div>
                </CardContent>

            </Card>


            <div className="text-center text-xs text-muted-foreground pt-8">
                v1.0.0
            </div>
        </div >
    )
}
