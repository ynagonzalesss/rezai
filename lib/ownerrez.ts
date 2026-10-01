// Server-side only. Never import this file from a client component.
const base = process.env.OWNERREZ_API_BASE || 'https://api.ownerrez.com/v2';

/** Live OwnerRez data is used only when a token is configured. */
export function ownerrezEnabled() {
  return !!process.env.OWNERREZ_ACCESS_TOKEN;
}

/**
 * Live data (guest names, bookings) is only returned to callers who send the
 * team key. Without REZAI_ACCESS_KEY set, live data is never served, so a
 * public deployment can't leak guest details.
 */
export function liveAllowed(req: Request) {
  const key = process.env.REZAI_ACCESS_KEY;
  if (!ownerrezEnabled() || !key) return false;
  return req.headers.get('x-rezai-key') === key;
}

function authHeaders(): Record<string, string> {
  const token = process.env.OWNERREZ_ACCESS_TOKEN;
  if (!token) throw new Error('OWNERREZ_ACCESS_TOKEN is not configured');
  // Personal access tokens (pt_...) use HTTP Basic auth: OwnerRez email + token.
  if (token.startsWith('pt_')) {
    const email = process.env.OWNERREZ_EMAIL;
    if (!email) throw new Error('OWNERREZ_EMAIL is required with a personal access token');
    return { Authorization: 'Basic ' + Buffer.from(`${email}:${token}`).toString('base64') };
  }
  // OAuth access tokens (at_...) use Bearer auth plus a User-Agent naming the app.
  const clientId = process.env.OWNERREZ_CLIENT_ID || 'unknown';
  return { Authorization: `bearer ${token}`, 'User-Agent': `RezAI/1.0 (${clientId})` };
}

export async function ownerrez(path: string, init: RequestInit = {}) {
  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: { Accept: 'application/json', ...authHeaders(), ...((init.headers as Record<string, string>) || {}) },
    cache: 'no-store',
  });
  if (!res.ok) {
    let detail = '';
    try { detail = await res.text(); } catch {}
    throw new Error(`OwnerRez API error: ${res.status}${detail ? ' — ' + detail.slice(0, 500) : ''}`);
  }
  return res.json();
}

export function items(data: any): any[] {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}
