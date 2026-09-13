import axios, { AxiosRequestConfig } from 'axios';

export const BASE_URL = process.env.EXPO_PUBLIC_BASE_URL;

// Keep the auth token in memory to avoid SecureStore I/O on every request.
let inMemoryAuthToken: string | null = null;

export function setApiAuthToken(token: string | null) {
  inMemoryAuthToken = token;
}

export function getApiAuthToken() {
  return inMemoryAuthToken;
}

/**
 * What to do when the server says this session may no longer be used.
 *
 * The auth store registers itself here rather than being imported, which would
 * make a cycle — the store already imports this module for the token.
 */
let onSessionRejected: ((reason: string) => void) | null = null;

export function setSessionRejectedHandler(handler: ((reason: string) => void) | null) {
  onSessionRejected = handler;
}

export const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Attach the bearer token. config.headers is an AxiosHeaders instance, so it is
// mutated rather than replaced with a plain object — replacing it drops the
// methods the rest of axios calls on it.
api.interceptors.request.use((config) => {
  const token = inMemoryAuthToken;
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`);
  }

  return config;
});

/**
 * End the session when the server has stopped honouring it.
 *
 * 401 means the token is no longer valid. A 403 is normally just "not allowed
 * to do that" and must not sign anyone out — except when the whole tenant has
 * been suspended, which the server marks with a flag so this does not have to
 * match on prose. Without this, suspending a tenant left anyone already signed
 * in looking at screens that silently failed to load.
 */
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const data = error?.response?.data;

    const tenantSuspended = status === 403 && data?.error === 'organization_suspended';

    if (inMemoryAuthToken && (status === 401 || tenantSuspended)) {
      onSessionRejected?.(
        data?.message ?? 'Your session has ended. Please sign in again.'
      );
    }

    return Promise.reject(error);
  }
);

/**
 * The options a call may pass to the mutator.
 *
 * Orval is configured for react-query, whose default HTTP client is fetch, so
 * every generated function is typed to hand us a `RequestInit` — and passes it
 * on to other generated functions typed the same way. Declaring this as a
 * `RequestInit` with axios's `data` added keeps it assignable in both
 * directions, which is what makes the generated client type-clean without
 * regenerating it against an axios template. Axios accepts the fields these
 * objects actually carry — method, headers, signal, body — at runtime.
 */
export type RequestOptions = RequestInit & { data?: unknown };

/** The mutator Orval's generated hooks call to execute a request. */
export const customInstance = <T>(
  url: string,
  options?: RequestOptions,
): Promise<T> => {
  const source = axios.CancelToken.source();

  // Orval emits a fetch-style `body` for some operations and axios's `data` for
  // others, so both are accepted.
  const config = (options ?? {}) as AxiosRequestConfig & { body?: unknown };
  const data = config.data ?? config.body;

  /* 
   * FIX: Orval generates FormData with repeated keys (e.g. 'meters', 'meters') 
   * but the backend expects "exploded" keys (e.g. 'meters[0][nozzle_id]').
   * We intercept and fix this here by parsing the JSON values and recursively flattening them.
   */
  if (data instanceof FormData) {
    const newData = new FormData();

    const isRNFileDescriptor = (val: unknown): val is { uri: string; type?: string; name?: string } =>
      typeof val === 'object' && val !== null && 'uri' in val && typeof (val as { uri: unknown }).uri === 'string';

    const appendRecursive = (formData: FormData, data: any, rootKey: string) => {
      if (rootKey === 'evidence' && data instanceof Blob) {
        formData.append(rootKey, data);
        return;
      }
      if (data instanceof Date) {
        formData.append(rootKey, data.toISOString());
      } else if (data instanceof Blob || data instanceof File) {
        formData.append(rootKey, data);
      } else if (isRNFileDescriptor(data)) {
        // React Native accepts a {uri, type, name} descriptor where the DOM
        // expects a Blob; the cast is for the type checker, not the runtime.
        formData.append(rootKey, data as unknown as Blob);
      } else if (Array.isArray(data)) {
        data.forEach((value, index) => {
          appendRecursive(formData, value, `${rootKey}[${index}]`);
        });
      } else if (typeof data === 'object' && data !== null) {
        Object.keys(data).forEach((key) => {
          appendRecursive(formData, data[key], `${rootKey}[${key}]`);
        });
      } else {
        formData.append(rootKey, String(data));
      }
    };

    // These three arrive as JSON strings, or as repeated keys, depending on the
    // operation; either way they are collected before being exploded below.
    const keysToExplode = ['meters', 'dips', 'payments'];
    const tempStore: Record<string, any[]> = {};

    (data as any).forEach((value: any, key: string) => {
      if (keysToExplode.includes(key)) {
        // Try to parse JSON. If it's a string, it might be the JSON representation.
        try {
          if (typeof value === 'string') {
            const parsed = JSON.parse(value);
            // If it's meters/dips, Orval might be sending item by item (repeated key) or as a list wrapped in one string.
            // We accumulate them just in case.
            if (!tempStore[key]) tempStore[key] = [];
            tempStore[key].push(parsed);
          } else {
            // Already an object/array?
            if (!tempStore[key]) tempStore[key] = [];
            tempStore[key].push(value);
          }
        } catch (e) {
          // Fallback: treat as normal value
          newData.append(key, value);
        }
      } else {
        newData.append(key, value);
      }
    });

    // Explode each collected key into the bracket notation Laravel expects.
    //
    // `payments` is one object, so it becomes payments[cash]; `meters` and
    // `dips` are lists, so they become meters[0][nozzle_id]. A list that
    // arrived as a single JSON array is unwrapped first, so it does not end up
    // nested a level deeper than the server reads.
    Object.keys(tempStore).forEach((key) => {
      const values = tempStore[key];

      if (key === 'payments' && values.length === 1 && !Array.isArray(values[0])) {
        appendRecursive(newData, values[0], key);
        return;
      }

      const finalArray =
        values.length === 1 && Array.isArray(values[0]) ? values[0] : values;

      finalArray.forEach((item, index) => {
        appendRecursive(newData, item, `${key}[${index}]`);
      });
    });

    const promise = api({
      url,
      ...config,
      data: newData,
      cancelToken: source.token,
      headers: {
        ...config.headers,
        'Content-Type': false as unknown as string,
      },
    }).then(({ data }) => data);

    // @ts-ignore
    promise.cancel = () => {
      source.cancel('Query was cancelled');
    };

    return promise;
  }

  const promise = api({
    url,
    ...config,
    data,
    cancelToken: source.token,
  }).then(({ data }) => data);

  // @ts-ignore
  promise.cancel = () => {
    source.cancel('Query was cancelled');
  };

  return promise;
};