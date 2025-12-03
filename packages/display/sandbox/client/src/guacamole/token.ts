// https://github.com/vadimpronin/guacamole-lite/blob/master/test-guac/guacamole-lite-client/html/js/token-generator.js
export async function generateGuacamoleToken(tokenObj: any): Promise<string> {
  /* ------------ demo-only token generation (do this in backend IRL) --- */
  /**
   * Failed to connect: NotSupportedError: Failed to execute 'importKey' on 'SubtleCrypto': Algorithm: Unrecognized name
   * at generateGuacamoleToken (token.ts:11:35)
   * at connectToGuacamole (guacamole.ts:94:25)
   * at HTMLButtonElement.<anonymous> (main.ts:46:9)
   */
  // const CIPHER = 'AES-256-CBC';
  const CIPHER = 'AES-CBC';
  const KEY = new TextEncoder().encode('MySuperSecretKeyForParamsToken12');
  // Connection failed: AES key data must be 128 or 256 bits
  // const KEY = new TextEncoder().encode('helloworld');

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