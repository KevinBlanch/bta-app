import React from 'react';
import { AdMetric } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { COLORS } from '@/lib/config';

interface PerformanceAnalysisProps {
  dailyData: AdMetric[];
  daily2Data: AdMetric[];
}

// Helper function to format numbers with commas for thousands
const formatNumber = (num: number): string => {
  return Math.round(num).toLocaleString();
};

export function PerformanceAnalysis({ dailyData, daily2Data }: PerformanceAnalysisProps) {
  // Aggregate metrics from daily data
  const totalMetrics = dailyData.reduce((acc, row) => {
    acc.cost += Number(row.cost || 0);
    acc.conversions += Number(row.conv || 0);
    acc.value += Number(row.value || 0);
    acc.clicks += Number(row.clicks || 0);
    acc.impressions += Number(row.impr || 0);
    return acc;
  }, { cost: 0, conversions: 0, value: 0, clicks: 0, impressions: 0 });

  // Get view-through conversions from daily2
  const totalViewThroughConv = daily2Data.reduce((acc, row) => {
    return acc + Number(row.view_through_conv || 0);
  }, 0);

  // Calculate key metrics
  const cpa = totalMetrics.conversions > 0 ? totalMetrics.cost / totalMetrics.conversions : 0;
  const roas = totalMetrics.cost > 0 ? totalMetrics.value / totalMetrics.cost : 0;
  const ctr = totalMetrics.impressions > 0 ? (totalMetrics.clicks / totalMetrics.impressions) * 100 : 0;

  // Generate analysis
  let analysis = '';
  let sentiment: 'negative' | 'warning' | 'positive' = 'positive';
  
  if (roas < 1) {
    analysis = `Campaign performance shows concerning ROAS of ${roas.toFixed(2)}x with CPA at €${cpa.toFixed(2)}. Total conversions: ${formatNumber(totalMetrics.conversions)} (plus ${formatNumber(totalViewThroughConv)} view-through), CTR: ${ctr.toFixed(2)}%.`;
    sentiment = 'negative';
  } else if (cpa > 15) {
    analysis = `Campaign achieving positive ROAS of ${roas.toFixed(2)}x but CPA is high at €${cpa.toFixed(2)}. Total conversions: ${formatNumber(totalMetrics.conversions)} (plus ${formatNumber(totalViewThroughConv)} view-through), CTR: ${ctr.toFixed(2)}%.`;
    sentiment = 'warning';
  } else {
    analysis = `Campaign performing well with ROAS at ${roas.toFixed(2)}x and CPA at €${cpa.toFixed(2)}. Total conversions: ${formatNumber(totalMetrics.conversions)} (plus ${formatNumber(totalViewThroughConv)} view-through), CTR: ${ctr.toFixed(2)}%.`;
    sentiment = 'positive';
  }

  const cardStyle = {
    backgroundColor: COLORS.card.background,
    border: `1px solid ${COLORS.card.border}`,
  };

  const titleStyle = {
    color: COLORS.text.primary,
  };

  const analysisStyle = {
    color: sentiment === 'negative' ? '#dc2626' : // red
          sentiment === 'warning' ? '#d97706' : // amber
          COLORS.primary, // success uses primary green
  };

  return (
    <Card style={cardStyle}>
      <CardHeader>
        <CardTitle style={titleStyle}>Performance Analysis</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-lg" style={analysisStyle}>
          {analysis}
        </div>
      </CardContent>
    </Card>
  );
} 