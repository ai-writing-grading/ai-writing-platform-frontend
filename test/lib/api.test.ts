jest.mock('../../src/lib/api-config', () => ({
  API_GATEWAY_URL: '',
}));

jest.mock('../../src/lib/redirect', () => ({
  redirectToExternal: jest.fn(),
}));

import {
  TOKEN_KEY,
  apiFetch,
  apiUrl,
  clearToken,
  getToken,
  getUserRole,
  setToken,
} from '../../src/lib/api';
import { redirectToExternal } from '../../src/lib/redirect';

function responseWithStatus(status: number): Response {
  return { status } as Response;
}

describe('API utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    global.fetch = jest.fn();
  });

  it('builds a same-origin API URL', () => {
    expect(apiUrl('/api/v1/test')).toBe('/api/v1/test');
  });

  it('reads, stores, and clears the auth token', () => {
    setToken('new-token');
    expect(getToken()).toBe('new-token');
    expect(localStorage.getItem(TOKEN_KEY)).toBe('new-token');

    clearToken();
    expect(getToken()).toBeNull();
  });

  it('returns null when no token is stored', () => {
    expect(getUserRole()).toBeNull();
  });

  it('extracts a role from a stored JWT', () => {
    const payload = btoa(JSON.stringify({ role: 'admin' }));
    setToken(`header.${payload}.signature`);

    expect(getUserRole()).toBe('admin');
  });

  it('defaults a valid JWT without a role to user', () => {
    const payload = btoa(JSON.stringify({ sub: 'user-1' }));
    setToken(`header.${payload}.signature`);

    expect(getUserRole()).toBe('user');
  });

  it('returns null and logs when the JWT is malformed', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    setToken('invalid-token');

    expect(getUserRole()).toBeNull();
    expect(consoleSpy).toHaveBeenCalledWith(
      'Failed to parse JWT token',
      expect.any(Error),
    );

    consoleSpy.mockRestore();
  });

  it('adds JSON and authorization headers to API requests', async () => {
    setToken('auth-token');
    (global.fetch as jest.Mock).mockResolvedValue(responseWithStatus(200));

    await apiFetch('/api/v1/test', {
      method: 'POST',
      body: JSON.stringify({ title: 'Test' }),
      headers: { 'X-Request-ID': 'request-1' },
    });

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/v1/test',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ title: 'Test' }),
        headers: expect.any(Headers),
      }),
    );

    const request = (global.fetch as jest.Mock).mock.calls[0][1] as RequestInit;
    const headers = request.headers as Headers;
    expect(headers.get('Content-Type')).toBe('application/json');
    expect(headers.get('Authorization')).toBe('Bearer auth-token');
    expect(headers.get('X-Request-ID')).toBe('request-1');
  });

  it('lets the browser set the multipart Content-Type header', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(responseWithStatus(200));

    await apiFetch('/api/v1/upload', { body: new FormData() });

    const request = (global.fetch as jest.Mock).mock.calls[0][1] as RequestInit;
    const headers = request.headers as Headers;
    expect(headers.has('Content-Type')).toBe(false);
    expect(headers.has('Authorization')).toBe(false);
  });

  it('clears authentication and redirects after a 401 response', async () => {
    setToken('expired-token');
    (global.fetch as jest.Mock).mockResolvedValue(responseWithStatus(401));

    await apiFetch('/api/v1/private');

    expect(getToken()).toBeNull();
    expect(redirectToExternal).toHaveBeenCalledWith('/login');
  });

  it('dispatches the quota event after a 429 response', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(responseWithStatus(429));

    await apiFetch('/api/v1/limited');

    expect(window.dispatchEvent).toHaveBeenCalledWith(expect.any(CustomEvent));
    const event = (window.dispatchEvent as jest.Mock).mock.calls[0][0] as CustomEvent;
    expect(event.type).toBe('api:quota-exceeded');
  });

  it('returns other responses unchanged', async () => {
    const response = responseWithStatus(500);
    (global.fetch as jest.Mock).mockResolvedValue(response);

    await expect(apiFetch('/api/v1/failure')).resolves.toBe(response);
  });

  it('propagates network errors', async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

    await expect(apiFetch('/api/v1/test')).rejects.toThrow('Network error');
  });
});
