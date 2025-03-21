import { Card } from '@/components/ui/card'
import { useState } from 'react'

interface MetricCardProps {
  label: string
  value: string
  isSelected?: boolean
  onClick?: () => void
  className?: string
  color?: string
}

export function MetricCard({ 
  label, 
  value, 
  isSelected, 
  onClick,
  className = '',
  color = '#ea580c' // Default to orange if not provided
}: MetricCardProps) {
  const [isHovered, setIsHovered] = useState(false)
  
  // Set the box-shadow style based on whether the card is selected or hovered
  const style = isSelected 
    ? { boxShadow: `0 0 0 2px ${color}` } 
    : (isHovered && onClick) 
      ? { boxShadow: `0 0 0 2px ${color}80` } // 80 adds 50% opacity
      : undefined

  return (
    <Card
      className={`
        p-4 transition-all
        ${onClick ? 'cursor-pointer' : ''}
        ${className}
      `}
      style={style}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="text-sm font-medium text-gray-500">{label}</div>
      <div className="text-2xl font-bold mt-1 text-gray-900">{value}</div>
    </Card>
  )
} 