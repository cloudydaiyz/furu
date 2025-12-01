import './style.css'
import { BaseConnectionSettings, cleanupGuacamole, connectToGuacamole, createNewConnectionToken } from './guacamole/client.ts';

const HOSTNAME = import.meta.env.VITE_HOSTNAME as string | undefined;
if (!HOSTNAME) {
  throw new Error("VITE_HOSTNAME environment variable unset. Set VITE_HOSTNAME and rebuild this application.")
}

const connect = document.querySelector<HTMLButtonElement>('#connect')!;
connect.addEventListener('click', async () => {
  const guacdHost = "localhost";
  const guacdPort = "4822";
  const protocol = "vnc";
  const settings: BaseConnectionSettings = {
    hostname: HOSTNAME,
    port: 5901,
    password: "helloworld",
  }
  const tokenObj = createNewConnectionToken(protocol, guacdHost, guacdPort, settings);
  await connectToGuacamole(tokenObj, protocol, guacdHost, guacdPort);
});

const disconnect = document.querySelector<HTMLButtonElement>('#disconnect')!;
disconnect.addEventListener('click', () => cleanupGuacamole());