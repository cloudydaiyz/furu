// https://github.com/vadimpronin/guacamole-lite/blob/master/test-guac/guacamole-lite-client/html/js/main.js
import Guacamole from "guacamole-common-js";
import { generateGuacamoleToken } from "./token";

type Protocol = "join" | "rdp" | "vnc";
type SelectedGuacd = `${string}:${string}`;

export interface BaseConnectionSettings {
  hostname?: string,
  username?: string,
  password?: string,
  port?: number,
}

const SERVER_PORT = 9091;

let currentClient: Guacamole.Client | null;
let currentKeyboard: Guacamole.Keyboard | null;
let pasteEventListener: ((event: ClipboardEvent) => void) | null;

// Handle joining an existing connection
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
  displayDiv: HTMLDivElement,
  protocol: Protocol,
  guacdHost: string,
  guacdPort: string,
  baseSettings: BaseConnectionSettings = {},
) {
  let tokenObj: any;
  let connectionSettings;

  // Base connection settings
  connectionSettings = {
    hostname: baseSettings ? baseSettings.hostname : 'desktop-linux',
    username: baseSettings ? baseSettings.username : 'testuser',
    password: baseSettings ? baseSettings.password : 'Passw0rd!',
    width: displayDiv.offsetWidth,
    height: displayDiv.offsetHeight,
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

export async function connectToGuacamole(
  displayDiv: HTMLDivElement,
  tokenObj: any,
  protocol: Protocol,
  guacdHost: string,
  guacdPort: string
) {
  try {
    const token = await generateGuacamoleToken(tokenObj);
    console.log("Token generated, initializing Guacamole...");

    // Initialize Guacamole client
    const selectedGuacd = `${guacdHost}:${guacdPort}` as const;
    initializeGuacamoleClient(displayDiv, token, protocol, selectedGuacd);
  } catch (e) {
    const error = e as Error;
    console.error("Failed to connect:", error);
    alert("Connection failed: " + error.message);
  }
}

// Function to initialize Guacamole client
function initializeGuacamoleClient(
  displayDiv: HTMLDivElement,
  token: string,
  protocol: Protocol,
  selectedGuacd: SelectedGuacd
) {
  try {
    // Create WebSocket tunnel
    const tunnel = new Guacamole.WebSocketTunnel(`ws://${location.hostname}:${SERVER_PORT}/`);

    // Set up onuuid event handler to log connection ID
    tunnel.onuuid = function (uuid) {
      console.log("Connection UUID received:", uuid);
      console.log("This UUID can be used to join this session from another client");
      console.log(`Session registered in registry with guacd routing: ${selectedGuacd || 'auto-detected'}`);
    };

    // Create client
    const client = new Guacamole.Client(tunnel);
    currentClient = client;

    // Set up error handler
    client.onerror = function (error) {
      console.error("Guacamole error:", error);
      let errorMessage = error.message || "Unknown error";

      // Enhanced error messages for common issues
      if (protocol === 'vnc' && errorMessage.includes("connect")) {
        errorMessage = "VNC Connection Error: Could not connect to VNC server. Please verify the host is running a VNC server on port 5900.";
      } else if (protocol === 'rdp' && errorMessage.includes("connect")) {
        errorMessage = "RDP Connection Error: Could not connect to RDP server. Please verify the host is running and accepting RDP connections.";
      }

      alert("Guacamole error: " + errorMessage);
    };

    // Set up clipboard handler
    client.onclipboard = (stream) => {
      let data = '';
      const reader = new Guacamole.StringReader(stream);
      reader.ontext = text => data += text;
      reader.onend = async () => {
        console.log("Clipboard data received:", data);
        await navigator.clipboard.writeText(data);
      };
    };

    // Set up file download handler
    client.onfile = (stream, mimetype, filename) => {
      stream.sendAck("Ready", Guacamole.Status.Code.SUCCESS);

      const reader = new Guacamole.BlobReader(stream, mimetype);

      reader.onprogress = (length) => {
        console.log(`Downloaded ${length} bytes of ${filename}`);
      };

      reader.onend = () => {
        // Automatically create a link and download the file
        const file = reader.getBlob();
        const url = URL.createObjectURL(file);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          console.log(`File download complete: ${filename}`);
        }, 100);
      };
    };

    // Set up mouse
    const mouse = new Guacamole.Mouse(client.getDisplay().getElement());
    mouse.onEach(
      ['mousedown', 'mouseup', 'mousemove', 'mousewheel'],
      (e) => client.sendMouseState((e as Guacamole.Mouse.Event).state)
    );

    // Set up keyboard
    // const keyboard = new Guacamole.Keyboard(window);
    const keyboard = new Guacamole.Keyboard(window.document);
    keyboard.onkeydown = keysym => client.sendKeyEvent(1, keysym);
    keyboard.onkeyup = keysym => client.sendKeyEvent(0, keysym);
    currentKeyboard = keyboard;

    // Set up paste event listener
    pasteEventListener = (event) => {
      const text = event.clipboardData?.getData('text/plain');
      if (text && currentClient) {
        event.preventDefault(); // Prevent default paste behavior in browser
        // Send clipboard data to the remote session
        const stream = currentClient.createClipboardStream('text/plain');
        const writer = new Guacamole.StringWriter(stream);
        writer.sendText(text);
        writer.sendEnd();
        console.log("Sent clipboard data to remote:", text);
      }
    };
    window.addEventListener('paste', pasteEventListener);

    // Connect to the remote desktop
    // Construct connection string, adding audio only if RDP
    let connectString = `token=${encodeURIComponent(token)}`;
    if (protocol === 'rdp') {
      connectString += `&GUAC_AUDIO=audio/L16`;
    }
    client.connect(connectString);

    // Wait for the display to show, THEN resize.
    // Add client display to the page
    let displayVisible = false;
    client.getDisplay().onresize = (width, height) => {
      console.log("resized", width, height, displayVisible);
      if (width !== displayDiv.offsetWidth && height !== displayDiv.offsetHeight) {
        currentClient?.sendSize(displayDiv.offsetWidth, displayDiv.offsetHeight);
      }

      if (!displayVisible && width === displayDiv.offsetWidth && height === displayDiv.offsetHeight) {
        displayDiv.appendChild(client.getDisplay().getElement());
        displayVisible = true;
      }
    }

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.target === displayDiv) {
          currentClient?.sendSize(displayDiv.offsetWidth, displayDiv.offsetHeight);
        }
      }
    });
    resizeObserver.observe(displayDiv);

    displayDiv.addEventListener("resize", () => {
      console.log("displayDiv resize");
      currentClient?.sendSize(displayDiv.offsetWidth, displayDiv.offsetHeight);
    });

    console.log("Guacamole client initialized and connected");
    if (protocol !== 'join') {
      console.log(`Dynamic routing: Connection routed to ${selectedGuacd}`);
    }
  } catch (e) {
    const error = e as Error;

    // Clean up any partially created resources
    cleanupGuacamole();

    // Show error and return to connection screen
    console.error("Error initializing Guacamole:", error);
    alert("Error initializing Guacamole: " + error.message);
  }
}


