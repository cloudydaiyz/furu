import { runGuacamoleServer } from "@cloudydaiyz/furu-display";
import assert from "assert";

const DISPLAY_PORT = 9091;

export async function launchDisplay() {
  const GUACD_HOST = process.env.GUACD_HOST;
  const GUACD_PORT = process.env.GUACD_PORT;
  const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
  assert(GUACD_HOST && GUACD_PORT && ENCRYPTION_KEY);

  runGuacamoleServer(
    DISPLAY_PORT,
    GUACD_HOST,
    +GUACD_PORT,
    ENCRYPTION_KEY,
    {
      dpi: 120,
      width: 1000,
      height: 1000,
    }
  );
}

launchDisplay();