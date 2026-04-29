const DEFAULT_API_BASE_URL = "http://127.0.0.1:3000";

function readRuntimeApiBaseUrl() {
  const runtimeConfig = globalThis.__CHAT_APP_CONFIG__;

  if (!runtimeConfig || typeof runtimeConfig.apiBaseUrl !== "string") {
    return "";
  }

  return runtimeConfig.apiBaseUrl.trim();
}

export const API_BASE_URL = readRuntimeApiBaseUrl() || DEFAULT_API_BASE_URL;
