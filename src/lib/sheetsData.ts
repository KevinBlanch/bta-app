// src/lib/sheetsData.ts
import { AdMetric, Campaign, SearchTermMetric, ProductMetric, TabData, isSearchTermMetric, isProductMetric } from './types'
import { SHEET_TABS, SheetTab, TAB_CONFIGS, DEFAULT_SHEET_URL } from './config'

async function fetchTabData(sheetUrl: string, tab: SheetTab): Promise<AdMetric[] | SearchTermMetric[] | ProductMetric[] | Record<string, string>> {
  try {
    const urlWithTab = `${sheetUrl}?tab=${tab}`
    console.log(`Fetching data from: ${urlWithTab}`)
    
    const response = await fetch(urlWithTab)

    if (!response.ok) {
      // For configInfo or api tab, silently return empty object instead of throwing error
      if (tab === 'configInfo' || tab === 'api') {
        console.log(`Info: ${tab} tab not found, returning empty object`)
        return {}
      }
      throw new Error(`HTTP error ${response.status}: Failed to fetch data for tab ${tab}`)
    }

    let rawData: any;
    try {
      rawData = await response.json()
    } catch (e) {
      console.error(`Failed to parse JSON response for tab ${tab}:`, e)
      return {}
    }

    // Check if we got a valid response structure
    if (!rawData) {
      console.error(`Empty response for tab ${tab}`)
      return {}
    }

    // Special handling for configInfo and API tab to avoid console errors
    if ((tab === 'configInfo' || tab === 'api') && !Array.isArray(rawData)) {
      console.log(`${tab} tab data not in expected format, returning empty object`)
      return {}
    }

    if (!Array.isArray(rawData)) {
      // For other tabs, still log the error but make it less alarming
      if (tab !== 'configInfo' && tab !== 'api') {
        console.log(`Response is not an array for tab ${tab}:`, rawData)
      }
      
      // If it's an object with an error message, log it but not as error
      if (rawData && typeof rawData === 'object' && 'error' in rawData) {
        if (tab === 'configInfo' || tab === 'api') {
          console.log(`API Note: ${rawData.error}`)
        } else {
          console.error(`API Error:`, rawData.error)
        }
      }
      
      // If it's an object with data property that is an array, use that
      if (rawData && typeof rawData === 'object' && 'data' in rawData && Array.isArray(rawData.data)) {
        console.log(`Found data array in response object, using that instead`)
        rawData = rawData.data
      } else {
        return {}
      }
    }

    // Parse data based on tab type
    if (tab === 'searchTerms') {
      return rawData.map((row: any) => ({
        search_term: String(row['search_term'] || ''),
        campaign: String(row['campaign'] || ''),
        ad_group: String(row['ad_group'] || ''),
        impressions: Number(row['impressions'] || 0),
        clicks: Number(row['clicks'] || 0),
        cost: Number(row['cost'] || 0),
        conversions: Number(row['conversions'] || 0),
        conversion_value: Number(row['conversion_value'] || 0),
        cpc: Number(row['cpc'] || 0),
        ctr: Number(row['ctr'] || 0),
        conv_rate: Number(row['conv_rate'] || 0),
        cpa: Number(row['cpa'] || 0),
        roas: Number(row['roas'] || 0),
        aov: Number(row['aov'] || 0)
      }))
    }

    // Daily metrics
    if (tab === 'daily2') {
      return rawData.map((row: any) => ({
        campaign: String(row['campaign'] || ''),
        campaignId: String(row['campaignId'] || ''),
        clicks: Number(row['clicks'] || 0),
        value: Number(row['value'] || 0),
        conv: Number(row['conv'] || 0),
        cost: Number(row['cost'] || 0),
        impr: Number(row['impr'] || 0),
        view_through_conv: Number(row['view_through_conv'] || 0),
        date: String(row['date'] || '')
      }))
    }

    // Product performance metrics
    if (tab === 'productPerformance') {
      return rawData.map((row: any) => ({
        product_title: String(row['product_title'] || ''),
        impressions: Number(row['impressions'] || 0),
        clicks: Number(row['clicks'] || 0),
        cost: Number(row['cost'] || 0),
        conversions: Number(row['conversions'] || 0),
        conversion_value: Number(row['conversion_value'] || 0),
        ctr: Number(row['ctr'] || 0),
        roas: Number(row['roas'] || 0),
        cvr: Number(row['cvr'] || 0)
      }))
    }

    // Configuration info or API tab with named ranges
    if (tab === 'configInfo' || tab === 'api') {
      try {
        const configObj: Record<string, string> = {};
        
        // Check if we have a special format for named ranges (each row has a name and value)
        if (rawData.length > 0 && ('Config Name' in rawData[0] || 'Name' in rawData[0])) {
          rawData.forEach((row: any) => {
            const nameField = row['Config Name'] || row['Name'];
            const valueField = row['Value'];
            
            if (nameField && valueField !== undefined) {
              configObj[String(nameField)] = String(valueField);
            }
          });
        } else {
          // Just return the first item if it's a single-item array of objects
          if (rawData.length === 1 && typeof rawData[0] === 'object') {
            return rawData[0];
          }
        }
        
        return configObj;
      } catch (err) {
        console.log(`Failed to process ${tab} data, returning empty object:`, err);
        return {};
      }
    }

    // Default daily metrics
    return rawData.map((row: any) => ({
      campaign: String(row['campaign'] || ''),
      campaignId: String(row['campaignId'] || ''),
      clicks: Number(row['clicks'] || 0),
      value: Number(row['value'] || 0),
      conv: Number(row['conv'] || 0),
      cost: Number(row['cost'] || 0),
      impr: Number(row['impr'] || 0),
      date: String(row['date'] || '')
    }))
  } catch (error) {
    // For configInfo/api tab, return empty object silently
    if (tab === 'configInfo' || tab === 'api') {
      console.log(`Info: Error fetching ${tab} data, returning empty object`)
      return {}
    }
    console.error(`Error fetching ${tab} data:`, error)
    return {}
  }
}

