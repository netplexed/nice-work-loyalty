import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { getCampaigns } from '@/app/actions/email-campaign-actions'
import { CampaignList } from '@/components/admin/email/campaign-list'

export default async function EmailCampaignsPage() {
    const campaigns = await getCampaigns()

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Email Campaigns</h1>
                    <p className="text-muted-foreground">
                        Create and manage rich HTML email newsletters.
                    </p>
                </div>
                <Link href="/admin/emails/new">
                    <Button>
                        <Plus className="mr-2 h-4 w-4" />
                        New Campaign
                    </Button>
                </Link>
            </div>

            <CampaignList initialCampaigns={campaigns} />
        </div>
    )
}
