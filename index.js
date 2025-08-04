require('dotenv').config();
const puppeteer = require('puppeteer');
const { createClient } = require('@supabase/supabase-js');
const cron = require('node-cron');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Configuration
const config = {
  email: process.env.UDA_EMAIL,
  password: process.env.UDA_PASSWORD,
  producerId: process.env.PRODUCER_ID || "60cce07b8ada14e90f0783b7",
  cronSchedule: process.env.CRON_SCHEDULE || "0 6 * * *", // Default: 6 AM daily
  timezone: process.env.TZ || "America/Phoenix"
};

// Function to make direct API calls with authentication token
async function makeApiCalls(authToken) {
  console.log('📡 Making direct API calls to get pickup data...');
  
  // Calculate date range (10 days ago to today)
  const today = new Date();
  const tenDaysAgo = new Date();
  tenDaysAgo.setDate(today.getDate() - 10);
  
  const formatDate = (date) => {
    return date.toISOString().split('T')[0]; // YYYY-MM-DD format
  };
  
  const startDate = formatDate(tenDaysAgo);
  const endDate = formatDate(today);
  
  console.log(`📅 Date range: ${startDate} to ${endDate}`);
  console.log(`🏭 Producer ID: ${config.producerId}`);
  
  // Use the exact API endpoint from the working PowerShell script
  const apiUrl = `https://uda-api-express.prod.milkmoovement.io/pickups/producer-production?producerId=${config.producerId}&startDate=${startDate}&endDate=${endDate}`;
  
  const headers = {
    'Authorization': `Bearer ${authToken}`,
    'Accept': 'application/json, text/plain, */*',
    'Referer': 'https://uda.milkmoovement.io/',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  };
  
  try {
    console.log(`🔍 Calling API: ${apiUrl}`);
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: headers
    });
    
    console.log(`📡 Response status: ${response.status}`);
    
    if (response.ok) {
      const data = await response.text();
      const jsonData = JSON.parse(data);
      
      console.log(`📊 JSON structure: ${Object.keys(jsonData).join(', ')}`);
      
      // Store data in Supabase
      await storeDataInSupabase(jsonData, startDate, endDate);
      
      return true; // Successfully got data
    } else {
      console.log(`❌ API call failed: ${response.status} ${response.statusText}`);
      const errorText = await response.text();
      console.log(`❌ Error response: ${errorText}`);
      return false;
    }
    
  } catch (error) {
    console.log('❌ API call error:', error.message);
    return false;
  }
}

// Function to store data in Supabase
async function storeDataInSupabase(data, startDate, endDate) {
  try {
    console.log('💾 Storing data in Supabase...');
    
    // Store the complete dataset
    const { error: mainError } = await supabase
      .from('uda_data_extracts')
      .insert({
        extract_date: new Date().toISOString(),
        date_range_start: startDate,
        date_range_end: endDate,
        producer_id: config.producerId,
        raw_data: data,
        record_count: data.productionData ? data.productionData.length : 0,
        current_period_total_production: data.currentPeriodTotalProduction,
        prev_period_total_production: data.prevPeriodTotalProduction,
        daily_percent_change: data.dailyPercentChange,
        weekly_percent_change: data.weeklyPercentChange,
        monthly_percent_change: data.monthlyPercentChange
      });

    if (mainError) {
      console.error('❌ Error storing main data:', mainError);
      return false;
    }

    // Store individual production records for easier querying
    if (data.productionData && data.productionData.length > 0) {
      const productionRecords = data.productionData.map(record => ({
        extract_date: new Date().toISOString(),
        producer_id: config.producerId,
        pickup_id: record.id,
        pickup_date: record.pickup_date,
        tank_number: record.tank_number,
        pickup_amount: record.pickup_amount,
        temperature: parseFloat(record.temperature) || null,
        route_name: record.route_name,
        driver_name: record.driver_name,
        hauling_company: record.hauling_company_name,
        fat: record.fat || null,
        protein: record.protein || null,
        lactose: record.lactose || null,
        solids_not_fat: record.solids_not_fat || null,
        somatic_cell_count: record.somatic_cell_count || null,
        milk_urea_nitrogen: record.milk_urea_nitrogen || null,
        freeze_point: record.freeze_point || null,
        sample_barcodes: record.sample_barcodes || [],
        lab_id: record.lab_id || null,
        route_session_bol: record.route_session_bol
      }));

      console.log(`📝 Upserting ${productionRecords.length} production records (insert new, update existing)...`);
      console.log('Sample record structure:', JSON.stringify(productionRecords[0], null, 2));

      const { data: insertedRecords, error: recordsError } = await supabase
        .from('uda_production_records')
        .upsert(productionRecords, { 
          onConflict: 'pickup_id'
        })
        .select();

      if (recordsError) {
        console.error('❌ Error storing production records:', recordsError);
        console.error('❌ Error details:', JSON.stringify(recordsError, null, 2));
      } else {
        console.log(`✅ Upserted ${insertedRecords ? insertedRecords.length : productionRecords.length} production records`);
      }
    }

    console.log('✅ Data successfully stored in Supabase');
    return true;

  } catch (error) {
    console.error('❌ Supabase storage error:', error.message);
    return false;
  }
}

