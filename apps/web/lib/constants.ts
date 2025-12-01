// "undefined" means the URL will be computed from the `window.location` object

import { crawlYCombinator } from "./workflows/crawl-y-combinator";
import { evaluateJavascript } from "./workflows/evaluate-javascript";
import { generatePdf } from "./workflows/generate-pdf";
import { hackerNewsAccessibility } from "./workflows/hacker-news-accessibility";
import { hackerNewsCwv } from "./workflows/hacker-news-cwv";
import { hackerNewsSorted } from "./workflows/hacker-news-sorted";
import { interceptModifyRequests } from "./workflows/intercept-modify-requests";
import { interceptRequests } from "./workflows/intercept-requests";
import { mobileAndGeolocation } from "./workflows/mobile-and-geolocation";
import { pageScreenshot } from "./workflows/page-screenshot";
import { recordVideo } from "./workflows/record-video";
import { todoMvc } from "./workflows/todo-mvc";

// export const API_URL = process.env.NODE_ENV === 'production' ? undefined : 'http://localhost:4000';
export const API_HOST = process.env.NEXT_PUBLIC_FURU_API_HOST!;
export const API_PORT = +process.env.NEXT_PUBLIC_FURU_API_PORT!;
export const API_ACCESS_KEY = process.env.NEXT_PUBLIC_FURU_API_ACCESS_KEY!;

console.log(API_HOST, API_PORT, API_ACCESS_KEY);
if (!API_HOST || !API_PORT || !API_ACCESS_KEY) {
  throw new Error("Environment variables undefined");
}
export const API_URL = `http://${API_HOST}:${API_PORT}`;

export const SAMPLE_WORKFLOWS = {
  "crawl-y-combinator": crawlYCombinator,
  "evaluate-javascript": evaluateJavascript,
  "generate-pdf": generatePdf,
  "hacker-news-accessibility": hackerNewsAccessibility,
  "hacker-news-cwv": hackerNewsCwv,
  "hacker-news-sorted": hackerNewsSorted,
  "intercept-modify-requests": interceptModifyRequests,
  "intercept-requests": interceptRequests,
  "mobile-and-geolocation": mobileAndGeolocation,
  "page-screenshot": pageScreenshot,
  "record-video": recordVideo,
  "todo-mvc": todoMvc,
};

export const SAMPLE_WORKFLOW_TITLES = Object.keys(SAMPLE_WORKFLOWS);