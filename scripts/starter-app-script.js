const SHEET_URL = 'https://docs.google.com/spreadsheets/d/1HlP1yzF6qTFvFwsge4wndahD-ga1JPZnp903D4gCWGE/edit?gid=969514490#gid=969514490';                     // add your sheet url here
const SEARCH_TERMS_TAB = 'SearchTerms';
const DAILY_TAB = 'Daily';
const DAILY2_TAB = 'Daily2';  // New duplicate daily tab
const PRODUCT_PERFORMANCE_TAB = 'ProductPerformance';  // New tab for product performance data
const API_KEY_RANGE = 'apikey';  // Named range in the Google Sheet for the API key

// GAQL query for search terms
const SEARCH_TERMS_QUERY = `
SELECT 
  search_term_view.search_term, 
  campaign.name,
  ad_group.name,
  metrics.impressions, 
  metrics.clicks, 
  metrics.cost_micros, 
  metrics.conversions, 
  metrics.conversions_value
FROM search_term_view
WHERE segments.date DURING LAST_30_DAYS
  AND campaign.advertising_channel_type = "SEARCH"
  AND metrics.impressions >= 30
ORDER BY metrics.cost_micros DESC
`;

// GAQL query for daily campaign data
const DAILY_QUERY = `
SELECT
  campaign.name,
  campaign.id,
  metrics.clicks,
  metrics.conversions_value,
  metrics.conversions,
  metrics.cost_micros,
  metrics.impressions,
  segments.date
FROM campaign
WHERE segments.date DURING LAST_30_DAYS
ORDER BY segments.date DESC, metrics.cost_micros DESC
`;

// GAQL query for Daily2 tab (separate copy for future modifications)
const DAILY2_QUERY = `
SELECT
  campaign.name,
  campaign.id,
  metrics.clicks,
  metrics.impressions,
  metrics.cost_micros,
  metrics.view_through_conversions,
  segments.date,
  metrics.conversions
FROM campaign
WHERE segments.date DURING LAST_30_DAYS
ORDER BY segments.date DESC, metrics.cost_micros DESC
`;

// Separate query for purchase conversion actions
const PURCHASE_CONVERSIONS_QUERY = `
SELECT
  campaign.id,
  segments.date,
  segments.conversion_action_name,
  segments.conversion_action_category,
  metrics.conversions,
  metrics.conversions_value
FROM campaign
WHERE 
  segments.date DURING LAST_30_DAYS AND
  segments.conversion_action_name = "Google Shopping App Purchase"
`;

// GAQL query for product performance data
const PRODUCT_PERFORMANCE_QUERY = `
SELECT
  ad_group_ad.ad.final_urls,
  metrics.clicks,
  metrics.conversions,
  metrics.cost_micros,
  metrics.conversions_value,
  segments.date
FROM ad_group_ad
WHERE segments.date DURING LAST_30_DAYS
  AND campaign.advertising_channel_type = "SHOPPING"
ORDER BY metrics.cost_micros DESC
`;

// Function to retrieve the API key from the named range in the Google Sheet
function getApiKey(ss) {
  try {
    const apiKeyRange = ss.getRangeByName(API_KEY_RANGE);
    if (!apiKeyRange) {
      Logger.log(`Warning: Named range "${API_KEY_RANGE}" not found in the spreadsheet. Please create a named range called "apikey" containing your API key.`);
      return '';
    }
    const apiKey = apiKeyRange.getValue();
    Logger.log(`Successfully retrieved API key from named range "${API_KEY_RANGE}"`);
    return apiKey;
  } catch (e) {
    Logger.log(`Error retrieving API key from named range "${API_KEY_RANGE}": ${e}`);
    return '';
  }
}

