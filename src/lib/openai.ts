import { ProductMetric, ProductInsight, ConfigInfo, TitleImprovement } from './types'

// This would be an actual API call to OpenAI in a production environment
export async function analyzeProductTitles(
  products: ProductMetric[], 
  configInfo?: ConfigInfo
): Promise<ProductInsight[]> {
  
  try {
    // This is a mock implementation for now
    // In a real implementation, we would:
    // 1. Format the product data in a structured way
    // 2. Use the API_KEY_NATULIM from configInfo to authenticate
    // 3. Pass the PRODUCT_REVIEW_PROMPT as context
    // 4. Include WEBSITE_PRODUCT_TITLE as reference
    // 5. Make the actual API call to OpenAI
    
    // For demonstration, we'll just return mock insights after a delay
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    // Analyze the data to find patterns
    const highPerformers = products
      .filter(p => p.roas > 4)
      .sort((a, b) => b.roas - a.roas)
      .slice(0, 5)
    
    const lowPerformers = products
      .filter(p => p.conversions > 0 && p.roas < 2)
      .sort((a, b) => a.roas - b.roas)
      .slice(0, 5)
    
    // Check for patterns
    const insights: ProductInsight[] = []
    
    // Product title length analysis
    const titleLengths = products.map(p => ({
      title: p.product_title,
      words: p.product_title.split(' ').length,
      chars: p.product_title.length,
      roas: p.roas,
      ctr: p.ctr
    }))
    
    const shortTitles = titleLengths.filter(t => t.words < 6)
    const longTitles = titleLengths.filter(t => t.words >= 6)
    
    const avgRoasShort = shortTitles.reduce((sum, t) => sum + t.roas, 0) / (shortTitles.length || 1)
    const avgRoasLong = longTitles.reduce((sum, t) => sum + t.roas, 0) / (longTitles.length || 1)
    
    if (Math.abs(avgRoasShort - avgRoasLong) > 0.5) {
      insights.push({
        title: 'Title Length Matters',
        content: avgRoasShort > avgRoasLong 
          ? `Shorter titles (under 6 words) are performing better with an average ROAS of ${avgRoasShort.toFixed(1)}x vs ${avgRoasLong.toFixed(1)}x for longer titles.`
          : `Longer titles (6+ words) are performing better with an average ROAS of ${avgRoasLong.toFixed(1)}x vs ${avgRoasShort.toFixed(1)}x for shorter titles.`,
        type: 'positive'
      })
    }
    
    // Brand presence analysis
    const brandFirst = products.filter(p => p.product_title.toLowerCase().startsWith('natulim'))
    const brandNotFirst = products.filter(p => !p.product_title.toLowerCase().startsWith('natulim') && p.product_title.toLowerCase().includes('natulim'))
    
    if (brandFirst.length > 0 && brandNotFirst.length > 0) {
      const avgCtrBrandFirst = brandFirst.reduce((sum, p) => sum + p.ctr, 0) / brandFirst.length
      const avgCtrBrandNotFirst = brandNotFirst.reduce((sum, p) => sum + p.ctr, 0) / brandNotFirst.length
      
      if (Math.abs(avgCtrBrandFirst - avgCtrBrandNotFirst) > 0.5) {
        insights.push({
          title: 'Brand Position Impact',
          content: avgCtrBrandFirst > avgCtrBrandNotFirst
            ? `Products with brand name "Natulim" at the beginning have ${(avgCtrBrandFirst / avgCtrBrandNotFirst * 100 - 100).toFixed(0)}% higher CTR.`
            : `Products with brand name "Natulim" not at the beginning perform better with ${(avgCtrBrandNotFirst / avgCtrBrandFirst * 100 - 100).toFixed(0)}% higher CTR.`,
          type: 'positive'
        })
      }
    }
    
    // Keyword analysis
    const ecoProducts = products.filter(p => p.product_title.toLowerCase().includes('ecológic'))
    const nonEcoProducts = products.filter(p => !p.product_title.toLowerCase().includes('ecológic'))
    
    if (ecoProducts.length > 0 && nonEcoProducts.length > 0) {
      const avgRoasEco = ecoProducts.reduce((sum, p) => sum + p.roas, 0) / ecoProducts.length
      const avgRoasNonEco = nonEcoProducts.reduce((sum, p) => sum + p.roas, 0) / nonEcoProducts.length
      
      if (avgRoasEco > avgRoasNonEco) {
        insights.push({
          title: 'Eco-Friendly Messaging Works',
          content: `Products with "Ecológico" in the title have ${(avgRoasEco / avgRoasNonEco * 100 - 100).toFixed(0)}% higher ROAS than those without.`,
          type: 'positive'
        })
      }
    }
    
    // Attribute analysis
    const sizeMissing = highPerformers.filter(p => !p.product_title.match(/\d+\s*(ml|g|kg|l|oz|ml|unidades|uds)/i)).length > 0
    
    if (sizeMissing) {
      insights.push({
        title: 'Consider Adding Product Sizes',
        content: 'Some top-performing products don\'t include size information. Adding this could improve performance further.',
        type: 'suggestion'
      })
    }
    
    // Suggestions for improvement
    insights.push({
      title: 'Descriptive Attributes',
      content: 'Add more descriptive attributes (like "Concentrado" or "Ultra") for underperforming products to increase interest.',
      type: 'suggestion'
    })
    
    return insights
  } catch (error) {
    console.error('Error analyzing product titles:', error)
    throw new Error('Failed to analyze product titles')
  }
}

