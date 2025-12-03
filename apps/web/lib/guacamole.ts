import Guacamole from "guacamole-common-js";

let currentClient: Guacamole.Client | null;
let currentKeyboard: Guacamole.Keyboard | null;
let pasteEventListener: ((event: ClipboardEvent) => void) | null;

// Function to initialize Guacamole client
export function initializeGuacamoleClient(
  displayDiv: HTMLDivElement,
  displayUrl: string,
  displayToken: string,
) {
  try {
    // Create WebSocket tunnel
    const tunnel = new Guacamole.WebSocketTunnel(displayUrl);

    // Set up onuuid event handler to log connection ID
    tunnel.onuuid = function (uuid) {
      console.log("Connection UUID received:", uuid);
      console.log("This UUID can be used to join this session from another client");
    };

    // Create client
    const client = new Guacamole.Client(tunnel);
    currentClient = client;

    // Set up error handler
    client.onerror = function (error) {
      console.error("Guacamole error:", error);
      let errorMessage = error.message || "Unknown error";
      if (errorMessage.includes("connect")) {
        errorMessage = "VNC Connection Error: Could not connect to VNC server. Please verify the host is running a VNC server on port 5900.";
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
    let connectString = `token=${encodeURIComponent(displayToken)}`;
    try {
      client.connect(connectString);
    } catch (error) {
      console.error("Connect error");
      if (error instanceof Guacamole.Status) {
        console.error("Guacamole.status");
      }
      throw error;
    }

    // Wait for the display to show, THEN resize.
    // Add client display to the page
    let displayVisible = false;
    let lastResize = Date.now();
    client.getDisplay().onresize = (width, height) => {
      console.log(Date.now() - lastResize);
      if (Date.now() - lastResize < 1 * 1000) return;
      lastResize = Date.now();

      console.log("resized", width, height, displayVisible);
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