// Main scraping function
async function runScraper() {
  console.log(`🚀 Starting UDA data extraction at ${new Date().toISOString()}`);
  
  if (!config.email || !config.password) {
    console.error('❌ Missing UDA credentials in environment variables');
    return;
  }

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase configuration in environment variables');
    return;
  }

  const browser = await puppeteer.launch({ 
    headless: true, // Always headless for Docker compatibility
    slowMo: 50,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--disable-gpu',
      '--disable-web-security',
      '--disable-features=VizDisplayCompositor'
    ]
  });
  
  const page = await browser.newPage();
  
  try {
    console.log('🔐 Navigating to login page...');
    await page.goto('https://uda.milkmoovement.io/#/login', { 
      waitUntil: 'networkidle2',
      timeout: 60000 
    });
    
    // Wait for page to load
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Find login fields
    const emailSelectors = [
      'input[type="email"]',
      'input[name="email"]', 
      'input[name="username"]',
      'input[placeholder*="email" i]',
      '#email',
      '#username'
    ];
    
    const passwordSelectors = [
      'input[type="password"]',
      'input[name="password"]',
      '#password'
    ];
    
    let emailField = null;
    let passwordField = null;
    
    // Find email field
    for (const selector of emailSelectors) {
      try {
        await page.waitForSelector(selector, { timeout: 2000 });
        emailField = selector;
        console.log(`✅ Found email field: ${selector}`);
        break;
      } catch (e) {
        continue;
      }
    }
    
    // Find password field
    for (const selector of passwordSelectors) {
      try {
        await page.waitForSelector(selector, { timeout: 2000 });
        passwordField = selector;
        console.log(`✅ Found password field: ${selector}`);
        break;
      } catch (e) {
        continue;
      }
    }
    
    if (!emailField || !passwordField) {
      throw new Error('Could not find login fields');
    }
    
    console.log('📝 Filling login form...');
    await page.click(emailField, { clickCount: 3 });
    await page.type(emailField, config.email);
    
    await page.click(passwordField, { clickCount: 3 });
    await page.type(passwordField, config.password);
    
    // Find and click login button
    const buttonSelectors = [
      'button[type="submit"]',
      'input[type="submit"]',
      'button:has-text("Login")',
      'button:has-text("Sign In")'
    ];
    
    let loginButton = null;
    for (const selector of buttonSelectors) {
      try {
        await page.waitForSelector(selector, { timeout: 2000 });
        loginButton = selector;
        break;
      } catch (e) {
        continue;
      }
    }
    
    if (!loginButton) {
      throw new Error('Could not find login button');
    }
    
    await page.click(loginButton);
    console.log('🔑 Login submitted, waiting for authentication...');
    
    try {
      await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 15000 });
    } catch (e) {
      console.log('⏳ No navigation detected, checking current state...');
    }
    
    console.log(`📍 Current URL: ${page.url()}`);
    
    // Extract authentication token
    console.log('🔍 Extracting authentication token...');
    
    const localStorage = await page.evaluate(() => {
      const items = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        items[key] = localStorage.getItem(key);
      }
      return items;
    });
    
    console.log('💾 LocalStorage keys:', Object.keys(localStorage));
    
    // Look for Cognito ID token (required for this API)
    const cognitoIdTokenKey = Object.keys(localStorage).find(key => 
      key.includes('CognitoIdentityServiceProvider') && key.includes('idToken')
    );
    
    let authToken = null;
    if (cognitoIdTokenKey) {
      authToken = localStorage[cognitoIdTokenKey];
      console.log('✅ Found Cognito ID token');
    } else {
      throw new Error('Could not find authentication token');
    }
    
    if (authToken) {
      console.log('🔑 Auth token found, making API calls...');
      const apiSuccess = await makeApiCalls(authToken);
      
      if (apiSuccess) {
        console.log('✅ Successfully retrieved and stored data');
      } else {
        console.log('❌ API calls failed');
      }
    }
    
  } catch (error) {
    console.error('❌ Scraper error:', error.message);
  } finally {
    await browser.close();
    console.log('🔒 Browser closed');
  }
}

// Health check endpoint (if running as web service)
const http = require('http');
const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      status: 'healthy', 
      timestamp: new Date().toISOString(),
      nextRun: cron.validate(config.cronSchedule) ? 'scheduled' : 'invalid schedule'
    }));
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});

// Start the application
if (process.env.NODE_ENV === 'production') {
  console.log(`📅 Scheduling cron job: ${config.cronSchedule} (${config.timezone})`);
  
  // Schedule the scraper to run on cron schedule
  cron.schedule(config.cronSchedule, () => {
    console.log('⏰ Cron job triggered');
    runScraper();
  }, {
    timezone: config.timezone
  });
  
  // Start health check server
  const port = process.env.PORT || 3000;
  server.listen(port, () => {
    console.log(`🌐 Health check server running on port ${port}`);
    console.log(`🎯 Next scheduled run: ${config.cronSchedule}`);
  });
  
} else {
  // Development mode - run immediately
  console.log('🔧 Development mode - running scraper immediately');
  runScraper();
}