export async function fetchAllTabsData(sheetUrl: string = DEFAULT_SHEET_URL): Promise<TabData> {
  const results = await Promise.all(
    SHEET_TABS.map(async tab => ({
      tab,
      data: await fetchTabData(sheetUrl, tab)
    }))
  )

  return results.reduce((acc, { tab, data }) => {
    if (tab === 'searchTerms') {
      acc[tab] = data as SearchTermMetric[]
    } else if (tab === 'productPerformance') {
      acc[tab] = data as ProductMetric[]
    } else if (tab === 'configInfo' || tab === 'api') {
      acc[tab] = data as Record<string, string>
    } else {
      acc[tab] = data as AdMetric[]
    }
    return acc
  }, { daily: [], searchTerms: [], daily2: [], productPerformance: [], configInfo: {}, api: {} } as TabData)
}

export function getCampaigns(data: AdMetric[]): Campaign[] {
  const campaignMap = new Map<string, { id: string; name: string; totalCost: number }>()

  data.forEach(row => {
    if (!campaignMap.has(row.campaignId)) {
      campaignMap.set(row.campaignId, {
        id: row.campaignId,
        name: row.campaign,
        totalCost: row.cost
      })
    } else {
      const campaign = campaignMap.get(row.campaignId)!
      campaign.totalCost += row.cost
    }
  })

  return Array.from(campaignMap.values())
    .sort((a, b) => b.totalCost - a.totalCost) // Sort by cost descending
}

export function getMetricsByDate(data: AdMetric[], campaignId: string): AdMetric[] {
  return data
    .filter(metric => metric.campaignId === campaignId)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
}

export function getMetricOptions(activeTab: SheetTab = 'daily') {
  return TAB_CONFIGS[activeTab]?.metrics || {}
}

// SWR configuration without cache control
export const swrConfig = {
  revalidateOnFocus: true,
  revalidateOnReconnect: true,
  dedupingInterval: 5000
} 