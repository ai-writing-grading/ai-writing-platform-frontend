export const API_GATEWAY_URL = import.meta.env.DEV
  ? ""
  : (import.meta.env.VITE_API_GATEWAY_URL ?? "");
