// src/lib/types.ts
import { SheetTab } from './config'

export interface Settings {
  sheetUrl: string
  currency: string
  selectedCampaign?: string
  campaigns?: Campaign[]
  activeTab?: SheetTab
  optimizationStrategy: 'profit' | 'revenue'
  costMetric: number
}

export interface Campaign {
  id: string
  name: string
  totalCost: number
}

// Daily campaign metrics
export interface AdMetric {
  campaign: string
  campaignId: string
  clicks: number
  value: number
  conv: number
  cost: number
  impr: number
  date: string
  view_through_conv?: number
}

// Search term metrics
export interface SearchTermMetric {
  search_term: string
  campaign: string
  ad_group: string
  impressions: number
  clicks: number
  cost: number
  conversions: number
  conversion_value: number
  cpc: number
  ctr: number
  conv_rate: number
  cpa: number
  roas: number
  aov: number
}

// Calculated metrics for daily data
export interface DailyMetrics extends AdMetric {
  view_through_conv: number
  CTR: number
  CvR: number
  CPA: number
  ROAS: number
  CPC: number
}

// Regular metrics excluding metadata fields
export type MetricKey = keyof Omit<AdMetric, 'campaign' | 'campaignId' | 'date'>

// Search term metrics excluding metadata
export type SearchTermMetricKey = keyof Omit<SearchTermMetric, 'search_term' | 'campaign' | 'ad_group'>

// All possible metrics (regular + calculated)
export type AllMetricKeys = MetricKey | keyof Omit<DailyMetrics, keyof AdMetric> | SearchTermMetricKey

export interface MetricOption {
  label: string
  format: (val: number) => string
}

export interface MetricOptions {
  [key: string]: MetricOption
}

export interface TabConfig {
  metrics: MetricOptions
}

export interface TabConfigs {
  [key: string]: TabConfig
}

// Type guard for search term data
export function isSearchTermMetric(data: any): data is SearchTermMetric {
  return 'search_term' in data && 'ad_group' in data
}

// Type guard for daily metrics
export function isAdMetric(data: any): data is AdMetric {
  return 'campaignId' in data && 'impr' in data
}

// Product performance metrics
export interface ProductMetric {
  product_title: string
  impressions: number
  clicks: number
  cost: number
  conversions: number
  conversion_value: number
  ctr: number
  roas: number
  cvr: number
}

// Type guard for product metrics
export function isProductMetric(data: any): data is ProductMetric {
  return 'product_title' in data && 'impressions' in data
}

// Configuration information
export interface ConfigInfo {
  API_KEY_NATULIM?: string
  PRODUCT_REVIEW_PROMPT?: string
  WEBSITE_PRODUCT_TITLE?: string
  WEBSITE_NATULIM?: string
}

// Product insight data
export interface ProductInsight {
  title: string
  content: string
  type: 'positive' | 'negative' | 'suggestion'
}

// Product title improvement suggestion
export interface TitleImprovement {
  originalTitle: string
  improvedTitle: string
  explanation: string
  score: number // 1-10 score for improvement quality
}

// Combined tab data type
export interface TabData {
  daily: AdMetric[]
  searchTerms: SearchTermMetric[]
  daily2: AdMetric[]
  productPerformance: ProductMetric[]
  configInfo: Record<string, string>
  api: Record<string, string>
}

// Helper type to get numeric values from metrics
export type MetricValue<T> = T extends number ? T : never 