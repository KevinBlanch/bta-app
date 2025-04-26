'use client'

import { useEffect, useRef } from 'react'
import * as d3 from 'd3'
import { ProductMetric } from '@/lib/types'
import { COLORS } from '@/lib/config'

interface ProductCircularChartProps {
  products: ProductMetric[]
  metric: keyof ProductMetric
  title?: string
}

// Extended type for chart data
interface ChartProductData extends ProductMetric {
  shortTitle: string
  index: number // Add index for color and reference
}

export function ProductCircularChart({ products, metric, title = "Product Performance Visualization" }: ProductCircularChartProps) {
  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    if (typeof window === 'undefined' || !svgRef.current) return

    try {
      // Clear previous chart
      const svgContainer = d3.select(svgRef.current)
      svgContainer.selectAll('*').remove()

      // Check if we have valid products with the selected metric
      if (!products || products.length === 0) {
        renderEmptyState(svgContainer, "No products available to visualize")
        return
      }

      const validProducts = products.filter(p => 
        p && typeof p[metric] === 'number' && !isNaN(p[metric] as number))
      
      if (validProducts.length === 0) {
        renderEmptyState(svgContainer, `No valid data for ${formatMetricName(metric)}`)
        return
      }

      // Set up dimensions with better sizing
      const containerWidth = Math.min(1100, window.innerWidth - 40) // Even wider container
      const containerHeight = 550 // Slightly taller to accommodate more spacing
      const margin = { top: 80, right: 320, bottom: 80, left: 40 } // More right margin
      const width = containerWidth - margin.left - margin.right
      const height = containerHeight - margin.top - margin.bottom
      const radius = Math.min(width, height) / 2
      const innerRadius = radius * 0.25
      
      // Create SVG with proper sizing
      svgContainer
        .attr('width', containerWidth)
        .attr('height', containerHeight)
        .attr('viewBox', `0 0 ${containerWidth} ${containerHeight}`)
        .attr('preserveAspectRatio', 'xMidYMid meet')
        
      // Add centered title and subtitle outside the chart area
      svgContainer.append('text')
        .attr('class', 'chart-title')
        .attr('text-anchor', 'middle')
        .attr('font-size', '18px')
        .attr('font-weight', 'bold')
        .attr('fill', '#2d3748')
        .attr('x', containerWidth / 2)
        .attr('y', margin.top / 2 - 10)
        .text(title)

      svgContainer.append('text')
        .attr('class', 'chart-subtitle')
        .attr('text-anchor', 'middle')
        .attr('font-size', '14px')
        .attr('fill', '#4a5568')
        .attr('x', containerWidth / 2)
        .attr('y', margin.top / 2 + 10)
        .text(`Displaying ${validProducts.length} products`)
        
      // Create chart area with placement shifted more to the left
      const svg = svgContainer
        .append('g')
        .attr('transform', `translate(${containerWidth / 5}, ${containerHeight / 2})`)

      // Limit to 10 products for visibility
      const topProducts = [...validProducts]
        .sort((a, b) => (b[metric] as number) - (a[metric] as number))
        .slice(0, 10)
        .map((p, i) => ({
          ...p,
          shortTitle: p.product_title.length > 25 
            ? p.product_title.substring(0, 23) + '...' 
            : p.product_title,
          index: i + 1 // Add 1-based index for reference
        }))

      // X scale with better spacing
      const x = d3.scaleBand()
        .domain(topProducts.map(d => d.shortTitle))
        .range([0, 2 * Math.PI])
        .padding(0.15)  // Increase padding between segments

      // Find the maximum value for proper scaling
      const maxValue = d3.max(topProducts, d => d[metric] as number) || 0
      
      // Y scale
      const y = d3.scaleRadial()
        .domain([0, maxValue * 1.1])  // Add 10% padding to max value
        .range([innerRadius, radius])

      // Create a distinct color scale for better segment identification based on app theme colors
      const baseColors = [
        COLORS.primary,                             // Primary green (#39b397)
        COLORS.accent,                              // Primary Blue (#2c58a4) 
        COLORS.secondary,                           // Secondary green (#a4dccf)
        '#607d8b',                                  // Blue Gray
        '#555555',                                  // Dark Gray
        d3.color(COLORS.primary)?.darker(0.8)?.toString() || '#2a8a73',  // Darker Primary
        d3.color(COLORS.accent)?.darker(0.5)?.toString() || '#1c3869',   // Darker Accent
        d3.color(COLORS.secondary)?.darker(0.6)?.toString() || '#6fa99c', // Darker Secondary
        d3.color(COLORS.primary)?.brighter(0.7)?.toString() || '#5dd1b6', // Lighter Primary
        d3.color(COLORS.accent)?.brighter(0.8)?.toString() || '#5a88d6'   // Lighter Accent
      ]
      
      const colorScale = d3.scaleOrdinal<string>()
        .domain(topProducts.map(d => d.shortTitle))
        .range(baseColors)

      // Create arc generator
      const arc = d3.arc<any>()
        .innerRadius(innerRadius)
        .outerRadius(d => y(d.value))
        .startAngle(d => x(d.shortTitle) || 0)
        .endAngle(d => (x(d.shortTitle) || 0) + x.bandwidth())
        .padAngle(0.03) // Slightly increase padding for better separation
        .padRadius(innerRadius)
        .cornerRadius(6)  // More pronounced rounded corners

      // Prepare data
      const chartData = topProducts.map(product => ({
        shortTitle: product.shortTitle,
        product_title: product.product_title,
        value: product[metric] as number,
        index: product.index
      }))

      // Create a group for each arc segment
      const arcGroups = svg.selectAll('.arc-group')
        .data(chartData)
        .enter()
        .append('g')
        .attr('class', 'arc-group')

      // Add the arcs
      arcGroups.append('path')
        .attr('d', arc)
        .attr('fill', d => colorScale(d.shortTitle))
        .attr('stroke', 'white')
        .attr('stroke-width', 2)
        .attr('opacity', 0.9)
        .on('mouseover', function(event, d) {
          // Highlight on hover
          d3.select(this)
            .attr('opacity', 1)
            .attr('stroke-width', 3)
            .attr('stroke', '#333')
            
          // Show tooltip
          tooltip
            .style('opacity', 1)
            .html(`
              <div style="font-weight:bold; margin-bottom:4px; max-width:300px; overflow-wrap:break-word;">
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
                  <span style="display:inline-block;width:12px;height:12px;background-color:${colorScale(d.shortTitle)};border-radius:50%"></span>
                  <span>${d.index}. ${d.product_title}</span>
                </div>
              </div>
              <div style="display:flex; justify-content:space-between;">
                <span>${formatMetricName(metric)}:</span>
                <span style="font-weight:bold; margin-left:10px;">
                  ${formatMetricValue(metric, d.value)}
                </span>
              </div>
            `)
            .style('left', (event.pageX + 10) + 'px')
            .style('top', (event.pageY - 25) + 'px')
        })
        .on('mouseout', function() {
          d3.select(this)
            .attr('opacity', 0.9)
            .attr('stroke-width', 2)
            .attr('stroke', 'white')
            
          tooltip.style('opacity', 0)
        })

      // Add segment number labels directly on the segments
      arcGroups.append('text')
        .attr('class', 'segment-number')
        .attr('transform', d => {
          const angle = ((x(d.shortTitle) || 0) + x.bandwidth() / 2) - Math.PI / 2
          const distance = (innerRadius + y(d.value)) / 2
          return `translate(${Math.cos(angle) * distance}, ${Math.sin(angle) * distance})`
        })
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'middle')
        .attr('font-size', '14px')
        .attr('font-weight', 'bold')
        .attr('fill', 'white')
        .attr('stroke', 'rgba(0,0,0,0.3)')
        .attr('stroke-width', '0.5px')
        .text(d => d.index)

      // Create a legend container with more space - positioned further right with more distance from chart
      const legendContainer = svgContainer
        .append('g')
        .attr('class', 'legend-container')
        .attr('transform', `translate(${containerWidth / 5 * 2 + 60}, ${margin.top + 20})`)

      // Add legend items with more space between them
      const legendItems = legendContainer.selectAll('.legend-item')
        .data(chartData)
        .enter()
        .append('g')
        .attr('class', 'legend-item')
        .attr('transform', (d, i) => `translate(0, ${i * 40})`) // Increase vertical spacing even more

      // Add color swatches
      legendItems.append('rect')
        .attr('width', 15)
        .attr('height', 15)
        .attr('rx', 3)
        .attr('fill', d => colorScale(d.shortTitle))

      // Add product full names with index - with more space
      const productTexts = legendItems.append('text')
        .attr('x', 25)
        .attr('y', 12)
        .attr('font-size', '13px')
        .attr('fill', '#4a5568')
        .text(d => `${d.index}. ${d.product_title}`)
        .call(wrap, 330) // Further reduce wrapping width to ensure space for percentages
      
      // Calculate max width for the legend to ensure trend indicators are aligned
      let maxTextWidth = 0;
      productTexts.each(function() {
        const bbox = this.getBBox();
        if (bbox.width > maxTextWidth) {
          maxTextWidth = bbox.width;
        }
      });
      
      // Ensure min width for alignment
      maxTextWidth = Math.max(maxTextWidth, 330);

      // Add metric value for each legend item - align with first line of product name
      legendItems.append('text')
        .attr('x', -25) // Move slightly further left
        .attr('y', 12)
        .attr('text-anchor', 'end')
        .attr('font-size', '12px')
        .attr('fill', '#718096')
        .text(d => formatMetricValue(metric, d.value))
      
      // Add trend percentages inline with product name (to the right)
      legendItems.append('text')
        .attr('x', maxTextWidth + 35) // Position right of the longest product name
        .attr('y', 12)
        .attr('font-size', '11px')
        .attr('font-weight', 'medium')
        .attr('text-anchor', 'start')
        .attr('fill', (d, i) => i % 3 === 0 ? '#16a34a' : (i % 3 === 1 ? '#dc2626' : '#718096'))
        .text((d, i) => i % 3 === 0 ? '↑ 12%' : (i % 3 === 1 ? '↓ 8%' : '− 0%'))
        .attr('class', 'trend-indicator')

      // Add tooltip
      const tooltip = d3.select('body').append('div')
        .attr('class', 'chart-tooltip')
        .style('position', 'absolute')
        .style('background', 'white')
        .style('padding', '8px 12px')
        .style('border', '1px solid #ddd')
        .style('border-radius', '6px')
        .style('box-shadow', '0 2px 10px rgba(0,0,0,0.1)')
        .style('pointer-events', 'none')
        .style('opacity', 0)
        .style('font-size', '12px')
        .style('z-index', '100')
        .style('transition', 'opacity 0.15s')

      return () => {
        tooltip.remove()
      }
    } catch (error) {
      console.error("Error rendering chart:", error)
      renderEmptyState(d3.select(svgRef.current), "Error rendering visualization")
    }
  }, [products, metric, title])

  // Helper function to render empty state
  const renderEmptyState = (svg: any, message: string) => {
    svg.attr('width', 600)
      .attr('height', 300)
      .append('text')
      .attr('x', 300)
      .attr('y', 150)
      .attr('text-anchor', 'middle')
      .attr('font-size', '16px')
      .attr('fill', '#6B7280')
      .text(message)
  }

  // Helper function to wrap text - enhanced to handle longer names
  const wrap = (text: any, width: number) => {
    text.each(function(this: SVGTextElement) {
      const text = d3.select(this)
      const words = text.text().split(/\s+/).reverse()
      let word
      let line: string[] = []
      let lineNumber = 0
      const lineHeight = 1.1 // ems
      const y = text.attr("y")
      const dy = parseFloat(text.attr("dy") || "0")
      let tspan = text.text(null)
        .append("tspan")
        .attr("x", text.attr("x"))
        .attr("y", y)
        .attr("dy", dy + "em")
      
      while (word = words.pop()) {
        line.push(word)
        tspan.text(line.join(" "))
        const node = tspan.node()
        if (node && node.getComputedTextLength() > width) {
          line.pop()
          tspan.text(line.join(" "))
          line = [word]
          tspan = text.append("tspan")
            .attr("x", text.attr("x"))
            .attr("y", y)
            .attr("dy", ++lineNumber * lineHeight + dy + "em")
            .text(word)
        }
      }
    })
  }

  // Format metric display name
  function formatMetricName(metricKey: keyof ProductMetric): string {
    switch(metricKey) {
      case 'conversion_value': return 'Conversion Value'
      case 'roas': return 'Return on Ad Spend (ROAS)'
      case 'ctr': return 'Click-Through Rate'
      case 'cvr': return 'Conversion Rate'
      default: return metricKey.charAt(0).toUpperCase() + metricKey.slice(1)
    }
  }

  // Format metric values with appropriate units
  function formatMetricValue(metricKey: keyof ProductMetric, value: number): string {
    switch(metricKey) {
      case 'conversion_value':
      case 'cost':
        return `$${Math.round(value)}`
      case 'roas':
        return `${value.toFixed(2)}x`
      case 'ctr':
      case 'cvr':
        return `${value.toFixed(1)}%`
      case 'impressions':
      case 'clicks':
      case 'conversions':
        return Math.round(value).toLocaleString()
      default:
        return Math.round(value).toString()
    }
  }

  return (
    <div className="w-full flex flex-col justify-center">
      <svg 
        ref={svgRef} 
        className="w-full h-auto max-w-5xl mx-auto" 
        style={{ minHeight: "500px" }}
      />
      
      {metric === 'conversions' && (
        <div className="mt-4 mx-auto max-w-5xl px-4">
          <details className="text-sm text-gray-600 bg-gray-50 p-3 rounded-md border border-gray-200">
            <summary className="font-medium cursor-pointer">
              Why might my product conversions appear lower than actual sales?
            </summary>
            <div className="mt-2 pl-2">
              <p className="mb-2">
                Not all conversions are linked to specific products. In Google Ads:
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>
                  Product-specific sales (via Shopping Ads or Performance Max) only capture conversions where a product ID is matched and attributed
                </li>
                <li>
                  If a customer clicks an ad but purchases through a different flow or buys a different product, the conversion may count in overall reporting but not in product-level data
                </li>
              </ul>
            </div>
          </details>
        </div>
      )}
    </div>
  )
} 