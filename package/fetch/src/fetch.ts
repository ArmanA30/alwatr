import {createLogger, alwatrRegisteredList} from '@alwatr/logger';

const logger = createLogger('alwatr/fetch');

alwatrRegisteredList.push({
  name: '@alwatr/fetch',
  version: '{{ALWATR_VERSION}}',
});

declare global {
  // Patch typescript's global types
  interface AbortController {
    abort(reason?: string): void;
  }
  interface AbortSignal {
    reason?: string;
  }
}

// @TODO: docs for all options
export interface FetchOptions extends RequestInit
{
  /**
   * @default 10_000 ms
   */
  timeout?: number;
  bodyObject?: Record<string | number, unknown>;
  queryParameters?: Record<string, string | number | boolean>;
}

/**
 * Enhanced base fetch API.
 * @example const response = await fetch(url, {jsonResponse: false});
 */
export function fetch(url: string, options?: FetchOptions): Promise<Response> {
  logger.logMethodArgs('fetch', {url, options});

  if (!navigator.onLine) {
    logger.accident('fetch', 'abort_signal', 'abort signal received', {url});
    throw new Error('fetch_offline');
  }

  options = {
    method: 'GET',
    timeout: 15_000,
    window: null,
    ...options,
  };

  if (options.queryParameters != null) {
    const queryArray = Object
        .keys(options.queryParameters)
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        .map((key) => `${key}=${String(options!.queryParameters![key])}`)
    ;
    if (queryArray.length > 0) {
      url += '?' + queryArray.join('&');
    }
  }

  if (options.bodyObject != null) {
    options.body = JSON.stringify(options.bodyObject);
    options.headers = {
      ...options.headers,
      'Content-Type': 'application/json',
    };
  }

  // @TODO: AbortController polyfill
  const abortController = new AbortController();
  const externalAbortSignal = options.signal;
  if (externalAbortSignal != null) {
    // Respect external abort signal
    externalAbortSignal.addEventListener('abort', () => {
      abortController.abort(`external abort signal: ${externalAbortSignal.reason}`);
    });
  }
  abortController.signal.addEventListener('abort', () => {
    logger.incident('fetch', 'abort_signal', 'abort signal received', {url, reason: abortController.signal.reason});
  });
  options.signal = abortController.signal;

  const timeoutId = setTimeout(() => abortController.abort('fetch_timeout'), options.timeout);

  // @TODO: browser fetch polyfill
  const response = window.fetch(url, options);
  response.then(() => clearTimeout(timeoutId));
  return response;
}

/**
 * Enhanced get data.
 * @example
 * const response = await postData('/api/products', {limit: 10}, {timeout: 5_000});
 */
export function getData(
    url: string,
    queryParameters?: Record<string | number, string | number | boolean>,
    options?: FetchOptions,
): Promise<Response> {
  logger.logMethodArgs('getData', {url, queryParameters, options});
  return fetch(url, {
    queryParameters,
    ...options,
  });
}

/**
 * Enhanced fetch JSON.
 * @example
 * const productList = await getJson('/api/products', {limit: 10}, {timeout: 5_000});
 */
export async function getJson<ResponseType extends Record<string | number, unknown>>(
    url: string,
    queryParameters?: Record<string | number, string | number | boolean>,
    options?: FetchOptions,
): Promise<ResponseType> {
  logger.logMethodArgs('getJson', {url, queryParameters, options});
  const response = await getData(url, queryParameters, options);

  if (!response.ok) {
    throw new Error('fetch_nok');
  }

  return response.json() as Promise<ResponseType>;
}

/**
 * Enhanced post json data.
 * @example
 * const response = await postData('/api/product/new', {name: 'foo', ...});
 */
export function postData(
    url: string,
    body: Record<string | number, unknown>,
    options?: FetchOptions,
): Promise<Response> {
  logger.logMethodArgs('postData', {url, body, options});
  return fetch(url, {
    method: 'POST',
    bodyObject: body,
    ...options,
  });
}