// Function to analyze performance data
function analyzePerformanceData(dailyData, daily2Data) {
  try {
    // Aggregate metrics
    const totalMetrics = dailyData.reduce((acc, row) => {
      acc.cost += Number(row['metrics.cost_micros'] || 0) / 1000000;
      acc.conversions += Number(row['metrics.conversions'] || 0);
      acc.value += Number(row['metrics.conversions_value'] || 0);
      acc.clicks += Number(row['metrics.clicks'] || 0);
      acc.impressions += Number(row['metrics.impressions'] || 0);
      return acc;
    }, { cost: 0, conversions: 0, value: 0, clicks: 0, impressions: 0 });

    // Get view-through conversions from daily2
    const totalViewThroughConv = daily2Data.reduce((acc, row) => {
      return acc + Number(row['metrics.view_through_conversions'] || 0);
    }, 0);

    // Calculate key metrics
    const cpa = totalMetrics.conversions > 0 ? totalMetrics.cost / totalMetrics.conversions : 0;
    const roas = totalMetrics.cost > 0 ? totalMetrics.value / totalMetrics.cost : 0;
    const ctr = totalMetrics.impressions > 0 ? (totalMetrics.clicks / totalMetrics.impressions) * 100 : 0;

    // Generate analysis
    let analysis = '';
    
    if (roas < 1) {
      analysis = `Campaign performance shows concerning ROAS of ${roas.toFixed(2)}x with CPA at €${cpa.toFixed(2)}. Total conversions: ${totalMetrics.conversions} (plus ${totalViewThroughConv} view-through), CTR: ${ctr.toFixed(2)}%.`;
    } else if (cpa > 15) {
      analysis = `Campaign achieving positive ROAS of ${roas.toFixed(2)}x but CPA is high at €${cpa.toFixed(2)}. Total conversions: ${totalMetrics.conversions} (plus ${totalViewThroughConv} view-through), CTR: ${ctr.toFixed(2)}%.`;
    } else {
      analysis = `Campaign performing well with ROAS at ${roas.toFixed(2)}x and CPA at €${cpa.toFixed(2)}. Total conversions: ${totalMetrics.conversions} (plus ${totalViewThroughConv} view-through), CTR: ${ctr.toFixed(2)}%.`;
    }

    return [['Analysis', analysis]];
  } catch (e) {
    Logger.log("Error in analyzePerformanceData: " + e);
    return [['Analysis', 'Unable to generate analysis due to an error.']];
  }
}

function processProductPerformanceData(rows) {
  const data = [];
  while (rows.hasNext()) {
    const row = rows.next();
    
    // Extract data from the row
    const finalUrls = row['ad_group_ad.ad.final_urls'] || [];
    const productTitle = finalUrls.length > 0 ? finalUrls[0].split('/').pop().replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Unknown Product';
    const clicks = Number(row['metrics.clicks'] || 0);
    const conversions = Number(row['metrics.conversions'] || 0);
    const costMicros = Number(row['metrics.cost_micros'] || 0);
    const cost = costMicros / 1000000;  // Convert micros to actual currency
    const conversionValue = Number(row['metrics.conversions_value'] || 0);
    const date = String(row['segments.date'] || '');

    // Calculate derived metrics
    const costPerConversion = conversions > 0 ? cost / conversions : 0;
    const roas = cost > 0 ? conversionValue / cost : 0;

    // Create a new row with all the data
    const newRow = [
      productTitle,
      clicks,
      conversions,
      cost,
      costPerConversion,
      conversionValue,
      roas,
      date
    ];

    // Push new row to the data array
    data.push(newRow);
  }
  return data;
}

