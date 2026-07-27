const http = require('http');
const fs = require('fs');
const path = require('path');

// Helper to make HTTP requests
function getJSON(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

async function main() {
  console.log("🔍 Fetching active Chrome tabs...");
  let targets;
  try {
    targets = await getJSON('http://localhost:9222/json');
  } catch (e) {
    console.error("❌ Could not connect to Chrome on port 9222. Ensure Chrome is running in debug mode.");
    process.exit(1);
  }

  // Find a page target
  const page = targets.find(t => t.type === 'page');
  if (!page) {
    console.error("❌ No page target found in Chrome.");
    process.exit(1);
  }

  const wsUrl = page.webSocketDebuggerUrl;
  console.log(`🔌 Connecting to page: "${page.title}" (${page.url})`);
  console.log(`WebSocket URL: ${wsUrl}`);

  const ws = new WebSocket(wsUrl);
  let id = 1;
  const pending = new Map();

  function send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const msgId = id++;
      const payload = JSON.stringify({ id: msgId, method, params });
      pending.set(msgId, { resolve, reject, method });
      ws.send(payload);
    });
  }

  ws.addEventListener('open', async () => {
    console.log("✅ WebSocket connected!");
    
    // Enable Page and Runtime
    await send('Page.enable');
    await send('Runtime.enable');

    console.log("🚀 Navigating to AWS Console...");
    await send('Page.navigate', { url: 'https://console.aws.amazon.com/ec2/home' });

    // Start polling loop
    let lastUrl = '';
    setInterval(async () => {
      try {
        const evalResult = await send('Runtime.evaluate', { expression: 'window.location.href' });
        if (evalResult && evalResult.result) {
          const currentUrl = evalResult.result.value;
          if (currentUrl !== lastUrl) {
            console.log(`🌐 URL changed: ${currentUrl}`);
            lastUrl = currentUrl;
          }
        }

        // Take a screenshot and save it so the agent/user can see the state
        const screenshotResult = await send('Page.captureScreenshot', { format: 'png' });
        if (screenshotResult && screenshotResult.data) {
          const buffer = Buffer.from(screenshotResult.data, 'base64');
          const screenshotPath = path.join(__dirname, '../chrome-state.png');
          fs.writeFileSync(screenshotPath, buffer);
        }
      } catch (err) {
        console.error("Error in loop:", err.message);
      }
    }, 3000);
  });

  ws.addEventListener('message', (event) => {
    const response = JSON.parse(event.data);
    if (response.id && pending.has(response.id)) {
      const { resolve, reject, method } = pending.get(response.id);
      pending.delete(response.id);
      if (response.error) {
        reject(new Error(`CDP Error in ${method}: ${response.error.message}`));
      } else {
        resolve(response.result);
      }
    }
  });

  ws.addEventListener('close', () => {
    console.log("🔌 WebSocket closed");
    process.exit(0);
  });

  ws.addEventListener('error', (err) => {
    console.error("WebSocket error:", err);
  });
}

main().catch(console.error);
