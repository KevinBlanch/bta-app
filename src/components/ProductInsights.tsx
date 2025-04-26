'use client'

import { useState } from 'react'
import { ProductMetric, ProductInsight, ConfigInfo } from '@/lib/types'
import { AlertTriangle, ThumbsUp, Lightbulb, ChevronDown, ChevronUp } from 'lucide-react'
import { analyzeProductTitles } from '@/lib/openai'

interface ProductInsightsProps {
  products: ProductMetric[]
  configInfo?: ConfigInfo
  isLoading: boolean
}

export function ProductInsights({ products, configInfo, isLoading }: ProductInsightsProps) {
  const [insights, setInsights] = useState<ProductInsight[]>([])
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [error, setError] = useState<string>()

  const analyzeProducts = async () => {
    if (isAnalyzing) return
    
    try {
      setIsAnalyzing(true)
      setError(undefined)
      
      // Call the analysis function
      const analysisResults = await analyzeProductTitles(products, configInfo)
      setInsights(analysisResults)
    } catch (err) {
      console.error('Error analyzing products:', err)
      setError('Failed to analyze product data.')
    } finally {
      setIsAnalyzing(false)
    }
  }
  
  const renderInsightIcon = (type: ProductInsight['type']) => {
    switch (type) {
      case 'positive':
        return <ThumbsUp className="text-green-500" size={18} />
      case 'negative':
        return <AlertTriangle className="text-amber-500" size={18} />
      case 'suggestion':
        return <Lightbulb className="text-blue-500" size={18} />
      default:
        return null
    }
  }

  if (products.length === 0) return null

  return (
    <div className="mb-6 bg-white p-5 rounded-lg border shadow-sm">
      <div 
        className="flex justify-between items-center cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <h2 className="text-lg font-semibold">
          Product Title Insights
        </h2>
        <div className="flex items-center">
          {isExpanded ? 
            <ChevronUp className="h-5 w-5 text-gray-500" /> : 
            <ChevronDown className="h-5 w-5 text-gray-500" />
          }
        </div>
      </div>
      
      {isExpanded && (
        <div className="mt-4">
          {insights.length === 0 ? (
            <div className="py-4">
              {error ? (
                <div className="text-red-500 mb-4">{error}</div>
              ) : (
                <div className="text-center">
                  <p className="mb-4 text-gray-600">
                    Analyze product titles to discover patterns and optimization opportunities.
                  </p>
                  <button
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50"
                    onClick={analyzeProducts}
                    disabled={isAnalyzing}
                  >
                    {isAnalyzing ? 'Analyzing...' : 'Analyze Product Titles'}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4 mt-4">
              {insights.map((insight, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    {renderInsightIcon(insight.type)}
                    <h3 className="font-medium">{insight.title}</h3>
                  </div>
                  <p className="text-gray-600">{insight.content}</p>
                </div>
              ))}
              <div className="text-center pt-2">
                <button
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                  onClick={() => setInsights([])}
                >
                  Reset Analysis
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
} 