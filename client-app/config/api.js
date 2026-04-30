const DEFAULT_API_PORT = "3000";

function readRuntimeApiBaseUrl() {
  const runtimeConfig = globalThis.__CHAT_APP_CONFIG__;

  if (!runtimeConfig || typeof runtimeConfig.apiBaseUrl !== "string") {
    return "";
  }

  return runtimeConfig.apiBaseUrl.trim();
}

function inferApiBaseUrlFromLocation() {
  if (!globalThis.location) {
    return "";
  }

  const protocol = globalThis.location.protocol === "https:" ? "https:" : "http:";
  const hostname = globalThis.location.hostname;

  if (!hostname) {
    return "";
  }

  return `${protocol}//${hostname}:${DEFAULT_API_PORT}`;
}

export const API_BASE_URL = readRuntimeApiBaseUrl() || inferApiBaseUrlFromLocation() || `http://127.0.0.1:${DEFAULT_API_PORT}`;
