import { Card } from '@/components/ui/card'
import { useState } from 'react'
import { COLORS } from '@/lib/config'

interface MetricCardProps {
  label: string
  value: string | number
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
  color = COLORS.primary // Default to primary green
}: MetricCardProps) {
  const [isHovered, setIsHovered] = useState(false)
  
  // Set the box-shadow style based on whether the card is selected or hovered
  const style = {
    backgroundColor: COLORS.card.background,
    border: `1px solid ${COLORS.card.border}`,
    boxShadow: isSelected 
      ? `0 0 0 2px ${color}` 
      : (isHovered && onClick) 
        ? `0 0 0 2px ${color}40` // 40 adds 25% opacity
        : 'none',
    transition: 'all 0.2s ease'
  }

  return (
    <Card
      className={`
        p-4 transition-all
        ${onClick ? 'cursor-pointer hover:shadow-md' : ''}
        ${className}
      `}
      style={style}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div style={{ color: COLORS.text.secondary }} className="text-sm font-medium">{label}</div>
      <div style={{ color: COLORS.text.primary }} className="text-2xl font-bold mt-1">{value}</div>
    </Card>
  )
} 