// https://github.com/vadimpronin/guacamole-lite/blob/master/test-guac/guacamole-lite-client/html/js/token-generator.js

export type Protocol = "join" | "rdp" | "vnc";
export type SelectedGuacd = `${string}:${string}`;

export interface BaseConnectionSettings {
  hostname?: string,
  username?: string,
  password?: string,
  port?: number,
}

export function createJoinConnectionToken(connectionId: string, readOnly = false) {
  let tokenObj: any;

  tokenObj = {
    connection: {
      join: connectionId,
      settings: {
        'read-only': readOnly
      }
    }
  };

  return tokenObj;
}

// Handle regular connection
export function createNewConnectionToken(
  protocol: Protocol,
  guacdHost: string,
  guacdPort: string,
  baseSettings: BaseConnectionSettings = {},
) {
  let tokenObj: any;
  let connectionSettings;

  // Base connection settings
  connectionSettings = {
    hostname: baseSettings.hostname,
    username: baseSettings.username,
    password: baseSettings.password,
    width: 1000,
    height: 900,
  };

  if (protocol === 'rdp') {
    Object.assign(connectionSettings, {
      "ignore-cert": true,
      "security": "any",
      "enable-drive": true,
      "drive-path": "/tmp/guac-drive",
      "create-drive-path": true,
      "enable-printing": true,
      "audio": ["audio/L16;rate=44100"]
    });
  }

  // Add VNC-specific settings
  if (protocol === 'vnc') {
    Object.assign(connectionSettings, {
      port: baseSettings.port ? baseSettings.port : 5900,
      autoretry: 3,
      color_depth: 24,
      swap_red_blue: false,
      connect_timeout: 15
    });
  }

  tokenObj = {
    connection: {
      type: protocol,
      guacdHost: guacdHost,
      guacdPort: parseInt(guacdPort),
      settings: connectionSettings
    }
  };

  return tokenObj;
}

export async function encryptGuacamoleToken(tokenObj: any, encryptionKey: string): Promise<string> {
  const CIPHER = 'AES-CBC';

  // NOTE: AES key data must be 128 or 256 bits
  const KEY = new TextEncoder().encode(encryptionKey);

  const iv = crypto.getRandomValues(new Uint8Array(16));
  const algo = { name: CIPHER, iv };
  const key = await crypto.subtle.importKey("raw", KEY, algo, false, ["encrypt"]);
  const ct = new Uint8Array(await crypto.subtle.encrypt(algo, key,
    new TextEncoder().encode(JSON.stringify(tokenObj))));

  const token = btoa(JSON.stringify({
    iv: btoa(String.fromCharCode(...iv)),
    value: btoa(String.fromCharCode(...ct))
  }));

  return token;
} 