// Function to properly clean up all Guacamole resources
export function cleanupGuacamole() {
  if (currentClient) {
    // Disconnect the client
    try {
      currentClient.disconnect();
    } catch (e) {
      console.error("Error disconnecting client:", e);
    }
    currentClient.getDisplay().getElement().remove();
    currentClient = null;
  }

  // Properly detach keyboard handler
  if (currentKeyboard) {
    try {
      // Remove existing handlers
      currentKeyboard.onkeydown = null;
      currentKeyboard.onkeyup = null;

      // Reset the keyboard state completely
      currentKeyboard.reset();
    } catch (e) {
      console.error("Error cleaning up keyboard:", e);
    }
    currentKeyboard = null;
  }

  // Remove paste event listener if it exists
  if (pasteEventListener) {
    window.removeEventListener('paste', pasteEventListener);
    pasteEventListener = null;
  }

  // Allow a brief moment for cleanup before making inputs focusable
  // setTimeout(() => {
  //   // Re-focus on a form element to help ensure keyboard is working
  //   const firstInput = document.querySelector('#connection-form input, #connection-form select');
  //   if (firstInput) {
  //     (firstInput as HTMLElement).focus();
  //   }
  // }, 100);
}

// Handle page unloads to clean up any active sessions
window.addEventListener('beforeunload', () => {
  cleanupGuacamole();
});