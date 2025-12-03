// https://github.com/vadimpronin/guacamole-lite/blob/master/test-guac/guacamole-lite-server/start.js

import GuacamoleLite from "guacamole-lite";

export function runGuacamoleServer(port: number, guacdHost: string, guacdPort: number, encryptionKey: string): any {
  // GuacamoleLite creates its own WebSocket server on this port
  const websocketOptions = { port };

  // Default guacd options (used as fallback)
  const guacdOptions = {
    host: guacdHost,
    port: +guacdPort,
  };

  const clientOptions = {
    crypt: {
      cypher: 'AES-256-CBC',
      key: encryptionKey,
    },
    connectionDefaultSettings: {},
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
  console.log('Default guacd fallback:', `${guacdOptions.host}:${guacdOptions.port}`);
  console.log('WebSocket listening on port:', port);

  console.log('websocketOptions', websocketOptions);
  console.log('guacdOptions', guacdOptions);
  console.log('clientOptions', clientOptions);
  console.log('callbacks', callbacks);

  const guacServer = new GuacamoleLite(websocketOptions, guacdOptions, clientOptions, callbacks);

  // Log when server is ready
  setTimeout(() => {
    console.log(`Guacamole server initialized and listening on port ${port}`);
    console.log(`WebSocket endpoint: ws://localhost:${port}/`);
  }, 100);

  return { guacServer, sessionRegistry };
}
