const SHEET_URL = 'https://docs.google.com/spreadsheets/d/1HlP1yzF6qTFvFwsge4wndahD-ga1JPZnp903D4gCWGE/edit?gid=969514490#gid=969514490';                     // add your sheet url here
const SEARCH_TERMS_TAB = 'SearchTerms';
const DAILY_TAB = 'Daily';
const DAILY2_TAB = 'Daily2';  // New duplicate daily tab
const PRODUCT_PERFORMANCE_TAB = 'ProductPerformance';  // New tab for product performance data
const PMAX_TAB = 'Performance Max';  // New tab for Performance Max data

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

// GAQL query for Performance Max campaign data
const PMAX_CAMPAIGN_QUERY = `
SELECT
  campaign.name,
  campaign.id,
  campaign.status,
  metrics.clicks,
  metrics.impressions,
  metrics.cost_micros,
  metrics.conversions,
  metrics.conversions_value,
  metrics.conversions_from_interactions_rate
FROM campaign
WHERE 
  campaign.advertising_channel_type = "PERFORMANCE_MAX"
  AND segments.date DURING LAST_30_DAYS
ORDER BY metrics.cost_micros DESC
`;

// GAQL query for Performance Max asset group data
const PMAX_ASSET_GROUP_QUERY = `
SELECT
  campaign.name,
  campaign.id,
  asset_group.name,
  asset_group.id,
  asset_group.status,
  metrics.clicks,
  metrics.impressions,
  metrics.cost_micros,
  metrics.conversions,
  metrics.conversions_value
FROM asset_group
WHERE 
  campaign.advertising_channel_type = "PERFORMANCE_MAX"
  AND segments.date DURING LAST_30_DAYS
ORDER BY campaign.id, metrics.cost_micros DESC
`;

// GAQL query for Product Performance data
const PRODUCT_PERFORMANCE_QUERY = `
SELECT
  segments.product_title,
  metrics.impressions,
  metrics.clicks,
  metrics.cost_micros,
  metrics.conversions,
  metrics.conversions_value
FROM shopping_performance_view
WHERE segments.date DURING LAST_30_DAYS
  AND metrics.impressions > 0
  AND metrics.conversions > 0
  AND metrics.conversions_value > 0
ORDER BY metrics.cost_micros DESC
`;

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

// Process product performance data
function processProductPerformanceData(rows) {
  const data = [];
  while (rows.hasNext()) {
    const row = rows.next();
    
    // Extract data
    const productTitle = String(row['segments.product_title'] || '');
    const impressions = Number(row['metrics.impressions'] || 0);
    const clicks = Number(row['metrics.clicks'] || 0);
    const costMicros = Number(row['metrics.cost_micros'] || 0);
    const cost = costMicros / 1000000;  // Convert micros to actual currency
    const conversions = Number(row['metrics.conversions'] || 0);
    const convValue = Number(row['metrics.conversions_value'] || 0);
    
    // Calculate derived metrics
    const ctr = impressions > 0 ? clicks / impressions * 100 : 0;
    const cvr = clicks > 0 ? conversions / clicks * 100 : 0;
    const roas = cost > 0 ? convValue / cost : 0;
    
    // Create a new row
    const newRow = [
      productTitle,
      impressions,
      clicks,
      cost,
      conversions,
      convValue,
      ctr,
      roas,
      cvr
    ];
    
    data.push(newRow);
  }
  
  return data;
}

