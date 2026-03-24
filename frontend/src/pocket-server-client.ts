const DEFAULT_POCKET_SERVER_BASE_URL = 'http://localhost:3000';
const POCKET_AUTH_SCHEME = 'Pocket';

type QueryPrimitive = string | number | boolean;
type QueryValue = QueryPrimitive | QueryPrimitive[] | null | undefined;

export interface PocketServerClientOptions {
  baseUrl?: string;
  fetch?: typeof fetch;
  accessToken?: string | null;
  getAccessToken?: () => string | null | undefined;
  headers?: HeadersInit;
}

export interface PocketServerRequestOptions
  extends Omit<RequestInit, 'body' | 'headers'> {
  body?: BodyInit | null;
  json?: unknown;
  query?: Record<string, QueryValue>;
  token?: string | null;
  headers?: HeadersInit;
}

export interface PocketServerMethodOptions {
  signal?: AbortSignal;
  token?: string | null;
  headers?: HeadersInit;
}

export interface PocketServerHealthResponse {
  status: string;
  version: string;
  timestamp: string;
  uptime: number;
}

export interface PocketServerStatsResponse {
  uptime: number;
  memory: {
    used: number;
    total: number;
  };
  connections: number;
  terminals: number;
}

export interface PocketServerPublicBaseUrlResponse {
  url: string | null;
}

export interface PocketServerDeviceStatusResponse {
  registered: boolean;
}

export type PocketServerPairingMode = 'local' | 'remote' | (string & {});

export interface PocketServerPairingStatusResponse {
  active: boolean;
  mode: PocketServerPairingMode;
  expiresAt: string | null;
  secondsLeft: number;
}

export interface PocketServerPairDeviceRequest {
  deviceId: string;
  pin: string;
  platform?: string;
  name?: string;
  reset?: boolean;
  pairToken?: string;
}

export interface PocketServerPairDeviceSecret {
  deviceId: string;
  secret: string;
}

export interface PocketServerPairDeviceResponse {
  success: true;
  alreadyPaired: boolean;
  data?: PocketServerPairDeviceSecret;
}

export interface PocketServerChallengeRequest {
  deviceId: string;
}

export interface PocketServerChallengeResponse {
  nonce: string;
  expiresAt: string;
}

export interface PocketServerTokenRequest {
  deviceId: string;
  nonce: string;
  signature: string;
}

export interface PocketServerTokenResponse {
  token: string;
  expiresAt: string;
}

export interface PocketServerAuthenticateRequest {
  deviceId: string;
  secret: string;
  signal?: AbortSignal;
}

export interface PocketServerTokenSignatureInput {
  deviceId: string;
  nonce: string;
  secret: string;
}

export interface PocketServerTerminalSession {
  id: string;
  title?: string;
  cwd?: string;
  createdAt?: string;
  cols?: number;
  rows?: number;
  active: boolean;
  ownerClientId?: string;
  ownerDeviceId?: string;
  lastAttachedAt?: string;
}

export interface PocketServerTerminalSessionsResponse {
  sessions: PocketServerTerminalSession[];
}

export interface PocketServerWebSocketUrlOptions {
  token?: string | null;
  localSecret?: string | null;
}

export class PocketServerClientError<T = unknown> extends Error {
  readonly status: number;
  readonly data: T | null;
  readonly method: string;
  readonly url: string;

  constructor(input: {
    message: string;
    status: number;
    data: T | null;
    method: string;
    url: string;
  }) {
    super(input.message);
    this.name = 'PocketServerClientError';
    this.status = input.status;
    this.data = input.data;
    this.method = input.method;
    this.url = input.url;
  }
}

function normalizeBaseUrl(baseUrl: string): string {
  const trimmedBaseUrl = baseUrl.trim();

  if (!trimmedBaseUrl) {
    throw new Error('Pocket Server baseUrl cannot be empty.');
  }

  const runtimeOrigin =
    typeof window !== 'undefined' ? window.location.origin : 'http://localhost';

  const resolvedUrl = new URL(trimmedBaseUrl, runtimeOrigin);

  if (!resolvedUrl.pathname.endsWith('/')) {
    resolvedUrl.pathname = `${resolvedUrl.pathname}/`;
  }

  return resolvedUrl.toString();
}

function normalizeRoutePath(path: string): string {
  return path.replace(/^\/+/, '');
}

function joinRoutePath(prefix: string, path = ''): string {
  const normalizedPrefix = prefix.replace(/^\/+|\/+$/g, '');
  const normalizedPath = normalizeRoutePath(path);

  if (!normalizedPath) {
    return normalizedPrefix;
  }

  return `${normalizedPrefix}/${normalizedPath}`;
}

