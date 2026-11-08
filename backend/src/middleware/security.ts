import type { MiddlewareHandler } from 'hono';

/**
 * Reject requests whose Host is not an allowed local name.
 * Defends against DNS rebinding: a malicious site resolving its own domain to 127.0.0.1
 * would otherwise be able to call this unauthenticated API from the user's browser.
 */
export function allowedHosts(hosts: string[]): MiddlewareHandler {
  const allowed = new Set(hosts.map((h) => h.toLowerCase()));
  return async (c, next) => {
    const hostname = new URL(c.req.url).hostname.toLowerCase();
    if (!allowed.has(hostname)) return c.json({ message: 'Forbidden host' }, 403);
    await next();
  };
}

export const DEFAULT_ALLOWED_HOSTS = ['localhost', '127.0.0.1', '[::1]'];
