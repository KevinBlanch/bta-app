const SHEET_URL = 'https://docs.google.com/spreadsheets/d/1HlP1yzF6qTFvFwsge4wndahD-ga1JPZnp903D4gCWGE/edit?gid=969514490#gid=969514490';                     // add your sheet url here
const SEARCH_TERMS_TAB = 'SearchTerms';
const DAILY_TAB = 'Daily';
const DAILY2_TAB = 'Daily2';  // New duplicate daily tab

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
  metrics.conversions_value,
  metrics.conversions,
  metrics.cost_micros,
  metrics.impressions,
  segments.date
FROM campaign
WHERE segments.date DURING LAST_30_DAYS
ORDER BY segments.date DESC, metrics.cost_micros DESC
`;

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
    
    // Process Daily2 tab (duplicate of Daily)
    processTab(
      ss,
      DAILY2_TAB,
      ["campaign", "campaignId", "impr", "clicks", "value", "conv", "cost", "date"],
      DAILY2_QUERY,
      processDaily2Data
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

// Separate data processing function for Daily2 tab
function processDaily2Data(rows) {
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
