'use client'

import { useEffect, useState } from 'react'
import { useSettings } from '@/lib/contexts/SettingsContext'
import { fetchAllTabsData, getCampaigns } from '@/lib/sheetsData'
import type { AdMetric, DailyMetrics, TabData, Campaign } from '@/lib/types'
import { calculateDailyMetrics } from '@/lib/metrics'
import { MetricCard } from '@/components/MetricCard'
import { MetricsChart } from '@/components/MetricsChart'
import { CampaignSelect } from '@/components/CampaignSelect'
import { formatCurrency, formatPercent, formatConversions } from '@/lib/utils'
import { COLORS } from '@/lib/config'

type DisplayMetric = 'impr' | 'clicks' | 'CTR' | 'CPC' | 'cost' |
    'conv' | 'CvR' | 'CPA' | 'value' | 'ROAS' | 'view_through_conv'

const metricConfig = {
    impr: { label: 'Impressions', format: (v: number) => v.toLocaleString(), row: 1 },
    clicks: { label: 'Clicks', format: (v: number) => v.toLocaleString(), row: 1 },
    CTR: { label: 'CTR', format: formatPercent, row: 1 },
    CPC: { label: 'CPC', format: (v: number, currency: string) => formatCurrency(v, currency), row: 1 },
    cost: { label: 'Cost', format: (v: number, currency: string) => formatCurrency(v, currency), row: 1 },
    conv: { label: 'Conv', format: formatConversions, row: 2 },
    view_through_conv: { label: 'View Conv', format: (v: number) => Math.round(v).toLocaleString(), row: 2 },
    CvR: { label: 'Conv Rate', format: formatPercent, row: 2 },
    CPA: { label: 'CPA', format: (v: number, currency: string) => formatCurrency(v, currency), row: 2 },
    value: { label: 'Value', format: (v: number, currency: string) => formatCurrency(v, currency), row: 2 },
    ROAS: { label: 'ROAS', format: (v: number) => v.toFixed(2) + 'x', row: 2 }
} as const

