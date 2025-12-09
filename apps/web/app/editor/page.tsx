import WorkflowEditor from "@/client/components/WorkflowEditor";
import { connection } from "next/server";

const API_PORT = 4000;
// const DISPLAY_PORT = 6000;
const DISPLAY_PORT = 9091;

export default async function Page() {
  await connection();

  const API_HOST = process.env.FURU_API_HOST;
  const API_ACCESS_KEY = process.env.FURU_API_ACCESS_KEY;
  const DISPLAY_HOST = process.env.FURU_DISPLAY_HOST;

  if (!API_HOST || !API_ACCESS_KEY || !DISPLAY_HOST) {
    console.log(process.env);
    throw new Error("Environment variables undefined");
  }

  const API_URL = `http://${API_HOST}:${API_PORT}`;
  const DISPLAY_URL = `ws://${DISPLAY_HOST}:${DISPLAY_PORT}/`;

  return (
    <WorkflowEditor
      apiUrl={API_URL}
      apiAccessKey={API_ACCESS_KEY}
      displayUrl={DISPLAY_URL}
    />
  )
}