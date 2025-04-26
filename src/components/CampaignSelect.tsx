import { Campaign } from '@/lib/types'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface CampaignSelectProps {
  campaigns: Campaign[]
  selectedCampaignId: string
  onSelect: (campaignId: string) => void
}

const ALL_CAMPAIGNS_VALUE = '_all_'

export function CampaignSelect({ campaigns, selectedCampaignId, onSelect }: CampaignSelectProps) {
  // Convert empty string to ALL_CAMPAIGNS_VALUE and vice versa
  const value = selectedCampaignId || ALL_CAMPAIGNS_VALUE
  const handleSelect = (value: string) => {
    onSelect(value === ALL_CAMPAIGNS_VALUE ? '' : value)
  }

  return (
    <Select value={value} onValueChange={handleSelect}>
      <SelectTrigger className="w-[280px]">
        <SelectValue placeholder="Select a campaign" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL_CAMPAIGNS_VALUE}>All Campaigns</SelectItem>
        {campaigns.map(campaign => (
          <SelectItem key={campaign.id} value={campaign.id}>
            {campaign.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
} 