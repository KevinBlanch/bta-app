'use client'

import { useState } from 'react'
import { ProductMetric, TitleImprovement } from '@/lib/types'
import { ChevronDown, ChevronUp, Star, Edit, ArrowUp } from 'lucide-react'
import { improveProductTitles } from '@/lib/openai'

interface ProductTitleImproverProps {
  products: ProductMetric[]
  apiInfo?: Record<string, string>
  isLoading: boolean
}

export function ProductTitleImprover({ products, apiInfo, isLoading }: ProductTitleImproverProps) {
  const [improvements, setImprovements] = useState<TitleImprovement[]>([])
  const [isImproving, setIsImproving] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [error, setError] = useState<string>()

  const generateImprovements = async () => {
    if (isImproving) return
    
    try {
      setIsImproving(true)
      setError(undefined)
      
      // Call the title improvement function
      const titleImprovements = await improveProductTitles(products, apiInfo || {})
      setImprovements(titleImprovements)
    } catch (err) {
      console.error('Error improving product titles:', err)
      setError('Failed to generate title improvements.')
    } finally {
      setIsImproving(false)
    }
  }
  
  const renderScoreStars = (score: number) => {
    const stars = []
    for (let i = 0; i < 5; i++) {
      stars.push(
        <Star
          key={i}
          size={14}
          className={i < score/2 ? "text-yellow-500 fill-yellow-500" : "text-gray-300"}
        />
      )
    }
    return <div className="flex">{stars}</div>
  }

  if (products.length === 0) return null

  return (
    <div className="mb-6 bg-white p-5 rounded-lg border shadow-sm">
      <div 
        className="flex justify-between items-center cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <h2 className="text-lg font-semibold">
          Product Title Improvements
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
          {improvements.length === 0 ? (
            <div className="py-4">
              {error ? (
                <div className="text-red-500 mb-4">{error}</div>
              ) : (
                <div className="text-center">
                  <p className="mb-4 text-gray-600">
                    Generate improved product titles based on your high-performing products and brand values.
                  </p>
                  <button
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50"
                    onClick={generateImprovements}
                    disabled={isImproving}
                  >
                    {isImproving ? 'Generating Improvements...' : 'Improve Product Titles'}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6 mt-4">
              {improvements.map((improvement, index) => (
                <div key={index} className="border rounded-lg p-4 divide-y">
                  <div className="pb-3">
                    <div className="flex justify-between items-start mb-1">
                      <h3 className="font-medium text-gray-900">Original Title</h3>
                      <div className="text-sm text-gray-500">Low performing</div>
                    </div>
                    <p className="text-gray-700">{improvement.originalTitle}</p>
                  </div>
                  
                  <div className="pt-3">
                    <div className="flex justify-between items-start mb-1">
                      <div className="flex items-center">
                        <h3 className="font-medium text-gray-900 mr-2">Improved Title</h3>
                        <ArrowUp className="h-4 w-4 text-green-500" />
                      </div>
                      <div className="flex items-center">
                        <span className="text-sm text-gray-500 mr-1">Score:</span>
                        {renderScoreStars(improvement.score)}
                      </div>
                    </div>
                    <p className="text-green-700 font-medium mb-2">{improvement.improvedTitle}</p>
                    <div className="bg-gray-50 p-2 rounded mt-2 text-sm">
                      <p className="text-gray-600">
                        <Edit className="inline h-4 w-4 mr-1 text-blue-500" />
                        {improvement.explanation}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
              
              <div className="text-center pt-2">
                <button
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                  onClick={() => setImprovements([])}
                >
                  Reset
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
} 