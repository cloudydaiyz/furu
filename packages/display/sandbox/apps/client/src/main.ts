import './style.css'
import { BaseConnectionSettings, cleanupGuacamole, connectToGuacamole, createNewConnectionToken } from './guacamole/client.ts';

const displayDiv = document.getElementById("display") as HTMLDivElement;
const VNC_HOSTNAME = import.meta.env.VITE_HOSTNAME as string | undefined;
const VNC_PASSWORD = import.meta.env.VITE_VNC_PASSWORD as string | undefined;
if (!VNC_HOSTNAME || !VNC_PASSWORD) {
  throw new Error("Environment variable unset. Set VITE_HOSTNAME and rebuild this application.")
}

const connect = document.querySelector<HTMLButtonElement>('#connect')!;
connect.addEventListener('click', async () => {
  const guacdHost = "localhost";
  const guacdPort = "4822";
  const protocol = "vnc";
  const settings: BaseConnectionSettings = {
    hostname: VNC_HOSTNAME,
    port: 5901,
    password: VNC_PASSWORD,
  }
  const tokenObj = createNewConnectionToken(displayDiv, protocol, guacdHost, guacdPort, settings);
  await connectToGuacamole(displayDiv, tokenObj, protocol, guacdHost, guacdPort);
});

const disconnect = document.querySelector<HTMLButtonElement>('#disconnect')!;
disconnect.addEventListener('click', () => cleanupGuacamole());