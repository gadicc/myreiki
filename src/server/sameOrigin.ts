/** Use the HTTP authority: Next normalizes loopback Request URLs to localhost. */
export function isSameOriginRequest(request: Request) {
  const value = request.headers.get("origin");
  if (!value) return false;
  try {
    const origin = new URL(value);
    return (
      origin.origin === value &&
      origin.protocol === new URL(request.url).protocol &&
      origin.host === request.headers.get("host")
    );
  } catch {
    return false;
  }
}
