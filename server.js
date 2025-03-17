const express = require('express');
const puppeteer = require('puppeteer');

const app = express();
const port = 3000;

let browser;
let page;

// Function to initialize Puppeteer
const initializePuppeteer = async () => {
  try {
    console.log('🚀 Launching Puppeteer...');
    browser = await puppeteer.launch({
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    page = await browser.newPage();
    console.log('🌐 Navigating to pi.ai...');
    await page.goto('https://pi.ai/talk', { waitUntil: 'networkidle2', timeout: 60000 });

    return page;
  } catch (error) {
    console.error('❌ Error launching Puppeteer:', error.message);
    setTimeout(initializePuppeteer, 5000); // Retry after 5 seconds
  }
};

// Function to send a message using Puppeteer
const sendMessage = async (messageText) => {
  try {
    console.log('✉️ Sending request to AI...');

    const apiResponse = await page.evaluate(async (messageText) => {
      const response = await fetch('https://pi.ai/api/v2/chat', {
        method: 'POST',
        headers: {
          'Accept': 'text/event-stream',
          'Accept-Encoding': 'gzip, deflate, br, zstd',
          'Accept-Language': 'en-US,en;q=0.9',
          'Content-Length': '52',
          'Content-Type': 'application/json',
          'Cookie': '__cf_bm=9hVpb4vnUM8kv.h92oINya3_EBJ1Wyvdpeayd9OdegA-1741708055-1.0.1.1-EKMlQBd9zE_CKLZTZjTBQ6UCLSyezxGiQxzLx2NijPB1AxzqWXqdn09OVGo3SAbFOExmLFKbb8ldEseYwDpoEUnOEPGq8JqqN.LC8e.vLAY; __Host-session=DJT4rmECGLaeWs6hfBBZx',
          'Origin': 'https://pi.ai',
          'Priority': 'u=1, i',
          'Referer': 'https://pi.ai/talk',
          'Sec-CH-UA': '"Not(A:Brand";v="99", "Google Chrome";v="133", "Chromium";v="133"',
          'Sec-CH-UA-Mobile': '?1',
          'Sec-CH-UA-Platform': '"Android"',
          'Sec-Fetch-Dest': 'empty',
          'Sec-Fetch-Mode': 'cors',
          'Sec-Fetch-Site': 'same-origin',
          'User-Agent': 'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Mobile Safari/537.36',
          'X-API-Version': '3'
        },
        body: JSON.stringify({ text: messageText, conversation: '' }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      return await response.text();
    }, messageText);

    console.log('📨 Full API Response:', apiResponse);

    if (apiResponse.includes('"error":"Unauthorized"')) {
      console.error('❌ Error: Unauthorized - Cookie might be expired.');
      throw new Error('Unauthorized - Please update the cookie.');
    }

    return apiResponse; // Return API response
  } catch (error) {
    console.error('❌ Error during Puppeteer message send:', error.message);
    throw error;
  }
};

// Create API endpoint
app.get('/pi.ai', async (req, res) => {
  const prompt = req.query.prompt;

  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  try {
    const response = await sendMessage(prompt);
    return res.json({ response });
  } catch (error) {
    return res.status(500).json({ error: 'Something went wrong' });
  }
});

// Start the server
const startServer = async () => {
  app.listen(port, async () => {
    console.log(`🚀 API server is running on http://localhost:${port}`);
    await initializePuppeteer();
  });
};

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('🔄 Closing Puppeteer...');
  if (browser) await browser.close();
  process.exit(0);
});

startServer();

