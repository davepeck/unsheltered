/** Simple tool that takes a base URL and query parameters, and returns a URL. */
export function buildURL(base: string, params: Record<string, string>): string {
  const url = new URL(base);
  for (const key in params) {
    url.searchParams.set(key, params[key]);
  }
  return url.toString();
}

/** Simple 'get' method that uses node's fetch, and offers a timeout. */
export async function get(url: string, timeout = 30000): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  const response = await fetch(url, { signal: controller.signal });
  clearTimeout(timeoutId);
  return response;
}

/** Simple 'post' method that uses node's fetch, and offers a timeout. */
export async function post(
  url: string,
  body: string,
  timeout = 30000
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  const response = await fetch(url, {
    method: "POST",
    body,
    signal: controller.signal,
  });
  clearTimeout(timeoutId);
  return response;
}
