import {createLogger} from '@vatr/logger';
import type {RequestRouteParam, Route} from './type';

export const log = createLogger('vatr/router');
// export const error = createLogger('vatr/router', 'error', true);

/**
 * Handle requests of 'router-change' signal.
 */
export function routeSignalProvider(requestParam: RequestRouteParam): Route {
  log('routeSignalProvider: %o', requestParam);
  updateBrowserHistory(requestParam);
  return makeRouteObject(requestParam);
}

/**
 * Update browser history state (history.pushState or history.replaceState).
 */
export function updateBrowserHistory(options: RequestRouteParam): void {
  log('_updateBrowserHistory(%o)', options);
  if (options.pushState === false) return; // default is true then undefined means true.

  options.search ??= '';
  options.hash ??= '';

  if (
    window.location.pathname === options.pathname ||
    window.location.search === options.search ||
    window.location.hash === options.hash
  ) {
    return;
  }

  const changeState = options.pushState === 'replace' ? 'replaceState' : 'pushState';
  window.history[changeState](null, document.title, options.pathname + options.search + options.hash);
}

/**
 * Make Route from RequestRouteParam.
 */
export function makeRouteObject(requestParam: RequestRouteParam): Route {
  log('makeRouteObject: %o', requestParam);
  requestParam.search ??= '';
  requestParam.hash ??= '';

  const sectionList = requestParam.pathname
      .split('/')
      .map(_decodeURIComponent) // decode must be after split because encoded '/' maybe include in values.
      .filter((section) => section.trim() !== '')
      .map(parseValue)
  ;

  return {
    sectionList,
    queryParamList: splitParameterString(requestParam.search.substring(1)/* remove first ? */),
    hash: requestParam.hash,
  };
}

/**
 * decodeURIComponent without throwing error.
 */
export function _decodeURIComponent(val: string): string {
  try {
    return decodeURIComponent(val);
  } catch (err) {
    return val;
  }
}

/**
 * Make query string from {key:val} object
 */
export function joinParameterList(
    parameterList: Record<string, string | number | boolean> | null | undefined,
): string {
  if (parameterList == null) return '';
  const list: Array<string> = [];
  for (const key in parameterList) {
    if (Object.prototype.hasOwnProperty.call(parameterList, key)) {
      list.push(`${key}=${String(parameterList[key])}`);
    }
  }
  return list.join('&');
}

/**
 * Make {key:val} object from query string
 */
export function splitParameterString(
    parameterString: string | null | undefined,
): Record<string, string | number | boolean> {
  const parameterList = {};
  if (!parameterString) return parameterList;

  parameterString
      .split('&')
      .forEach((parameter) => {
        const parameterArray = parameter.split('=');
        parameterList[parameterArray[0]] = parameterArray[1] != null ? parseValue(parameterArray[1]) : null;
      })
  ;

  return parameterList;
}

/**
 * Check type of a value is `number` or not
 */
export function parseValue(value: string): string | boolean | number {
  const trimmedValue = value.trim().toLowerCase();
  if (trimmedValue === '') return value;
  if (trimmedValue === 'true' || trimmedValue === 'false') return trimmedValue === 'true';
  const parsedValue = parseFloat(trimmedValue);
  // note: `parseFloat('NaN').toString() === 'NaN'` is true, then always check isNaN
  if (!isNaN(parsedValue) && parsedValue.toString() === trimmedValue) return parsedValue;
  return value;
}