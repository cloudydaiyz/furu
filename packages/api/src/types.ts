/** Messages sent from the client via Websocket */
export type ApiClientOperation = {
  opCode: 1,
  data: {
    accessKey: string,
  }
}

/** Messages sent from the server via Websocket */
export type ApiServerOperation = {
  opCode: 1,
  data: "authenticated"
} | {
  opCode: 2,
  data: {
    error: "auth-error" | "auth-invalid" | "unauthenticated"
  }
} | {
  opCode: 3,
  data: "controller-available" | "controller-unavailable",
}