function appendQueryToUrl(
  url: URL,
  query?: Record<string, QueryValue>,
): void {
  if (!query) {
    return;
  }

  for (const [key, value] of Object.entries(query)) {
    if (value === null || value === undefined) {
      continue;
    }

    const values = Array.isArray(value) ? value : [value];

    for (const currentValue of values) {
      url.searchParams.append(key, String(currentValue));
    }
  }
}

async function parseResponseBody(response: Response): Promise<unknown> {
  if (response.status === 204) {
    return null;
  }

  const rawBody = await response.text();

  if (!rawBody) {
    return null;
  }

  const contentType = response.headers.get('content-type') ?? '';

  if (contentType.includes('application/json')) {
    try {
      return JSON.parse(rawBody);
    } catch {
      return rawBody;
    }
  }

  return rawBody;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function inferErrorMessage(
  method: string,
  url: string,
  status: number,
  data: unknown,
): string {
  if (isRecord(data)) {
    for (const key of ['error', 'message', 'reason']) {
      const value = data[key];
      if (typeof value === 'string' && value.trim()) {
        return value;
      }
    }
  }

  const pathname = new URL(url).pathname;
  return `${method.toUpperCase()} ${pathname} failed with status ${status}`;
}

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer), (value) =>
    value.toString(16).padStart(2, '0'),
  ).join('');
}

async function sha256Hex(value: string): Promise<string> {
  if (!globalThis.crypto?.subtle) {
    throw new Error('Web Crypto API is not available in this environment.');
  }

  const data = new TextEncoder().encode(value);
  const digest = await globalThis.crypto.subtle.digest('SHA-256', data);
  return toHex(digest);
}

export class PocketServerClient {
  private baseUrl: string;
  private accessToken: string | null;
  private readonly fetchImpl: typeof fetch;
  private readonly getAccessToken?: () => string | null | undefined;
  private readonly defaultHeaders?: HeadersInit;

  constructor(
    input: string | PocketServerClientOptions = DEFAULT_POCKET_SERVER_BASE_URL,
  ) {
    const options =
      typeof input === 'string' ? { baseUrl: input } : input ?? {};

    this.baseUrl = normalizeBaseUrl(
      options.baseUrl ?? DEFAULT_POCKET_SERVER_BASE_URL,
    );
    this.accessToken = options.accessToken?.trim() || null;
    this.fetchImpl = options.fetch ?? fetch;
    this.getAccessToken = options.getAccessToken;
    this.defaultHeaders = options.headers;
  }

  getBaseUrl(): string {
    return this.baseUrl;
  }

  setBaseUrl(baseUrl: string): void {
    this.baseUrl = normalizeBaseUrl(baseUrl);
  }

  setAccessToken(token: string | null | undefined): void {
    this.accessToken = token?.trim() || null;
  }

  clearAccessToken(): void {
    this.accessToken = null;
  }

  private resolveAccessToken(token?: string | null): string | null {
    const explicitToken = token?.trim();
    if (explicitToken) {
      return explicitToken;
    }

    if (this.accessToken) {
      return this.accessToken;
    }

    const providedToken = this.getAccessToken?.();
    return providedToken?.trim() || null;
  }

  async request<T = unknown>(
    path: string,
    options: PocketServerRequestOptions = {},
  ): Promise<T> {
    const {
      body: requestBody,
      json,
      query,
      token,
      headers: requestHeaders,
      method,
      ...requestInit
    } = options;

    if (json !== undefined && requestBody !== undefined) {
      throw new Error('Use either `json` or `body`, not both.');
    }

    const url = new URL(normalizeRoutePath(path), this.baseUrl);
    appendQueryToUrl(url, query);

    const headers = new Headers(this.defaultHeaders);

    if (requestHeaders) {
      new Headers(requestHeaders).forEach((value, key) => {
        headers.set(key, value);
      });
    }

    const resolvedToken = this.resolveAccessToken(token);

    if (resolvedToken && !headers.has('Authorization')) {
      headers.set('Authorization', `${POCKET_AUTH_SCHEME} ${resolvedToken}`);
    }

    let body = requestBody;

    if (json !== undefined) {
      if (!headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
      }
      body = JSON.stringify(json);
    }

    const requestMethod = (method ??
      (json !== undefined || requestBody !== undefined ? 'POST' : 'GET'))
      .toUpperCase();

    const response = await this.fetchImpl(url.toString(), {
      ...requestInit,
      method: requestMethod,
      headers,
      body,
    });

    const data = (await parseResponseBody(response)) as T | null;

    if (!response.ok) {
      throw new PocketServerClientError<T>({
        message: inferErrorMessage(
          requestMethod,
          url.toString(),
          response.status,
          data,
        ),
        status: response.status,
        data,
        method: requestMethod,
        url: url.toString(),
      });
    }

    return data as T;
  }

