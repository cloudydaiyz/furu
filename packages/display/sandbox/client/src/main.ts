import './style.css'
import { BaseConnectionSettings, cleanupGuacamole, connectToGuacamole, createNewConnectionToken } from './guacamole/client.ts';

const displayDiv = document.getElementById("display") as HTMLDivElement;
const VNC_HOSTNAME = import.meta.env.VITE_VNC_HOSTNAME as string | undefined;
const VNC_PASSWORD = import.meta.env.VITE_VNC_PASSWORD as string | undefined;
if (!VNC_HOSTNAME || !VNC_PASSWORD) {
  throw new Error("Environment variable unset. Set VITE_HOSTNAME and rebuild this application.")
}

const GUACD_HOST = "localhost";
const GUACD_PORT = "4822";
const PROTOCOL = "vnc";
const settings: BaseConnectionSettings = {
  hostname: VNC_HOSTNAME,
  port: 5901,
  password: VNC_PASSWORD,
}

const connect = document.querySelector<HTMLButtonElement>('#connect')!;
connect.addEventListener('click', async () => {
  const tokenObj = createNewConnectionToken(displayDiv, PROTOCOL, GUACD_HOST, GUACD_PORT, settings);
  await connectToGuacamole(displayDiv, tokenObj, PROTOCOL, GUACD_HOST, GUACD_PORT);
});

const disconnect = document.querySelector<HTMLButtonElement>('#disconnect')!;
disconnect.addEventListener('click', () => cleanupGuacamole());