function main() {
  try {
    // Access the Google Sheet
    let ss;
    if (!SHEET_URL) {
      ss = SpreadsheetApp.create("Google Ads Report");
      let url = ss.getUrl();
      Logger.log("No SHEET_URL found, so this sheet was created: " + url);
    } else {
      ss = SpreadsheetApp.openByUrl(SHEET_URL);
    }
    
    // Retrieve the API key from the named range
    const apiKey = getApiKey(ss);
    Logger.log(`API Key available for use: ${apiKey ? 'Yes' : 'No'}`);

    // First get purchase conversion data
    const purchaseData = getPurchaseConversionData();
    Logger.log(`Found purchase data for ${Object.keys(purchaseData).length} campaign-date combinations`);

    // Process Search Terms tab
    processTab(
      ss,
      SEARCH_TERMS_TAB,
      ["search_term", "campaign", "ad_group", "impressions", "clicks", "cost", "conversions", "conversion_value", "cpc", "ctr", "conv_rate", "cpa", "roas"],
      SEARCH_TERMS_QUERY,
      calculateSearchTermsMetrics
    );

    // Process Daily tab
    processTab(
      ss,
      DAILY_TAB,
      ["campaign", "campaignId", "impr", "clicks", "value", "conv", "cost", "date"],
      DAILY_QUERY,
      processDailyData
    );
    
    // Process Daily2 tab with purchase conversions only
    processTab(
      ss,
      DAILY2_TAB,
      ["campaign", "campaignId", "impr", "clicks", "value", "conv", "cost", "view_through_conv", "date"],
      DAILY2_QUERY,
      (rows) => processDaily2Data(rows, purchaseData)
    );

    // Process Product Performance tab
    processTab(
      ss,
      PRODUCT_PERFORMANCE_TAB,
      ["productTitle", "clicks", "conversions", "cost", "costPerConversion", "conversionValue", "roas", "date"],
      PRODUCT_PERFORMANCE_QUERY,
      processProductPerformanceData
    );

  } catch (e) {
    Logger.log("Error in main function: " + e);
  }
}

function processTab(ss, tabName, headers, query, dataProcessor) {
  try {
    // Get or create the tab
    let sheet = ss.getSheetByName(tabName);
    if (!sheet) {
      sheet = ss.insertSheet(tabName);
    } else {
      // Clear existing data
      sheet.clearContents();
    }

    // Set headers
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight("bold");

    // Run the query
    const report = AdsApp.report(query);
    const rows = report.rows();

    // Process data
    const data = dataProcessor(rows);

    // Write data to sheet (only if we have data)
    if (data.length > 0) {
      sheet.getRange(2, 1, data.length, data[0].length).setValues(data);
      Logger.log("Successfully wrote " + data.length + " rows to the " + tabName + " sheet.");
    } else {
      Logger.log("No data found for " + tabName + ".");
    }
  } catch (e) {
    Logger.log("Error in processTab function for " + tabName + ": " + e);
  }
}

function calculateSearchTermsMetrics(rows) {
  const data = [];
  while (rows.hasNext()) {
    const row = rows.next();
    const searchTerm = row['search_term_view.search_term'];
    const campaign = row['campaign.name'];
    const adGroup = row['ad_group.name'];
    const impressions = parseInt(row['metrics.impressions'], 10) || 0;
    const clicks = parseInt(row['metrics.clicks'], 10) || 0;
    const costMicros = parseInt(row['metrics.cost_micros'], 10) || 0;
    const conversions = parseFloat(row['metrics.conversions']) || 0;
    const conversionValue = parseFloat(row['metrics.conversions_value']) || 0;

    // Calculate metrics
    const cost = costMicros / 1000000;  // Convert micros to actual currency
    const cpc = clicks > 0 ? cost / clicks : 0;
    const ctr = impressions > 0 ? clicks / impressions : 0;
    const convRate = clicks > 0 ? conversions / clicks : 0;
    const cpa = conversions > 0 ? cost / conversions : 0;
    const roas = cost > 0 ? conversionValue / cost : 0;

    // Add all variables and calculated metrics to a new row
    const newRow = [searchTerm, campaign, adGroup, impressions, clicks, cost, conversions, conversionValue, cpc, ctr, convRate, cpa, roas];

    // Push new row to the data array
    data.push(newRow);
  }
  return data;
}