// New function to improve product titles
export async function improveProductTitles(
  products: ProductMetric[],
  apiInfo: Record<string, string>
): Promise<TitleImprovement[]> {
  try {
    // In a real implementation, we would:
    // 1. Use the API_KEY_NATULIM from apiInfo to authenticate with OpenAI
    // 2. Fetch and analyze the website from WEBSITE_NATULIM to extract USPs and brand values
    // 3. Use the analytics from top-performing products to inform improvements
    // 4. Generate improved titles based on these insights
    
    // For demonstration, we'll use a mock implementation
    await new Promise(resolve => setTimeout(resolve, 1800))
    
    // Get website URL (if available)
    const websiteUrl = apiInfo?.WEBSITE_NATULIM || 'https://natulim.com/'
    
    // Select products to improve (focusing on low performers with conversions)
    const candidatesForImprovement = products
      .filter(p => p.conversions > 0 && p.roas < 3)
      .sort((a, b) => a.roas - b.roas)
      .slice(0, 3)
    
    // Extract patterns from high performers
    const highPerformers = products
      .filter(p => p.roas > 4)
      .sort((a, b) => b.roas - a.roas)
      .slice(0, 5)
    
    const highPerformerPatterns = analyzeHighPerformerTitles(highPerformers)
    
    // Generate improvements based on patterns from successful products
    const improvements: TitleImprovement[] = candidatesForImprovement.map(product => {
      // Generate an improved title based on patterns from high performers
      const improvedTitle = generateImprovedTitle(product.product_title, highPerformerPatterns, websiteUrl)
      
      return {
        originalTitle: product.product_title,
        improvedTitle,
        explanation: generateExplanation(product.product_title, improvedTitle, highPerformerPatterns),
        score: Math.round(Math.random() * 3) + 7 // Random score between 7-10
      }
    })
    
    return improvements
  } catch (error) {
    console.error('Error improving product titles:', error)
    throw new Error('Failed to improve product titles')
  }
}

// Helper functions for title improvement
function analyzeHighPerformerTitles(highPerformers: ProductMetric[]): string[] {
  // In a real implementation, this would use NLP to extract meaningful patterns
  // For this demo, we'll return some mock patterns
  return [
    'Starts with brand name',
    'Includes specific size information',
    'Uses descriptive adjectives',
    'Mentions "Ecológico"',
    'Includes product category'
  ]
}

function generateImprovedTitle(originalTitle: string, patterns: string[], websiteUrl: string): string {
  // This would normally use the OpenAI API to generate improved titles
  // For this demo, we'll use some simple transformations
  
  let improved = originalTitle;
  
  // Apply some of the patterns from successful products
  if (!improved.toLowerCase().startsWith('natulim')) {
    improved = 'Natulim ' + improved;
  }
  
  if (!improved.match(/\d+\s*(ml|g|kg|l|oz)/i) && improved.length < 50) {
    improved += ' 500ml';
  }
  
  if (!improved.toLowerCase().includes('ecológic') && improved.length < 60) {
    improved += ' Ecológico';
  }
  
  if (!improved.toLowerCase().includes('natural') && improved.length < 65) {
    improved = improved.replace('Ecológico', 'Natural Ecológico');
  }
  
  // Add a descriptor based on product type
  if (improved.toLowerCase().includes('limpiador') && !improved.toLowerCase().includes('concentrado')) {
    improved = improved.replace('Limpiador', 'Limpiador Concentrado');
  }
  
  return improved;
}

function generateExplanation(original: string, improved: string, patterns: string[]): string {
  // This would normally use the OpenAI API to generate explanations
  // For this demo, we'll create a simple explanation based on the changes
  
  const changes: string[] = [];
  
  if (improved.toLowerCase().startsWith('natulim') && !original.toLowerCase().startsWith('natulim')) {
    changes.push('Added brand name to the start for better brand recognition');
  }
  
  if (improved.match(/\d+\s*(ml|g|kg|l|oz)/i) && !original.match(/\d+\s*(ml|g|kg|l|oz)/i)) {
    changes.push('Added size information for clarity and customer expectations');
  }
  
  if (improved.toLowerCase().includes('ecológic') && !original.toLowerCase().includes('ecológic')) {
    changes.push('Added "Ecológico" to highlight eco-friendly aspects that resonate with customers');
  }
  
  if (improved.toLowerCase().includes('natural') && !original.toLowerCase().includes('natural')) {
    changes.push('Added "Natural" to emphasize product quality and ingredients');
  }
  
  if (improved.toLowerCase().includes('concentrado') && !original.toLowerCase().includes('concentrado')) {
    changes.push('Added "Concentrado" to highlight product strength and value');
  }
  
  if (changes.length === 0) {
    return 'Minor improvements to align with successful product patterns while maintaining the original message.';
  }
  
  return changes.join('. ') + '. These changes align with patterns observed in top-performing products.';
} 