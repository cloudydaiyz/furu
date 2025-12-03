// https://github.com/vadimpronin/guacamole-lite/blob/master/test-guac/guacamole-lite-server/start.js

import GuacamoleLite from "guacamole-lite";

export function runGuacamoleServer(guacdHost: string, guacdPort: number, encryptionKey: string): any {
  // const GUACD_HOST = process.env.GUACD_HOST;
  // const GUACD_PORT = process.env.GUACD_PORT;
  // const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
  // assert(GUACD_HOST && GUACD_PORT && ENCRYPTION_KEY);

  const websocketOptions = {
    port: 9091,
  };

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

  return new GuacamoleLite(websocketOptions, guacdOptions, clientOptions, callbacks);
}