function processDailyData(rows) {
  const data = [];
  while (rows.hasNext()) {
    const row = rows.next();

    // Extract data according to the requested columns
    const campaign = String(row['campaign.name'] || '');
    const campaignId = String(row['campaign.id'] || '');
    const clicks = Number(row['metrics.clicks'] || 0);
    const value = Number(row['metrics.conversions_value'] || 0);
    const conv = Number(row['metrics.conversions'] || 0);
    const costMicros = Number(row['metrics.cost_micros'] || 0);
    const cost = costMicros / 1000000;  // Convert micros to actual currency
    const impr = Number(row['metrics.impressions'] || 0);
    const date = String(row['segments.date'] || '');

    // Create a new row with the data
    const newRow = [campaign, campaignId, impr, clicks, value, conv, cost, date];

    // Push new row to the data array
    data.push(newRow);
  }
  return data;
}

// Function to get purchase conversion data
function getPurchaseConversionData() {
  const purchaseData = {};
  
  try {
    // Run the purchase conversions query
    const report = AdsApp.report(PURCHASE_CONVERSIONS_QUERY);
    const rows = report.rows();
    
    // Process each row of purchase data
    while (rows.hasNext()) {
      const row = rows.next();
      
      const campaignId = String(row['campaign.id'] || '');
      const date = String(row['segments.date'] || '');
      const convActionName = String(row['segments.conversion_action_name'] || '');
      const conversions = Number(row['metrics.conversions'] || 0);
      const convValue = Number(row['metrics.conversions_value'] || 0);
      
      // Only include Google Shopping App Purchase conversion actions
      if (convActionName === "Google Shopping App Purchase") {
        // Create a key for this campaign-date combination
        const key = `${campaignId}_${date}`;
        
        // If we already have data for this campaign-date, add to it
        if (purchaseData[key]) {
          purchaseData[key].conversions += conversions;
          purchaseData[key].value += convValue;
        } else {
          // Otherwise create a new entry
          purchaseData[key] = {
            conversions: conversions,
            value: convValue
          };
        }
      }
    }
    
    // Log some diagnostic info
    Logger.log(`Processed purchase conversion data for ${Object.keys(purchaseData).length} campaign-date combinations`);
    
  } catch (e) {
    Logger.log("Error fetching purchase conversion data: " + e);
  }
  
  return purchaseData;
}

// Separate data processing function for Daily2 tab
function processDaily2Data(rows, purchaseData) {
  const data = [];
  
  // Check if we have purchase data
  if (!purchaseData || Object.keys(purchaseData).length === 0) {
    Logger.log("Warning: No purchase conversion data found");
  }
  
  while (rows.hasNext()) {
    const row = rows.next();

    // Basic campaign data
    const campaign = String(row['campaign.name'] || '');
    const campaignId = String(row['campaign.id'] || '');
    const clicks = Number(row['metrics.clicks'] || 0);
    const costMicros = Number(row['metrics.cost_micros'] || 0);
    const cost = costMicros / 1000000;  // Convert micros to actual currency
    const impr = Number(row['metrics.impressions'] || 0);
    const viewThroughConv = Number(row['metrics.view_through_conversions'] || 0);
    const date = String(row['segments.date'] || '');
    
    // Look up purchase conversion data for this campaign-date
    const key = `${campaignId}_${date}`;
    const purchaseInfo = purchaseData[key] || { conversions: 0, value: 0 };
    
    // Create a new row with the data
    const newRow = [
      campaign, 
      campaignId, 
      impr, 
      clicks, 
      purchaseInfo.value, 
      purchaseInfo.conversions, 
      cost, 
      viewThroughConv, 
      date
    ];
    
    data.push(newRow);
  }
  
  // Log diagnostic info
  Logger.log(`Processed ${data.length} rows for Daily2 tab`);
  
  return data;
}
