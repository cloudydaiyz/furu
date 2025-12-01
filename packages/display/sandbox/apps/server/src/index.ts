// https://github.com/vadimpronin/guacamole-lite/blob/master/test-guac/guacamole-lite-server/start.js
// docker run --name guacd -d -p 4822:4822 guacamole/guacd
// docker stop guacd && docker rm guacd

import http from "http";
import url from "url";
import assert from "assert";
import GuacamoleLite from "guacamole-lite";

const GUACD_HOST = process.env.GUACD_HOST;
const GUACD_PORT = process.env.GUACD_PORT;
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;

assert(GUACD_HOST && GUACD_PORT && ENCRYPTION_KEY);

const websocketOptions = {
  // port: 8080,
  port: 9091,
};

// Default guacd options (used as fallback)
const guacdOptions = {
  host: GUACD_HOST,
  port: +GUACD_PORT,
};

const clientOptions = {
  crypt: {
    cypher: 'AES-256-CBC',
    key: ENCRYPTION_KEY,
  },
  // Add default RDP audio settings for testing
  connectionDefaultSettings: {
    rdp: {
      'audio': ['audio/L16']
    }
  },
  log: {
    level: 'DEBUG',
  },
};

// Create session registry for tracking sessions across guacd instances
const sessionRegistry = new Map<string, any>();

// Set up callbacks to provide session registry
const callbacks = {
  processConnectionSettings: (settings: any, callback: any) => callback(undefined, settings),
  sessionRegistry: sessionRegistry
};

console.log('Starting guacamole-lite server...');
console.log('Available guacd instances: guacd-1:4822, guacd-2:4822, guacd-3:4822');
console.log('Default guacd fallback:', `${guacdOptions.host}:${guacdOptions.port}`);

const guacServer = new GuacamoleLite(websocketOptions, guacdOptions, clientOptions, callbacks);

// Add session registry inspection endpoint for admin dashboard
const adminServer = http.createServer((req, res) => {
  if (!req.url) {
    res.writeHead(400);
    res.end();
    return;
  }
  const parsedUrl = url.parse(req.url, true);

  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  if (parsedUrl.pathname === '/api/sessions') {
    // Return session registry contents as JSON
    const sessions: Record<string, any> = {};
    for (const [sessionId, sessionData] of sessionRegistry.entries()) {
      sessions[sessionId] = sessionData;
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      sessions: sessions,
      totalSessions: sessionRegistry.size,
      timestamp: new Date().toISOString()
    }, null, 2));
  } else if (parsedUrl.pathname === '/api/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'healthy',
      activeConnections: guacServer.activeConnections ? guacServer.activeConnections.size : 0,
      totalSessions: sessionRegistry.size
    }));
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  }
});

// Start admin API server on port 3001
adminServer.listen(3001, () => {
  console.log('Admin API server running on port 3001');
  console.log('Session registry endpoint: http://localhost:3001/api/sessions');
});