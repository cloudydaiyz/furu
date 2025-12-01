import WorkflowEditor from "@/client/components/WorkflowEditor";
import { connection } from "next/server";

const API_PORT = 4000;

export default async function Page() {
  await connection();

  const API_HOST = process.env.FURU_API_HOST;
  // export const API_URL = process.env.NODE_ENV === 'production' ? undefined : 'http://localhost:4000';
  const API_URL = API_HOST && API_PORT ? `http://${API_HOST}:${API_PORT}` : undefined;
  const API_ACCESS_KEY = process.env.FURU_API_ACCESS_KEY;

  if (!API_URL || !API_ACCESS_KEY) {
    throw new Error("Environment variables undefined");
  }

  return (
    <WorkflowEditor apiUrl={API_URL} apiAccessKey={API_ACCESS_KEY} />
  )
}