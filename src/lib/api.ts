// src/lib/api.ts

import { API_GATEWAY_URL } from "./api-config";
import { redirectToExternal } from "./redirect";

export function apiUrl(path: string): string {
  return `${API_GATEWAY_URL}${path}`;
}

export const TOKEN_KEY = "auth_token";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export function getUserRole(): string | null {
  const token = getToken();
  if (!token) return null;
  
  try {
    const payloadBase64 = token.split('.')[1];
    const decodedJson = atob(payloadBase64); 
    const payload = JSON.parse(decodedJson);
    
    return payload.role || "user"; 
  } catch (e) {
    console.error("Failed to parse JWT token", e);
    return null;
  }
}

export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const token = getToken();
  const headers = new Headers(init.headers);
  
  if (!(init.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(apiUrl(path), { ...init, headers });

  if (res.status === 401) {
    clearToken();
    redirectToExternal("/login");
  }

  if (res.status === 429) {
    window.dispatchEvent(new CustomEvent("api:quota-exceeded"));
  }

  return res;
}
