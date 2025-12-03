// https://github.com/vadimpronin/guacamole-lite/blob/master/test-guac/guacamole-lite-client/html/js/token-generator.js

export async function generateGuacamoleToken(tokenObj: any, encryptionKey: string): Promise<string> {
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