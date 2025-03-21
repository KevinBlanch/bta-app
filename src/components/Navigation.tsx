'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Settings } from 'lucide-react'
import { COLORS } from '@/lib/config'
import { useState } from 'react'

export function Navigation() {
    const pathname = usePathname()
    const [isSettingsHovered, setIsSettingsHovered] = useState(false)
    
    // Create a navigation tab component
    const NavTab = ({ href, label }: { href: string, label: string }) => {
        const isActive = pathname === href
        const [isHovered, setIsHovered] = useState(false)
        
        // Calculate background color for the indicator
        const indicatorStyle = {
            backgroundColor: isActive 
                ? COLORS.primary 
                : isHovered 
                    ? '#e5e7eb' // Tailwind gray-200
                    : 'transparent',
            transform: isActive 
                ? 'scaleX(1)' 
                : isHovered 
                    ? 'scaleX(0.8)' 
                    : 'scaleX(0)',
            transformOrigin: 'center',
            transition: 'transform 0.2s ease, background-color 0.2s ease',
            height: isActive ? '3px' : '2px',
            borderRadius: '2px 2px 0 0'
        }
        
        return (
            <Link
                href={href}
                className={cn(
                    "relative px-3 py-2 text-sm font-medium transition-colors",
                    isActive ? "text-foreground font-semibold" : "text-foreground/60"
                )}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
            >
                {label}
                <span 
                    className="absolute bottom-0 left-0 w-full"
                    style={indicatorStyle}
                />
            </Link>
        )
    }

    const isSettingsActive = pathname === "/settings"
    const settingsStyle = {
        color: isSettingsActive ? COLORS.primary : (isSettingsHovered ? '#374151' : '#6B7280'),
        backgroundColor: isSettingsActive ? '#F3F4F6' : (isSettingsHovered ? '#F9FAFB' : 'transparent'),
        transform: isSettingsActive || isSettingsHovered ? 'scale(1.05)' : 'scale(1)',
        transition: 'all 0.2s ease'
    }

    return (
        <nav className="fixed top-0 z-50 w-full border-b border-gray-200 bg-white shadow-sm">
            <div className="container mx-auto px-4 h-16 flex items-center">
                <div className="flex items-center justify-between w-full">
                    <div className="flex items-center space-x-6">
                        <span className="font-bold mr-6">
                            Build the Agent
                        </span>
                        <div className="flex items-center gap-4">
                            <NavTab href="/" label="Google Ads Dashboard" />
                            <NavTab href="/terms" label="Search Terms" />
                        </div>
                    </div>
                    <Link
                        href="/settings"
                        className="p-2 rounded-full transition-all duration-200"
                        style={settingsStyle}
                        onMouseEnter={() => setIsSettingsHovered(true)}
                        onMouseLeave={() => setIsSettingsHovered(false)}
                        aria-label="Settings"
                    >
                        <Settings size={20} />
                    </Link>
                </div>
            </div>
        </nav>
    )
} 