// Function to get data from named ranges in the Google Sheet
function getNamedRangeData(ss, rangeName) {
  try {
    const namedRanges = ss.getNamedRanges();
    const targetRange = namedRanges.find(range => range.getName() === rangeName);
    
    if (!targetRange) {
      Logger.log(`Named range "${rangeName}" not found.`);
      return null;
    }
    
    const range = targetRange.getRange();
    const values = range.getValues();
    
    // If it's a single cell, return just the value
    if (range.getNumRows() === 1 && range.getNumColumns() === 1) {
      return values[0][0];
    }
    
    // Otherwise return the full array of values
    return values;
  } catch (e) {
    Logger.log(`Error getting named range "${rangeName}": ${e}`);
    return null;
  }
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

    // Get named range data
    const apiKey = getNamedRangeData(ss, "API_KEY_NATULIM");
    const productReviewPrompt = getNamedRangeData(ss, "PRODUCT_REVIEW_PROMPT");
    const websiteProductTitle = getNamedRangeData(ss, "WEBSITE_PRODUCT_TITLE");
    
    // Create or update ConfigInfo tab to store these values
    let configSheet = ss.getSheetByName("ConfigInfo");
    if (!configSheet) {
      configSheet = ss.insertSheet("ConfigInfo");
    } else {
      configSheet.clearContents();
    }
    
    // Set headers and values
    configSheet.getRange(1, 1, 1, 2).setValues([["Config Name", "Value"]]).setFontWeight("bold");
    
    let configData = [];
    if (apiKey) configData.push(["API_KEY_NATULIM", apiKey]);
    if (productReviewPrompt) configData.push(["PRODUCT_REVIEW_PROMPT", productReviewPrompt]);
    if (websiteProductTitle) configData.push(["WEBSITE_PRODUCT_TITLE", websiteProductTitle]);
    
    if (configData.length > 0) {
      configSheet.getRange(2, 1, configData.length, 2).setValues(configData);
      Logger.log("Successfully stored configuration data.");
    } else {
      Logger.log("No configuration data found.");
    }

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

    // Process Performance Max tab with both campaign and asset group data
    processPMaxTab(ss);

    // Process Product Performance tab
    processTab(
      ss,
      PRODUCT_PERFORMANCE_TAB,
      ["product_title", "impressions", "clicks", "cost", "conversions", "conversion_value", "ctr", "roas", "cvr"],
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

// Function to process Performance Max tab with both campaign and asset group data
function processPMaxTab(ss) {
  try {
    // Get or create the Performance Max tab
    let sheet = ss.getSheetByName(PMAX_TAB);
    if (!sheet) {
      sheet = ss.insertSheet(PMAX_TAB);
    } else {
      // Clear existing data
      sheet.clearContents();
    }
    
    // Set title for campaign section
    sheet.getRange(1, 1).setValue("PERFORMANCE MAX CAMPAIGNS").setFontWeight("bold");
    
    // Set campaign headers (row 2)
    const campaignHeaders = [
      "Campaign", "Campaign ID", "Status", "Impressions", "Clicks", "Cost", 
      "Conversions", "Conv. Value", "CTR", "CPC", "Conv. Rate", "CPA", "ROAS"
    ];
    sheet.getRange(2, 1, 1, campaignHeaders.length).setValues([campaignHeaders]).setFontWeight("bold");
    
    // Process campaign data
    const campaignReport = AdsApp.report(PMAX_CAMPAIGN_QUERY);
    const campaignRows = campaignReport.rows();
    const campaignData = processPMaxCampaignData(campaignRows);
    
    // Write campaign data
    if (campaignData.length > 0) {
      sheet.getRange(3, 1, campaignData.length, campaignData[0].length).setValues(campaignData);
      Logger.log("Successfully wrote " + campaignData.length + " campaign rows to the Performance Max sheet.");
    } else {
      Logger.log("No Performance Max campaign data found.");
    }
    
    // Calculate row for asset group section (campaign data + 3 rows spacing)
    const assetGroupStartRow = 3 + campaignData.length + 3;
    
    // Set title for asset group section
    sheet.getRange(assetGroupStartRow - 1, 1).setValue("PERFORMANCE MAX ASSET GROUPS").setFontWeight("bold");
    
    // Set asset group headers
    const assetGroupHeaders = [
      "Campaign", "Campaign ID", "Asset Group", "Asset Group ID", "Status", 
      "Impressions", "Clicks", "Cost", "Conversions", "Conv. Value", 
      "CTR", "CPC", "CPA", "ROAS"
    ];
    sheet.getRange(assetGroupStartRow, 1, 1, assetGroupHeaders.length).setValues([assetGroupHeaders]).setFontWeight("bold");
    
    // Process asset group data
    const assetGroupReport = AdsApp.report(PMAX_ASSET_GROUP_QUERY);
    const assetGroupRows = assetGroupReport.rows();
    const assetGroupData = processPMaxAssetGroupData(assetGroupRows);
    
    // Write asset group data
    if (assetGroupData.length > 0) {
      sheet.getRange(assetGroupStartRow + 1, 1, assetGroupData.length, assetGroupData[0].length).setValues(assetGroupData);
      Logger.log("Successfully wrote " + assetGroupData.length + " asset group rows to the Performance Max sheet.");
    } else {
      Logger.log("No Performance Max asset group data found.");
    }
    
    // Add some basic formatting
    sheet.autoResizeColumns(1, Math.max(campaignHeaders.length, assetGroupHeaders.length));
    
  } catch (e) {
    Logger.log("Error in processPMaxTab function: " + e);
  }
}

// Process Performance Max campaign data
function processPMaxCampaignData(rows) {
  const data = [];
  while (rows.hasNext()) {
    const row = rows.next();
    
    // Extract data
    const campaign = String(row['campaign.name'] || '');
    const campaignId = String(row['campaign.id'] || '');
    const status = String(row['campaign.status'] || '');
    const impressions = Number(row['metrics.impressions'] || 0);
    const clicks = Number(row['metrics.clicks'] || 0);
    const costMicros = Number(row['metrics.cost_micros'] || 0);
    const cost = costMicros / 1000000;  // Convert micros to actual currency
    const conversions = Number(row['metrics.conversions'] || 0);
    const convValue = Number(row['metrics.conversions_value'] || 0);
    const convRate = Number(row['metrics.conversions_from_interactions_rate'] || 0);
    
    // Calculate derived metrics
    const ctr = impressions > 0 ? clicks / impressions : 0;
    const cpc = clicks > 0 ? cost / clicks : 0;
    const cpa = conversions > 0 ? cost / conversions : 0;
    const roas = cost > 0 ? convValue / cost : 0;
    
    // Create a new row
    const newRow = [
      campaign,
      campaignId,
      status,
      impressions,
      clicks,
      cost,
      conversions,
      convValue,
      ctr,
      cpc,
      convRate,
      cpa,
      roas
    ];
    
    data.push(newRow);
  }
  
  return data;
}

// Process Performance Max asset group data
function processPMaxAssetGroupData(rows) {
  const data = [];
  while (rows.hasNext()) {
    const row = rows.next();
    
    // Extract data
    const campaign = String(row['campaign.name'] || '');
    const campaignId = String(row['campaign.id'] || '');
    const assetGroup = String(row['asset_group.name'] || '');
    const assetGroupId = String(row['asset_group.id'] || '');
    const status = String(row['asset_group.status'] || '');
    const impressions = Number(row['metrics.impressions'] || 0);
    const clicks = Number(row['metrics.clicks'] || 0);
    const costMicros = Number(row['metrics.cost_micros'] || 0);
    const cost = costMicros / 1000000;  // Convert micros to actual currency
    const conversions = Number(row['metrics.conversions'] || 0);
    const convValue = Number(row['metrics.conversions_value'] || 0);
    
    // Skip asset groups with no activity in the last 30 days
    if (impressions === 0 && clicks === 0 && cost === 0 && conversions === 0) {
      continue;
    }
    
    // Calculate derived metrics
    const ctr = impressions > 0 ? clicks / impressions : 0;
    const cpc = clicks > 0 ? cost / clicks : 0;
    const cpa = conversions > 0 ? cost / conversions : 0;
    const roas = cost > 0 ? convValue / cost : 0;
    
    // Create a new row
    const newRow = [
      campaign,
      campaignId,
      assetGroup,
      assetGroupId,
      status,
      impressions,
      clicks,
      cost,
      conversions,
      convValue,
      ctr,
      cpc,
      cpa,
      roas
    ];
    
    data.push(newRow);
  }
  
  return data;
}
