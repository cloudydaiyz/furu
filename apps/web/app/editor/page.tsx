import WorkflowEditor from "@/client/components/WorkflowEditor";
import { getWorkflowsFromDir } from "@cloudydaiyz/furu-workflows";
import { connection } from "next/server";

const API_PORT = 4000;
const DISPLAY_PORT = 9091;

let sampleWorkflows: Map<string, string> | null = null;

async function getSampleWorkflows() {
  if (!sampleWorkflows) {
    const WORKFLOWS_DIR = process.env.FURU_WORKFLOWS_DIR;
    if (WORKFLOWS_DIR) {
      sampleWorkflows = await getWorkflowsFromDir(WORKFLOWS_DIR);
    } else {
      sampleWorkflows = new Map<string, string>();
    }
  }
  return sampleWorkflows;
}

export default async function Page() {
  await connection();

  const API_HOST = process.env.FURU_API_HOST;
  const API_ACCESS_KEY = process.env.FURU_API_ACCESS_KEY;
  const DISPLAY_HOST = process.env.FURU_DISPLAY_HOST;
  const WORKFLOWS_DIR = process.env.FURU_WORKFLOWS_DIR;

  if (!API_HOST || !API_ACCESS_KEY || !DISPLAY_HOST || !WORKFLOWS_DIR) {
    throw new Error("Environment variables undefined");
  }

  const apiUrl = `http://${API_HOST}:${API_PORT}`;
  const displayUrl = `ws://${DISPLAY_HOST}:${DISPLAY_PORT}/`;

  const sampleWorkflows = await getSampleWorkflows();
  const defaultWorkflow = sampleWorkflows.values().next().value;

  return (
    <WorkflowEditor
      apiUrl={apiUrl}
      apiAccessKey={API_ACCESS_KEY}
      displayUrl={displayUrl}
      workflowMap={sampleWorkflows}
      defaultWorkflow={defaultWorkflow}
    />
  );
}