export default function Daily2Page() {
    const { settings, setCampaigns } = useSettings()
    const [data, setData] = useState<AdMetric[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string>()
    const [selectedMetrics, setSelectedMetrics] = useState<[DisplayMetric, DisplayMetric]>(['cost', 'value'])
    const [selectedCampaignId, setSelectedCampaignId] = useState<string>('')

    // Aggregate metrics by date when viewing all campaigns
    const aggregateMetricsByDate = (data: AdMetric[]): AdMetric[] => {
        const metricsByDate = data.reduce((acc, metric) => {
            const date = metric.date
            if (!acc[date]) {
                acc[date] = {
                    campaign: 'All Campaigns',
                    campaignId: '',
                    date,
                    impr: 0,
                    clicks: 0,
                    cost: 0,
                    conv: 0,
                    value: 0,
                    view_through_conv: 0,
                }
            }
            acc[date].impr += metric.impr
            acc[date].clicks += metric.clicks
            acc[date].cost += metric.cost
            acc[date].conv += metric.conv
            acc[date].value += metric.value
            
            // Safely add view_through_conv if it exists
            if (typeof acc[date].view_through_conv === 'number') {
                acc[date].view_through_conv += (typeof metric.view_through_conv === 'number' ? metric.view_through_conv : 0)
            }
            
            return acc
        }, {} as Record<string, AdMetric>)

        return Object.values(metricsByDate).sort((a, b) =>
            new Date(a.date).getTime() - new Date(b.date).getTime()
        )
    }

    useEffect(() => {
        if (!settings.sheetUrl) {
            setIsLoading(false)
            return
        }

        fetchAllTabsData(settings.sheetUrl)
            .then((allData: TabData) => {
                // Use daily2 data instead of daily
                const daily2Data = allData.daily2 || []
                setData(daily2Data)

                const campaigns = getCampaigns(daily2Data)
                setCampaigns(campaigns)
            })
            .catch((err: Error) => {
                console.error('Error loading data:', err)
                setError('Failed to load data. Please check your Sheet URL.')
            })
            .finally(() => setIsLoading(false))
    }, [settings.sheetUrl, setCampaigns])

    const dailyMetrics = calculateDailyMetrics(
        selectedCampaignId
            ? data.filter(d => d.campaignId === selectedCampaignId)
            : aggregateMetricsByDate(data)
    )

    const calculateTotals = () => {
        if (dailyMetrics.length === 0) return null

        const sums = dailyMetrics.reduce((acc, d) => ({
            impr: acc.impr + d.impr,
            clicks: acc.clicks + d.clicks,
            cost: acc.cost + d.cost,
            conv: acc.conv + d.conv,
            value: acc.value + d.value,
            view_through_conv: acc.view_through_conv + (d.view_through_conv || 0),
        }), {
            impr: 0, clicks: 0, cost: 0, conv: 0, value: 0, view_through_conv: 0,
        })

        return {
            ...sums,
            CTR: (sums.impr ? (sums.clicks / sums.impr) * 100 : 0),
            CPC: (sums.clicks ? sums.cost / sums.clicks : 0),
            CvR: (sums.clicks ? (sums.conv / sums.clicks) * 100 : 0),
            CPA: (sums.conv ? sums.cost / sums.conv : 0),
            ROAS: (sums.cost ? sums.value / sums.cost : 0),
        }
    }

    const handleMetricClick = (metric: DisplayMetric) => {
        setSelectedMetrics(prev => [prev[1], metric])
    }

    if (isLoading) return <DashboardLayout>Loading...</DashboardLayout>
    if (!settings.sheetUrl) return <DashboardLayout>Please configure your Google Sheet URL in settings</DashboardLayout>
    if (dailyMetrics.length === 0) return <DashboardLayout>No data found</DashboardLayout>

    const totals = calculateTotals()
    if (!totals) return null

    return (
        <DashboardLayout error={error}>
            <div className="space-y-6">
                <CampaignSelect
                    campaigns={(settings.campaigns || []) as Campaign[]}
                    selectedCampaignId={selectedCampaignId}
                    onSelect={setSelectedCampaignId}
                />

                {[1, 2].map(row => (
                    <div key={row} className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
                        {Object.entries(metricConfig)
                            .filter(([_, config]) => config.row === row)
                            .map(([key, config]) => {
                                const metric = key as DisplayMetric;
                                const isFirstSelected = selectedMetrics[0] === metric;
                                const isSecondSelected = selectedMetrics[1] === metric;
                                const isSelected = isFirstSelected || isSecondSelected;
                                const color = isFirstSelected ? COLORS.primary : isSecondSelected ? COLORS.accent : '';
                                
                                return (
                                    <MetricCard
                                        key={key}
                                        label={config.label}
                                        value={config.format(totals[metric], settings.currency)}
                                        isSelected={isSelected}
                                        onClick={() => handleMetricClick(metric)}
                                        color={color}
                                    />
                                );
                            })}
                    </div>
                ))}

                <MetricsChart
                    data={dailyMetrics}
                    metric1={{
                        key: selectedMetrics[0],
                        label: metricConfig[selectedMetrics[0]].label,
                        color: COLORS.primary,
                        format: (v: number) => metricConfig[selectedMetrics[0]].format(v, settings.currency)
                    }}
                    metric2={{
                        key: selectedMetrics[1],
                        label: metricConfig[selectedMetrics[1]].label,
                        color: COLORS.accent,
                        format: (v: number) => metricConfig[selectedMetrics[1]].format(v, settings.currency)
                    }}
                />
            </div>
        </DashboardLayout>
    )
}

function DashboardLayout({ children, error }: { children: React.ReactNode, error?: string }) {
    return (
        <div className="container mx-auto px-4 py-12 mt-16">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold text-gray-900">Daily2 Dashboard</h1>
            </div>
            {error && <div className="text-red-500 mb-4">{error}</div>}
            {children}
        </div>
    )
} 