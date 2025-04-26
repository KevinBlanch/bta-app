'use client'

import { useEffect, useState } from 'react'
import { useSettings } from '@/lib/contexts/SettingsContext'
import { fetchAllTabsData } from '@/lib/sheetsData'
import type { ProductMetric, TabData } from '@/lib/types'
import { formatCurrency, formatPercent } from '@/lib/utils'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { ProductInsights } from '@/components/ProductInsights'
import { ProductTitleImprover } from '@/components/ProductTitleImprover'
import { ProductCircularChart } from '@/components/ProductCircularChart'

// Define sort options
type SortField = keyof ProductMetric | ''
type SortDirection = 'asc' | 'desc'

// Define chart metric options
type ChartMetric = 'roas' | 'conversion_value' | 'conversions' | 'clicks' | 'impressions'

// Define product filter options
type ProductFilter = 'top10' | 'bottom10' | 'average10' | 'all'

export default function ProductsPage() {
    const { settings } = useSettings()
    const [data, setData] = useState<ProductMetric[]>([])
    const [configInfo, setConfigInfo] = useState<Record<string, string>>({})
    const [apiInfo, setApiInfo] = useState<Record<string, string>>({})
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string>()
    const [sortField, setSortField] = useState<SortField>('cost')
    const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
    const [chartMetric, setChartMetric] = useState<ChartMetric>('roas')
    const [productFilter, setProductFilter] = useState<ProductFilter>('top10')

    useEffect(() => {
        if (!settings.sheetUrl) {
            setIsLoading(false)
            return
        }

        fetchAllTabsData(settings.sheetUrl)
            .then((allData: TabData) => {
                // Use product performance data
                const productData = allData.productPerformance || []
                console.log("Fetched product data:", productData.length, "items");
                
                if (productData.length === 0) {
                    console.log("No product data found in the response");
                } else {
                    // Log the first item to see its structure
                    console.log("Sample product data item:", productData[0]);
                }
                
                setData(productData)
                
                // Get configuration and API info
                const config = allData.configInfo || {}
                setConfigInfo(config)

                const api = allData.api || {}
                setApiInfo(api)
            })
            .catch((err: Error) => {
                console.error('Error loading data:', err)
                setError('Failed to load data. Please check your Sheet URL.')
            })
            .finally(() => setIsLoading(false))
    }, [settings.sheetUrl])

    // Function to handle sort
    const handleSort = (field: SortField) => {
        if (field === sortField) {
            // If clicking the same field, toggle direction
            setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
        } else {
            // If clicking a new field, set it with default desc direction
            setSortField(field)
            setSortDirection('desc')
        }
    }

    if (isLoading) return <ProductLayout>Loading...</ProductLayout>
    if (!settings.sheetUrl) return <ProductLayout>Please configure your Google Sheet URL in settings</ProductLayout>
    if (data.length === 0) return <ProductLayout>No product performance data found</ProductLayout>

    // Filter products with conversions and value
    const filteredData = data
        .filter(product => product.conversions >= 1 && product.conversion_value > 0)
    
    console.log("Filtered products with conversions:", filteredData.length);

    if (filteredData.length === 0) return <ProductLayout>No products with conversions found</ProductLayout>

    // Sort the data based on current sort field and direction
    const sortedData = [...filteredData].sort((a, b) => {
        if (!sortField) return 0
        
        const valueA = a[sortField]
        const valueB = b[sortField]
        
        if (valueA === valueB) return 0
        
        const comparison = valueA < valueB ? -1 : 1
        return sortDirection === 'asc' ? comparison : -comparison
    })

    // Calculate summary metrics
    const totalProducts = sortedData.length;
    const totalConversions = sortedData.reduce((sum, p) => sum + p.conversions, 0);
    const totalValue = sortedData.reduce((sum, p) => sum + p.conversion_value, 0);
    const totalCost = sortedData.reduce((sum, p) => sum + p.cost, 0);
    const overallROAS = totalCost > 0 ? totalValue / totalCost : 0;

    // Get products for chart based on filter
    const getChartProducts = () => {
        const sorted = [...filteredData].sort((a, b) => {
            const valueA = a[chartMetric] as number
            const valueB = b[chartMetric] as number
            return valueB - valueA // Sort descending by default
        })
        
        if (sorted.length <= 10 || productFilter === 'all') {
            return sorted
        }
        
        switch (productFilter) {
            case 'top10':
                return sorted.slice(0, 10)
            case 'bottom10':
                return sorted.slice(-10).reverse() // Reverse to show worst first
            case 'average10':
                // Get middle performers (around median)
                const middleIndex = Math.floor(sorted.length / 2)
                const startIndex = Math.max(0, middleIndex - 5)
                return sorted.slice(startIndex, startIndex + 10)
            default:
                return sorted.slice(0, 10)
        }
    }

    // Get chart products based on current filter
    const chartProducts = getChartProducts()

    // Helper to render sort indicators
    const getSortIndicator = (field: SortField) => {
        if (sortField !== field) return null
        return sortDirection === 'asc' ? <ChevronUp className="inline h-4 w-4" /> : <ChevronDown className="inline h-4 w-4" />
    }

    // Helper for sort header style
    const getSortHeaderStyle = (field: SortField) => {
        return `px-4 py-3 text-${field === 'product_title' ? 'left' : 'right'} font-medium cursor-pointer hover:bg-gray-200 transition-colors`
    }

    return (
        <ProductLayout error={error}>
            <div className="mb-6 bg-white p-5 rounded-lg border shadow-sm">
                <h2 className="text-lg font-semibold mb-3">Summary</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                        <p className="text-sm text-gray-500">Products</p>
                        <p className="text-xl font-medium">{totalProducts}</p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-500">Total Conversions</p>
                        <p className="text-xl font-medium">{Math.round(totalConversions).toLocaleString()}</p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-500">Total Value</p>
                        <p className="text-xl font-medium">{formatCurrency(totalValue, settings.currency)}</p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-500">Overall ROAS</p>
                        <p className="text-xl font-medium">{overallROAS.toFixed(2)}x</p>
                    </div>
                </div>
            </div>
            
            <ProductInsights
                products={sortedData}
                configInfo={configInfo}
                isLoading={isLoading}
            />

            <ProductTitleImprover
                products={sortedData}
                apiInfo={apiInfo}
                isLoading={isLoading}
            />
            
            <div className="mb-6 bg-white p-5 rounded-lg border shadow-sm">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-3">
                    <h2 className="text-lg font-semibold">
                        Product Performance Visualization
                    </h2>
                    <div className="flex flex-col md:flex-row items-start md:items-center gap-3">
                        <div className="flex items-center">
                            <label className="mr-2 text-sm text-gray-600">Metric:</label>
                            <select 
                                className="p-2 border rounded bg-white" 
                                value={chartMetric}
                                onChange={(e) => setChartMetric(e.target.value as ChartMetric)}
                            >
                                <option value="roas">ROAS</option>
                                <option value="conversion_value">Conversion Value</option>
                                <option value="conversions">Conversions</option>
                                <option value="clicks">Clicks</option>
                                <option value="impressions">Impressions</option>
                            </select>
                        </div>
                        <div className="flex items-center">
                            <label className="mr-2 text-sm text-gray-600">Products:</label>
                            <select 
                                className="p-2 border rounded bg-white" 
                                value={productFilter}
                                onChange={(e) => setProductFilter(e.target.value as ProductFilter)}
                            >
                                <option value="top10">Top 10 Performers</option>
                                <option value="bottom10">Bottom 10 Performers</option>
                                <option value="average10">Average Performers</option>
                                {filteredData.length <= 20 && <option value="all">All Products</option>}
                            </select>
                        </div>
                    </div>
                </div>
                <div className="mt-2 text-xs text-gray-500 mb-4">
                    Showing {chartProducts.length} products sorted by {formatMetricName(chartMetric)}
                </div>
                {filteredData.length > 0 ? (
                    <ProductCircularChart 
                        products={chartProducts}
                        metric={chartMetric}
                        title={`Product ${formatMetricName(chartMetric)} Comparison`}
                    />
                ) : (
                    <div className="text-center p-8 text-gray-500">
                        No product data available to visualize
                    </div>
                )}
            </div>
            
            <div className="rounded-lg border overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-100 text-gray-700">
                            <tr>
                                <th className={getSortHeaderStyle('product_title')} onClick={() => handleSort('product_title')}>
                                    Product Title {getSortIndicator('product_title')}
                                </th>
                                <th className={getSortHeaderStyle('impressions')} onClick={() => handleSort('impressions')}>
                                    Impr {getSortIndicator('impressions')}
                                </th>
                                <th className={getSortHeaderStyle('clicks')} onClick={() => handleSort('clicks')}>
                                    Clicks {getSortIndicator('clicks')}
                                </th>
                                <th className={getSortHeaderStyle('cost')} onClick={() => handleSort('cost')}>
                                    Cost {getSortIndicator('cost')}
                                </th>
                                <th className={getSortHeaderStyle('conversions')} onClick={() => handleSort('conversions')}>
                                    Conv {getSortIndicator('conversions')}
                                </th>
                                <th className={getSortHeaderStyle('conversion_value')} onClick={() => handleSort('conversion_value')}>
                                    Value {getSortIndicator('conversion_value')}
                                </th>
                                <th className={getSortHeaderStyle('ctr')} onClick={() => handleSort('ctr')}>
                                    CTR {getSortIndicator('ctr')}
                                </th>
                                <th className={getSortHeaderStyle('roas')} onClick={() => handleSort('roas')}>
                                    ROAS {getSortIndicator('roas')}
                                </th>
                                <th className={getSortHeaderStyle('cvr')} onClick={() => handleSort('cvr')}>
                                    CvR {getSortIndicator('cvr')}
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y bg-white">
                            {sortedData.map((product, index) => (
                                <tr key={index} className="hover:bg-gray-50">
                                    <td className="px-4 py-3 text-left">{product.product_title}</td>
                                    <td className="px-4 py-3 text-right">{product.impressions.toLocaleString()}</td>
                                    <td className="px-4 py-3 text-right">{product.clicks.toLocaleString()}</td>
                                    <td className="px-4 py-3 text-right">{formatCurrency(product.cost, settings.currency)}</td>
                                    <td className="px-4 py-3 text-right">{Math.round(product.conversions).toLocaleString()}</td>
                                    <td className="px-4 py-3 text-right">{formatCurrency(product.conversion_value, settings.currency)}</td>
                                    <td className="px-4 py-3 text-right">{formatPercent(product.ctr)}</td>
                                    <td className="px-4 py-3 text-right">{product.roas.toFixed(2)}x</td>
                                    <td className="px-4 py-3 text-right">{formatPercent(product.cvr)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </ProductLayout>
    )
}

function ProductLayout({ children, error }: { children: React.ReactNode, error?: string }) {
    return (
        <div className="container mx-auto px-4 py-12 mt-16">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold text-gray-900">Product Performance</h1>
            </div>
            {error && <div className="text-red-500 mb-4">{error}</div>}
            {children}
        </div>
    )
}

// Helper function to format metric names for display
function formatMetricName(metric: ChartMetric): string {
    switch(metric) {
        case 'conversion_value': return 'Conversion Value'
        case 'roas': return 'ROAS'
        case 'conversions': return 'Conversions'
        case 'clicks': return 'Clicks'
        case 'impressions': return 'Impressions'
        default: return String(metric).charAt(0).toUpperCase() + String(metric).slice(1).replace('_', ' ')
    }
} 