const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

// Function to make direct API calls with authentication token (using known working endpoint)
async function makeApiCalls(authToken, downloadPath) {
  console.log('📡 Making direct API calls to get pickup data...');
  
  // Calculate date range (10 days ago to today, matching PowerShell script)
  const today = new Date();
  const tenDaysAgo = new Date();
  tenDaysAgo.setDate(today.getDate() - 10);
  
  const formatDate = (date) => {
    return date.toISOString().split('T')[0]; // YYYY-MM-DD format
  };
  
  const startDate = formatDate(tenDaysAgo);
  const endDate = formatDate(today);
  const producerId = "60cce07b8ada14e90f0783b7";
  
  console.log(`📅 Date range: ${startDate} to ${endDate}`);
  console.log(`🏭 Producer ID: ${producerId}`);
  
  // Use the exact API endpoint from the working PowerShell script
  const apiUrl = `https://uda-api-express.prod.milkmoovement.io/pickups/producer-production?producerId=${producerId}&startDate=${startDate}&endDate=${endDate}`;
  
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
      
      // Save the data to a file
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const filename = `uda-pickups-${timestamp}.json`;
      const filePath = path.join(downloadPath, filename);
      
      fs.writeFileSync(filePath, data);
      const stats = fs.statSync(filePath);
      
      console.log(`💾 Saved data to: ${filename} (${Math.round(stats.size / 1024)}KB)`);
      
      // Try to parse as JSON to validate and show summary
      try {
        const jsonData = JSON.parse(data);
        console.log(`📊 JSON structure: ${Object.keys(jsonData).join(', ')}`);
        
        if (Array.isArray(jsonData)) {
          console.log(`📝 Found ${jsonData.length} records`);
          if (jsonData.length > 0) {
            console.log(`🔍 Sample record keys: ${Object.keys(jsonData[0]).join(', ')}`);
          }
        } else if (jsonData.data && Array.isArray(jsonData.data)) {
          console.log(`📝 Found ${jsonData.data.length} records in data array`);
          if (jsonData.data.length > 0) {
            console.log(`🔍 Sample record keys: ${Object.keys(jsonData.data[0]).join(', ')}`);
          }
        }
      } catch (e) {
        console.log('📄 Data saved (could not parse as JSON)');
      }
      
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

(async () => {
  // Set up download directory
  const downloadPath = path.resolve(__dirname, 'downloads');
  if (!fs.existsSync(downloadPath)) {
    fs.mkdirSync(downloadPath);
  }

  const browser = await puppeteer.launch({ 
    headless: false, // Shows the browser window
    slowMo: 50,      // Reduced from 250ms to 50ms
    devtools: false  // Set to true if you want dev tools open
  });
  const page = await browser.newPage();
  
  // Set download behavior
  const client = await page.target().createCDPSession();
  await client.send('Page.setDownloadBehavior', {
    behavior: 'allow',
    downloadPath: downloadPath
  });
  
  try {
    console.log('Navigating to login page...');
    await page.goto('https://uda.milkmoovement.io/#/login', { 
      waitUntil: 'domcontentloaded',
      timeout: 60000 
    });
    
    // Wait for page to load completely
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Let's first see what's on the page
    console.log('Page loaded, looking for login form...');
    
    // Try to find login fields with various selectors
    const emailSelectors = [
      'input[type="email"]',
      'input[name="email"]', 
      'input[name="username"]',
      'input[placeholder*="email" i]',
      'input[placeholder*="Email" i]',
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
    
    // Try to find email field
    for (const selector of emailSelectors) {
      try {
        await page.waitForSelector(selector, { timeout: 1000 });
        emailField = selector;
        console.log(`Found email field with selector: ${selector}`);
        break;
      } catch (e) {
        // Continue to next selector
      }
    }
    
    // Try to find password field
    for (const selector of passwordSelectors) {
      try {
        await page.waitForSelector(selector, { timeout: 1000 });
        passwordField = selector;
        console.log(`Found password field with selector: ${selector}`);
        break;
      } catch (e) {
        // Continue to next selector
      }
    }
    
    if (!emailField || !passwordField) {
      console.log('Could not find login fields. Let me take a screenshot...');
      await page.screenshot({ path: 'login-page.png', fullPage: true });
      console.log('Screenshot saved as login-page.png');
      return;
    }
    
    // Replace with your actual credentials
    const email = 'seth@azdairyco.com';
    const password = 'WscNaz1@';
    
    console.log('Filling login form...');
    
    // Clear and fill email field
    await page.click(emailField, { clickCount: 3 });
    await page.type(emailField, email);
    
    // Clear and fill password field
    await page.click(passwordField, { clickCount: 3 });
    await page.type(passwordField, password);
    
    console.log('Looking for login button...');
    
    // Try to find and click login button
    const buttonSelectors = [
      'button[type="submit"]',
      'input[type="submit"]',
      'button:has-text("Login")',
      'button:has-text("Sign In")',
      '.login-button',
      '#login-button'
    ];
    
    let loginButton = null;
    for (const selector of buttonSelectors) {
      try {
        await page.waitForSelector(selector, { timeout: 1000 });
        loginButton = selector;
        console.log(`Found login button with selector: ${selector}`);
        break;
      } catch (e) {
        // Continue to next selector
      }
    }
    
    if (loginButton) {
      await page.click(loginButton);
      console.log('Clicked login button, waiting for navigation...');
      
      try {
        await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 10000 });
        console.log('Login successful! Current URL:', page.url());
      } catch (e) {
        console.log('No navigation detected, checking current URL:', page.url());
      }
    } else {
      console.log('Could not find login button. Taking screenshot...');
      await page.screenshot({ path: 'login-form.png', fullPage: true });
    }
    
    console.log('Login successful! Current URL:', page.url());
    
    // Extract authentication token from cookies or localStorage
    console.log('Extracting authentication token...');
    
    const cookies = await page.cookies();
    const authCookie = cookies.find(cookie => 
      cookie.name.toLowerCase().includes('token') || 
      cookie.name.toLowerCase().includes('auth') ||
      cookie.name.toLowerCase().includes('session')
    );
    
    const localStorage = await page.evaluate(() => {
      const items = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        items[key] = localStorage.getItem(key);
      }
      return items;
    });
    
    const sessionStorage = await page.evaluate(() => {
      const items = {};
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        items[key] = sessionStorage.getItem(key);
      }
      return items;
    });
    
    console.log('🍪 Cookies found:', cookies.map(c => c.name));
    console.log('💾 LocalStorage keys:', Object.keys(localStorage));
    console.log('💾 SessionStorage keys:', Object.keys(sessionStorage));
    
    // Look for token in various places - prioritize ID token for this API
    let authToken = null;
    
    if (authCookie) {
      authToken = authCookie.value;
      console.log('✅ Found auth token in cookie:', authCookie.name);
    } else {
      // Look specifically for Cognito ID token first (required for this API)
      const cognitoIdTokenKey = Object.keys(localStorage).find(key => 
        key.includes('CognitoIdentityServiceProvider') && key.includes('idToken')
      );
      
      if (cognitoIdTokenKey) {
        authToken = localStorage[cognitoIdTokenKey];
        console.log('✅ Found Cognito ID token:', cognitoIdTokenKey);
      } else {
        // Fallback to access token
        const cognitoAccessTokenKey = Object.keys(localStorage).find(key => 
          key.includes('CognitoIdentityServiceProvider') && key.includes('accessToken')
        );
        
        if (cognitoAccessTokenKey) {
          authToken = localStorage[cognitoAccessTokenKey];
          console.log('⚠️ Using Cognito access token (may not work):', cognitoAccessTokenKey);
        } else {
          // Final fallback to any token-like keys
          const tokenKeys = [...Object.keys(localStorage), ...Object.keys(sessionStorage)]
            .filter(key => key.toLowerCase().includes('token') || key.toLowerCase().includes('auth'));
          
          if (tokenKeys.length > 0) {
            const tokenKey = tokenKeys[0];
            authToken = localStorage[tokenKey] || sessionStorage[tokenKey];
            console.log('⚠️ Found fallback auth token:', tokenKey);
          }
        }
      }
    }
    
    if (authToken) {
      console.log('🔑 Auth token found, making API calls...');
      
      // First, let's monitor network requests to see what the site actually calls
      console.log('🌐 Monitoring network requests to discover API endpoints...');
      
      const apiCalls = [];
      page.on('request', request => {
        const url = request.url();
        if (url.includes('api') || url.includes('pickup') || url.includes('production') || url.includes('export')) {
          apiCalls.push({
            url: url,
            method: request.method(),
            headers: request.headers()
          });
          console.log(`🌐 API Request: ${request.method()} ${url}`);
        }
      });
      
      page.on('response', response => {
        const url = response.url();
        if (url.includes('api') || url.includes('pickup') || url.includes('production') || url.includes('export')) {
          console.log(`🌐 API Response: ${response.status()} ${url}`);
        }
      });
      
      // Navigate to a page that might trigger API calls
      console.log('📄 Loading main dashboard to trigger API calls...');
      try {
        await page.goto('https://uda.milkmoovement.io/#/pickups-and-labs', { 
          waitUntil: 'networkidle0',
          timeout: 30000 
        });
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        if (apiCalls.length > 0) {
          console.log(`✅ Discovered ${apiCalls.length} API calls:`);
          apiCalls.forEach(call => {
            console.log(`  🔗 ${call.method} ${call.url}`);
          });
        }
      } catch (e) {
        console.log('Error loading dashboard:', e.message);
      }
      
      // Use the token for direct API calls (no need for page parameter)
      const apiSuccess = await makeApiCalls(authToken, downloadPath);
      
      if (apiSuccess) {
        console.log('✅ Successfully retrieved data via API');
      } else {
        console.log('❌ API calls failed - token may be invalid or expired');
      }
    } else {
      console.log('❌ No auth token found - login may have failed');
    }
    
  } catch (error) {
    console.error('Script error:', error.message);
  }
  
  // Keep browser open for 5 seconds to see the result
  console.log('Keeping browser open for 5 seconds...');
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  await browser.close();
})();