import { createClient } from '@/lib/supabase/client'

export async function uploadCampaignImage(file: File): Promise<string | null> {
    const supabase = createClient()

    const fileExt = file.name.split('.').pop()
    const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`
    const filePath = `${fileName}`

    const { error: uploadError } = await supabase.storage
        .from('campaign_assets')
        .upload(filePath, file)

    if (uploadError) {
        console.error('Error uploading image:', uploadError)
        return null
    }

    const { data } = supabase.storage
        .from('campaign_assets')
        .getPublicUrl(filePath)

    return data.publicUrl
}