  health(options: PocketServerMethodOptions = {}) {
    return this.request<PocketServerHealthResponse>('health', options);
  }

  stats(options: PocketServerMethodOptions = {}) {
    return this.request<PocketServerStatsResponse>('stats', options);
  }

  getPublicBaseUrl(options: PocketServerMethodOptions = {}) {
    return this.request<PocketServerPublicBaseUrlResponse>(
      'cloud/public-base-url',
      options,
    );
  }

  getDeviceStatus(deviceId: string, options: PocketServerMethodOptions = {}) {
    return this.request<PocketServerDeviceStatusResponse>('auth/device/status', {
      ...options,
      query: { deviceId },
    });
  }

  getPairingStatus(options: PocketServerMethodOptions = {}) {
    return this.request<PocketServerPairingStatusResponse>(
      'auth/pair/status',
      options,
    );
  }

  pairDevice(
    payload: PocketServerPairDeviceRequest,
    options: PocketServerMethodOptions = {},
  ) {
    return this.request<PocketServerPairDeviceResponse>('auth/pair', {
      ...options,
      method: 'POST',
      json: payload,
    });
  }

  createChallenge(
    payload: PocketServerChallengeRequest,
    options: PocketServerMethodOptions = {},
  ) {
    return this.request<PocketServerChallengeResponse>('auth/challenge', {
      ...options,
      method: 'POST',
      json: payload,
    });
  }

  exchangeToken(
    payload: PocketServerTokenRequest,
    options: PocketServerMethodOptions = {},
  ) {
    return this.request<PocketServerTokenResponse>('auth/token', {
      ...options,
      method: 'POST',
      json: payload,
    });
  }

  async authenticateDevice(
    input: PocketServerAuthenticateRequest,
  ): Promise<PocketServerTokenResponse> {
    const challenge = await this.createChallenge(
      { deviceId: input.deviceId },
      { signal: input.signal },
    );

    const signature = await PocketServerClient.createTokenSignature({
      deviceId: input.deviceId,
      nonce: challenge.nonce,
      secret: input.secret,
    });

    return this.exchangeToken(
      {
        deviceId: input.deviceId,
        nonce: challenge.nonce,
        signature,
      },
      { signal: input.signal },
    );
  }

  listTerminalSessions(options: PocketServerMethodOptions = {}) {
    return this.request<PocketServerTerminalSessionsResponse>(
      'terminal/sessions',
      options,
    );
  }

  authRequest<T = unknown>(
    path: string,
    options: PocketServerRequestOptions = {},
  ) {
    return this.request<T>(joinRoutePath('auth', path), options);
  }

  terminalRequest<T = unknown>(
    path: string,
    options: PocketServerRequestOptions = {},
  ) {
    return this.request<T>(joinRoutePath('terminal', path), options);
  }

  notificationsRequest<T = unknown>(
    path: string,
    options: PocketServerRequestOptions = {},
  ) {
    return this.request<T>(joinRoutePath('notifications', path), options);
  }

  fileSystemRequest<T = unknown>(
    path: string,
    options: PocketServerRequestOptions = {},
  ) {
    return this.request<T>(joinRoutePath('fs', path), options);
  }

  cloudRequest<T = unknown>(
    path: string,
    options: PocketServerRequestOptions = {},
  ) {
    return this.request<T>(joinRoutePath('cloud', path), options);
  }

  agentRequest<T = unknown>(
    path: string,
    options: PocketServerRequestOptions = {},
  ) {
    return this.request<T>(joinRoutePath('agent', path), options);
  }

  createWebSocketUrl(options: PocketServerWebSocketUrlOptions = {}): string {
    const wsUrl = new URL('ws', this.baseUrl);
    const resolvedToken = this.resolveAccessToken(options.token);

    const localSecret = options.localSecret?.trim() || null;

    if (resolvedToken) {
      wsUrl.searchParams.set('token', resolvedToken);
    }

    if (localSecret) {
      wsUrl.searchParams.set('local', localSecret);
    }

    wsUrl.protocol = wsUrl.protocol === 'https:' ? 'wss:' : 'ws:';
    return wsUrl.toString();
  }

  static createTokenSignature(input: PocketServerTokenSignatureInput) {
    return sha256Hex(`${input.secret}\n${input.deviceId}\n${input.nonce}`);
  }
}

const pocketServerClient = new PocketServerClient();

export { DEFAULT_POCKET_SERVER_BASE_URL };
export default pocketServerClient;
