// Server-side only. Reads OwnerRez bookings and answers natural-language questions.
// Field access is deliberately tolerant: OwnerRez payloads vary by account/channel.

export type Fetcher = (path: string) => Promise<any>;
export const OR = 'https://app.ownerrez.com';
export const bookingUrl = (id: string) => `${OR}/bookings/${id}`;
export const guestUrl = (id: string) => `${OR}/guests/${id}`;
export const propertyUrl = (id: string) => `${OR}/properties/${id}`;
export type Booking = {
  propertyId: string; guestId: string; contact: string;
  channel: string; children2: number | null; infants: number | null; pets: number | null; paid: number | null; checkInEnd: string;
  created: string; id: string; property: string; guest: string;
  arrival: string; departure: string; checkIn: string; checkOut: string;
  status: string; cancelled: boolean; nights: number;
  adults: number | null; children: number | null;
  balance: number | null; total: number | null; updated: string; notes: string;
};

const TZ = 'America/Phoenix';
const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' });
export const isoDay = (d: Date) => fmt.format(d);
export function today(now = new Date()) { return isoDay(now); }
export function addDays(iso: string, n: number) {
  const d = new Date(iso + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10);
}
const nice = (iso: string) => new Date(iso + 'T12:00:00Z').toLocaleDateString('en-US', { timeZone: 'UTC', weekday: 'short', month: 'short', day: 'numeric' });
const day10 = (v: any) => String(v || '').slice(0, 10);
export const contactOf = (g: any): string => { const ph = (g?.phones || g?.phone_numbers || []).map((x: any) => x?.number || x?.phone || x).filter((x: any) => typeof x === 'string'); const em = (g?.email_addresses || g?.emails || []).map((x: any) => x?.address || x?.email || x).filter((x: any) => typeof x === 'string'); return [...ph, ...em, g?.email, g?.phone].filter((x: any) => typeof x === 'string' && x).join(' · '); };
const list = (data: any): any[] => Array.isArray(data) ? data : data?.items || data?.results || data?.data || [];

export async function loadBookings(get: Fetcher, from: string, to: string) {
  const props = list(await get('/properties?active=true&limit=100'));
  const names = new Map<string, string>(props.map((p: any) => [String(p.id), p.name || p.external_name || 'Property ' + p.id]));
  const ids = [...names.keys()];
  const raw: any[] = [];
  for (let offset = 0, page = 0; page < 10; page++) {
    const qs = new URLSearchParams({ from, to, include_guest: 'true', limit: '100', offset: String(offset) });
    ids.forEach(id => qs.append('property_ids', id));
    const batch = list(await get('/bookings?' + qs.toString()));
    raw.push(...batch);
    if (batch.length < 100) break;
    offset += 100;
  }
  const real = raw.filter(b => !b.is_block);
  // Names: use an embedded guest object when present, otherwise look guests up by id.
  const guestName = (g: any) => (g ? (g.name || [g.first_name, g.last_name].filter(Boolean).join(' ') || '') : '').replace(/[\[\]()*]/g, '');
  const need = [...new Set(real.filter(b => !guestName(b.guest) && b.guest_id).map(b => String(b.guest_id)))].slice(0, 60);
  const fetched = new Map<string, string>(); const contacts = new Map<string, string>();
  await Promise.all(need.map(async id => { try { const g = await get('/guests/' + id); fetched.set(id, guestName(g)); contacts.set(id, contactOf(g)); } catch {} }));
  const out = real.map((b): Booking => {
    const status = String(b.status || '').toLowerCase();
    const arrival = day10(b.arrival), departure = day10(b.departure);
    return {
      propertyId: String(b.property_id ?? ''), guestId: String(b.guest_id ?? ''), contact: contacts.get(String(b.guest_id)) || contactOf(b.guest),
      created: (b.booked_utc || b.created_utc) ? isoDay(new Date(b.booked_utc || b.created_utc)) : '', id: String(b.id), property: names.get(String(b.property_id)) || b.property?.name || b.property?.external_name || 'Property ' + b.property_id,
      guest: guestName(b.guest) || fetched.get(String(b.guest_id)) || 'Guest (name not on file)',
      arrival, departure, checkIn: String(b.check_in || '').trim(), checkOut: String(b.check_out || '').trim(),
      status, cancelled: /cancel/.test(status),
      nights: arrival && departure ? Math.round((Date.parse(departure) - Date.parse(arrival)) / 864e5) : 0,
      adults: b.adults ?? null, children: b.children ?? null,
      balance: typeof b.balance_due === 'number' ? b.balance_due : (typeof b.total_amount === 'number' && typeof b.total_paid === 'number' ? Math.max(0, Math.round((b.total_amount - b.total_paid) * 100) / 100) : null),
      total: typeof b.total_amount === 'number' ? b.total_amount : null, paid: typeof b.total_paid === 'number' ? b.total_paid : null,
      channel: String(b.listing_site || b.channel || '').trim(), children2: b.children ?? null, infants: b.infants ?? null, pets: b.pets ?? null, checkInEnd: String(b.check_in_end || '').trim(),
      updated: b.updated_utc ? isoDay(new Date(b.updated_utc)) : '', notes: String(b.notes || '').slice(0, 160),
    };
  });
  (out as any).props = [...names.entries()].map(([id, name]) => ({ id, name }));
  return out;
}

// ---------- understanding the question ----------
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const DOW = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

export function parseWhen(m: string, now = today()): { from: string; to: string; label: string } {
  const t = now;
  if (/day after tomorrow/.test(m)) { const d = addDays(t, 2); return { from: d, to: d, label: nice(d) }; }
  if (/tomorrow/.test(m)) { const d = addDays(t, 1); return { from: d, to: d, label: 'tomorrow (' + nice(d) + ')' }; }
  if (/yesterday/.test(m)) { const d = addDays(t, -1); return { from: d, to: d, label: 'yesterday (' + nice(d) + ')' }; }
  if (/next (7|seven) days|this week|next week|upcoming/.test(m)) {
    const start = /next week/.test(m) ? addDays(t, 7) : t; return { from: start, to: addDays(start, 6), label: nice(start) + ' – ' + nice(addDays(start, 6)) };
  }
  const iso = m.match(/\b(20\d\d-\d\d-\d\d)\b/);
  if (iso) return { from: iso[1], to: iso[1], label: nice(iso[1]) };
  const md = m.match(new RegExp('\\b(' + MONTHS.join('|') + ')[a-z]*\\.?\\s+(\\d{1,2})\\b'));
  if (md) {
    const y = Number(t.slice(0, 4)); let d = `${y}-${String(MONTHS.indexOf(md[1]) + 1).padStart(2, '0')}-${md[2].padStart(2, '0')}`;
    if (d < addDays(t, -180)) d = d.replace(String(y), String(y + 1));
    return { from: d, to: d, label: nice(d) };
  }
  const dw = m.match(new RegExp('\\b(?:on |this |next )?(' + DOW.join('|') + ')[a-z]*\\b'));
  if (dw) { for (let i = 1; i <= 7; i++) { const d = addDays(t, i); if (DOW[new Date(d + 'T12:00:00Z').getUTCDay()] === dw[1]) return { from: d, to: d, label: nice(d) }; } }
  return { from: t, to: t, label: 'today (' + nice(t) + ')' };
}

export type Intent =
  | { kind: 'booking'; id: string }
  | { kind: 'cancelled' } | { kind: 'cancel_request' }
  | { kind: 'departures' } | { kind: 'arrivals' } | { kind: 'staying' }
  | { kind: 'channels' } | { kind: 'activity' } | { kind: 'turnover' } | { kind: 'vacant' } | { kind: 'balance' } | { kind: 'briefing' } | { kind: 'inquiries' }
  | { kind: 'guest'; name: string } | { kind: 'help' };

export function parseIntent(m: string): Intent {
  const bid = m.match(/(?:booking|reservation|confirmation|res)\s*(?:id|number|no\.?|#)?\s*[:#]?\s*(\d{4,})/) || m.match(/#(\d{4,})/);
  if (bid) return { kind: 'booking', id: bid[1] };
  if (/by channel|per channel|channel breakdown|which channels|booking sources?|where (are|do) (our )?bookings come/.test(m)) return { kind: 'channels' };
  if (/what happened|activity|end of day|recap|what.?s new|new bookings?|booked today|today.?s (summary|log|report)|summary of (the |today|my )?day|day summary|log for/.test(m)) return { kind: 'activity' };
  if (/inquir|\bleads?\b/.test(m)) return { kind: 'inquiries' };
  if (/turnover|same.?day|back.?to.?back/.test(m)) return { kind: 'turnover' };
  if (/vacan|empty|unbooked|not booked|gap nights|which (properties|homes|houses).*(free|open|available)/.test(m)) return { kind: 'vacant' };
  if (/balance|unpaid|owes?\b|outstanding|payment due|haven.?t paid/.test(m)) return { kind: 'balance' };
  if (/briefing|brief me|overview|rundown|what.?s happening|daily summary|summary for/.test(m)) return { kind: 'briefing' };
  if (/cancel/.test(m) && /request|asking|wants? to|want to/.test(m)) return { kind: 'cancel_request' };
  if (/cancel/.test(m)) return { kind: 'cancelled' };
  if (/check(ing|s)?[\s-]?out|depart|leaving|leave\b|move.?out/.test(m)) return { kind: 'departures' };
  if (/check(ing|s)?[\s-]?in\b|arriv|coming in|check-?ins?/.test(m)) return { kind: 'arrivals' };
  if (/staying|in.?house|currently|tonight|who'?s here|occupied/.test(m)) return { kind: 'staying' };
  const nm = m.match(/(?:find|search|lookup|look up|booking for|reservation for|guest|named?)\s+(?:for\s+)?([a-z][a-z'’.-]+(?:\s+[a-z][a-z'’.-]+)?)/);
  const nmName = nm ? nm[1].trim().replace(/^((is|are|was|the|a|an|at|in|on|for|of|to|from|who|whos|staying|stays?)\s+)+/, '').trim() : '';
  if (nm && nmName.length > 2 && !/^(arrivals?|departures?|tomorrow|today|tonight|the|this|that|there)$/.test(nmName)) return { kind: 'guest', name: nmName };
  return { kind: 'help' };
}

// ---------- answering ----------
const money = (n: number | null) => (n == null ? '' : '$' + n.toLocaleString('en-US', { maximumFractionDigits: 0 }));
function line(b: Booking, withDates = true) {
  const parts = [b.guestId ? `[${b.guest}](${guestUrl(b.guestId)})` : b.guest, b.propertyId ? `[${b.property}](${propertyUrl(b.propertyId)})` : b.property, `[#${b.id}](${bookingUrl(b.id)})`];
  if (withDates) parts.push(`${nice(b.arrival)}${b.checkIn ? ' ' + b.checkIn : ''} → ${nice(b.departure)}${b.checkOut ? ' ' + b.checkOut : ''} (${b.nights} night${b.nights === 1 ? '' : 's'})`);
  if (b.channel) parts.push(b.channel);
  if (b.cancelled) parts.push('CANCELLED' + (b.updated ? ' (last updated ' + b.updated + ')' : ''));
  if (b.balance && b.balance > 0.5) parts.push('balance due ' + money(b.balance));
  return '• ' + parts.join(' — ');
}
const by = (a: Booking, b: Booking) => a.arrival.localeCompare(b.arrival) || a.guest.localeCompare(b.guest);

function shape(o: any, showValues: boolean): string {
  const rows: string[] = [];
  for (const k of Object.keys(o || {}).sort()) {
    const v = o[k];
    if (v === null || v === undefined) rows.push(`${k}: null`);
    else if (typeof v === 'number' || typeof v === 'boolean') rows.push(`${k}: ${showValues ? v : typeof v}`);
    else if (typeof v === 'string') rows.push(`${k}: ${showValues && /date|utc|status|type|source|site|channel|check|arrival|departure|currency/i.test(k) ? v.slice(0, 40) : '(text)'}`);
    else if (Array.isArray(v)) rows.push(`${k}: list of ${v.length}${v[0] && typeof v[0] === 'object' ? ' {' + Object.keys(v[0]).join(', ') + '}' : ''}`);
    else rows.push(`${k}: object {${Object.keys(v).join(', ')}}`);
  }
  return rows.join('\n');
}

export async function answer(get: Fetcher, message: string, now = today()): Promise<{ reply: string; verified: boolean; fallthrough?: boolean }> {
  const m = message.toLowerCase();
  const intent = parseIntent(m);
  const dbg = m.match(/debug\s+(booking|guest)\s*#?\s*(\d+)/);
  if (dbg) {
    const raw = await get(`/${dbg[1]}s/${dbg[2]}`);
    return { verified: true, reply: `Fields OwnerRez returns for ${dbg[1]} ${dbg[2]} (values shown only for numbers, dates and statuses; guest text is hidden):\n` + shape(raw, dbg[1] === 'booking') };
  }
  if (intent.kind === 'help') return { verified: false, reply: 'With live OwnerRez data I can answer:\n• Who is checking in / checking out today, tomorrow, on a date, or this week\n• Who is staying tonight\n• Booking details by ID — "booking 12345"\n• Find a guest — "find Smith"\n• Cancelled bookings — "cancelled bookings this week"\n• "What happened today" — new bookings, cancellations, changes, check-ins/outs and inquiries\n• Add a channel to any question: "Airbnb check-ins this week", "Vrbo check-outs tomorrow", "direct bookings today", or "bookings by channel"\n• Same-day turnovers, vacant properties tonight, balances due, latest inquiries, and a daily briefing\n• Listing descriptions, amenities and a template audit\n• "debug booking 12345" shows which fields OwnerRez returns (for troubleshooting)\n• Add "contact" to a booking question for the guest\'s phone/email\nI can also triage maintenance and guest concerns.' };

  if (intent.kind === 'cancel_request') {
    return { verified: false, reply: 'OwnerRez\'s API doesn\'t expose guest cancellation requests, since those arrive as messages or channel notices. Here are the most recently cancelled bookings:\n' + (await answer(get, 'cancelled bookings', now)).reply };
  }

  // One window wide enough to catch long stays that began earlier than the day asked about.
  const when = parseWhen(m, now);
  const lookBack = addDays(when.from, -90);
  let from = lookBack, to = addDays(when.to, 1);
  if (intent.kind === 'booking' || intent.kind === 'guest') { from = addDays(now, -365); to = addDays(now, 540); }
  if (intent.kind === 'activity') { from = addDays(when.from, -400); to = addDays(when.to, 540); }
  if (intent.kind === 'balance') { from = addDays(now, -30); to = addDays(now, 120); }
  if (intent.kind === 'cancelled') { from = addDays(now, -90); to = addDays(now, 365); }
  const all = await loadBookings(get, from, to);
  const active = all.filter(b => !b.cancelled);
  const hdr = (s: string) => s;
  // Channel words in the question (works even if that channel has no bookings in the window).
  const known = [...new Set([...all.map(b => b.channel.toLowerCase()).filter(Boolean), 'airbnb', 'vrbo', 'booking.com', 'expedia', 'google', 'wander'])];
  const wantDirect = /\b(direct|website|own site|our site|azdesertvacations|manual)\b/.test(m);
  const keys = known.filter(k => m.includes(k) || (k === 'booking.com' && /bookingcom/.test(m)));
  const chanOk = (c: string) => { const lc = c.toLowerCase(); return keys.some(k => lc.includes(k)) || (wantDirect && /azdesertvacations|direct|manual|website/.test(lc)); };
  const chan = [...new Set([...keys, ...(wantDirect ? ['direct'] : [])])];
  if (chan.length) when.label += ` (${chan.join(' + ')} only)`;
  const prop = (rows: Booking[]) => {
    const names: string[] = ((all as any).props || []).map((p: any) => String(p.name));
    const hit = names.find(n => n.length > 3 && m.includes(n.toLowerCase())) || names.find(n => { const w = n.toLowerCase().split(/[\s–-]+/).filter(x => x.length > 3); return w.length > 0 && w.slice(0, 2).every(x => m.includes(x)) && names.filter(o => o.toLowerCase().includes(w[0])).length === 1; });
    const byProp = hit ? rows.filter(b => b.property === hit) : rows;
    return chan.length ? byProp.filter(b => chanOk(b.channel)) : byProp;
  };

  switch (intent.kind) {
    case 'channels': {
      const d0 = when.from, d1 = /today|tomorrow|week|\bon\b|\d/.test(m) ? when.to : addDays(now, 30);
      const rows = active.filter(b => b.arrival >= d0 && b.arrival <= d1);
      const by2 = new Map<string, { n: number; nights: number; total: number }>();
      rows.forEach(b => { const k = b.channel || 'Unknown'; const v = by2.get(k) || { n: 0, nights: 0, total: 0 }; v.n++; v.nights += b.nights; v.total += b.total || 0; by2.set(k, v); });
      const out = [...by2.entries()].sort((a, b) => b[1].n - a[1].n);
      return { verified: true, reply: out.length ? `Bookings arriving ${nice(d0)} – ${nice(d1)} by channel (${rows.length} total):\n` + out.map(([k, v]) => `• ${k}: ${v.n} booking${v.n === 1 ? '' : 's'}, ${v.nights} nights, ${money(v.total)}`).join('\n') : 'No bookings arriving in that period.' };
    }
    case 'activity': {
      const d = when.from, e = when.to; const inR = (x: string) => x >= d && x <= e;
      const all2 = prop(all);
      const created = all2.filter(b => inR(b.created) && !b.cancelled).sort((a, b) => a.arrival.localeCompare(b.arrival));
      const cancelled = all2.filter(b => b.cancelled && inR(b.updated));
      const changed = all2.filter(b => !b.cancelled && inR(b.updated) && !inR(b.created));
      const A = all2.filter(b => !b.cancelled && inR(b.arrival)), D = all2.filter(b => !b.cancelled && inR(b.departure));
      let inq: any[] = []; try { inq = list(await get('/inquiries?limit=100')).filter((q: any) => q.received_utc && inR(isoDay(new Date(q.received_utc)))); } catch {}
      const bal = created.filter(b => (b.balance || 0) > 0);
      const sec = (t: string, rows: string[]) => rows.length ? `${t} (${rows.length}):\n` + rows.join('\n') : `${t}: none`;
      return { verified: true, reply: [`Activity summary — ${when.label}`,
        sec('New bookings', created.slice(0, 15).map(b => line(b) + (b.total != null ? ' — ' + money(b.total) : ''))),
        sec('Cancelled', cancelled.slice(0, 15).map(b => line(b))),
        sec('Changed or updated', changed.slice(0, 15).map(b => line(b))),
        sec('Check-ins', A.slice(0, 15).map(b => line(b, false))),
        sec('Check-outs', D.slice(0, 15).map(b => line(b, false))),
        `New inquiries: ${inq.length}`,
        bal.length ? `New bookings with a balance due: ${bal.length} (${money(bal.reduce((t, b) => t + (b.balance || 0), 0))})` : ''].filter(Boolean).join('\n\n') + '\n\nOwnerRez doesn\'t log messages, reviews or manual edits through this API, so those aren\'t included.' };
    }
    case 'inquiries': {
      const inq = list(await get('/inquiries?limit=50'));
      const names = new Map<string, string>(((all as any).props || []).map((p: any) => [p.id, p.name]));
      const rows = inq.sort((a: any, b: any) => String(b.received_utc || '').localeCompare(String(a.received_utc || ''))).slice(0, 15);
      return { verified: true, reply: rows.length ? `Latest inquiries (${rows.length}):\n` + rows.map((q: any) => `• [${names.get(String(q.property_id)) || 'Property ' + q.property_id}](${propertyUrl(String(q.property_id))}) — ${day10(q.arrival) ? nice(day10(q.arrival)) + ' → ' + nice(day10(q.departure)) : 'dates not given'} — ${q.status || 'status unknown'} — received ${day10(q.received_utc)} — [open inquiry](${OR}/inquiries/${q.id})`).join('\n') : 'No inquiries found.' };
    }
    case 'turnover': {
      const d = when.from; const dep = prop(active.filter(b => b.departure === d)); const arr = active.filter(b => b.arrival === d);
      const rows = dep.map(o => ({ o, i: arr.find(a => a.propertyId === o.propertyId) })).filter(x => x.i);
      return { verified: true, reply: rows.length ? `Same-day turnovers ${when.label}:\n` + rows.map(({ o, i }) => `• [${o.property}](${propertyUrl(o.propertyId)}) — out: ${o.guest} ${o.checkOut || ''} [#${o.id}](${bookingUrl(o.id)}) → in: ${i!.guest} ${i!.checkIn || ''} [#${i!.id}](${bookingUrl(i!.id)})`).join('\n') : `No same-day turnovers ${when.label}.` };
    }
    case 'vacant': {
      const d = when.from; const busy = new Set(active.filter(b => b.arrival <= d && b.departure > d).map(b => b.propertyId));
      const props: { id: string; name: string }[] = (all as any).props || [];
      const free = props.filter(p => !busy.has(p.id));
      return { verified: true, reply: `Night of ${nice(d)}: ${props.length - free.length} of ${props.length} properties booked.\n` + (free.length ? `Vacant (${free.length}):\n` + free.map(p => `• [${p.name}](${propertyUrl(p.id)})`).join('\n') : 'Nothing vacant.') };
    }
    case 'balance': {
      const r = prop(active.filter(b => (b.balance || 0) > 0.5 && b.departure >= now)).sort((a, b) => a.arrival.localeCompare(b.arrival)).slice(0, 25);
      const sum = r.reduce((t, b) => t + (b.balance || 0), 0);
      return { verified: true, reply: r.length ? `Upcoming and current bookings with a balance due (${r.length}, ${money(sum)} total):\n` + r.map(b => line(b)).join('\n') : 'No active bookings show a balance due.' };
    }
    case 'briefing': {
      const d = when.from; const A = prop(active.filter(b => b.arrival === d)), D = prop(active.filter(b => b.departure === d)), S = prop(active.filter(b => b.arrival < d && b.departure > d));
      const turn = D.filter(o => A.some(a => a.propertyId === o.propertyId)).length;
      const canc = all.filter(b => b.cancelled && b.updated >= addDays(now, -2)).length;
      const bal = active.filter(b => (b.balance || 0) > 0 && b.arrival >= d && b.arrival <= addDays(d, 7)).length;
      return { verified: true, reply: [`Briefing for ${when.label}:`, `• ${A.length} check-in${A.length === 1 ? '' : 's'}${A.length ? ': ' + A.map(b => `[${b.guest}](${bookingUrl(b.id)})`).join(', ') : ''}`, `• ${D.length} check-out${D.length === 1 ? '' : 's'}${D.length ? ': ' + D.map(b => `[${b.guest}](${bookingUrl(b.id)})`).join(', ') : ''}`, `• ${turn} same-day turnover${turn === 1 ? '' : 's'}`, `• ${S.length} guest${S.length === 1 ? '' : 's'} staying through`, `• ${canc} booking${canc === 1 ? '' : 's'} cancelled or changed in the last 2 days`, `• ${bal} arriving within 7 days with a balance due`].join('\n') };
    }
    case 'booking': {
      const b = all.find(x => x.id === intent.id);
      if (!b) return { verified: true, reply: `I don't see booking #${intent.id} in OwnerRez (searched the last year and next 18 months).` };
      const wantContact = /contact|phone|email|number|reach/.test(m);
      if (wantContact && !b.contact && b.guestId) { try { b.contact = contactOf(await get('/guests/' + b.guestId)); } catch {} }
      return { verified: true, reply: [`[Booking #${b.id}](${bookingUrl(b.id)})${b.cancelled ? ' — CANCELLED' : ''}`, `Guest: ${b.guestId ? `[${b.guest}](${guestUrl(b.guestId)})` : b.guest}`, wantContact ? `Contact: ${b.contact || 'none on file'}` : '', `Property: ${b.propertyId ? `[${b.property}](${propertyUrl(b.propertyId)})` : b.property}`, `Check-in: ${nice(b.arrival)}${b.checkIn ? ' at ' + b.checkIn : ''}`, `Check-out: ${nice(b.departure)}${b.checkOut ? ' at ' + b.checkOut : ''} (${b.nights} nights)`, `Status: ${b.status || 'unknown'}${b.updated ? ' · last updated ' + b.updated : ''}`, b.channel ? `Booked via: ${b.channel}${b.created ? ' on ' + b.created : ''}` : '', b.adults != null ? `Guests: ${b.adults} adult${b.adults === 1 ? '' : 's'}${b.children2 ? ', ' + b.children2 + ' child' + (b.children2 === 1 ? '' : 'ren') : ''}${b.infants ? ', ' + b.infants + ' infant' + (b.infants === 1 ? '' : 's') : ''}${b.pets ? ', ' + b.pets + ' pet' + (b.pets === 1 ? '' : 's') : ''}` : '', b.checkInEnd ? `Check-in window: ${b.checkIn || '?'} – ${b.checkInEnd}` : '', b.total != null ? `Total: ${money(b.total)}${b.paid != null ? ' · paid ' + money(b.paid) : ''}${b.balance != null ? ' · balance due ' + money(b.balance) : ''}` : '', b.notes ? 'Notes: ' + b.notes : ''].filter(Boolean).join('\n') };
    }
    case 'guest': {
      const q = intent.name.toLowerCase();
      const hits = all.filter(b => b.guest.toLowerCase().includes(q)).sort(by).slice(0, 15);
      if (hits.length) return { verified: true, reply: `Bookings matching "${intent.name}":\n` + hits.map(b => line(b)).join('\n') };
      // Not a guest: maybe a property name ("who is at Willow").
      const pr = ((all as any).props || []).filter((p: any) => String(p.name).toLowerCase().includes(q));
      if (pr.length) {
        const ids = new Set(pr.map((p: any) => p.id));
        const mine = active.filter(b => ids.has(b.propertyId) && b.departure >= now).sort(by).slice(0, 12);
        const here = mine.filter(b => b.arrival <= now && b.departure > now);
        return { verified: true, reply: `${pr.map((p: any) => `[${p.name}](${propertyUrl(p.id)})`).join(', ')}\n` + (here.length ? `Staying now:\n${here.map(b => line(b)).join('\n')}\n` : 'No one staying tonight.\n') + (mine.filter(b => !here.includes(b)).length ? `Upcoming:\n${mine.filter(b => !here.includes(b)).map(b => line(b)).join('\n')}` : 'No upcoming bookings in the next year.') };
      }
      return { verified: false, fallthrough: true, reply: `No bookings found for "${intent.name}".` };
    }
    case 'cancelled': {
      const recent = prop(all.filter(b => b.cancelled)).sort((a, b) => (b.updated || '').localeCompare(a.updated || '')).slice(0, 20);
      return { verified: true, reply: recent.length ? `Cancelled bookings (${recent.length}${recent.length === 20 ? ', most recent shown' : ''}):\n` + recent.map(b => line(b)).join('\n') : 'No cancelled bookings found in that period.' };
    }
    case 'arrivals': {
      const r = prop(active.filter(b => b.arrival >= when.from && b.arrival <= when.to)).sort(by);
      return { verified: true, reply: r.length ? `Check-ins ${when.label}:\n` + r.map(b => line(b)).join('\n') : `I checked OwnerRez: no active check-ins ${when.label}.` };
    }
    case 'departures': {
      const r = prop(active.filter(b => b.departure >= when.from && b.departure <= when.to)).sort((a, b) => a.departure.localeCompare(b.departure) || a.guest.localeCompare(b.guest));
      return { verified: true, reply: r.length ? `Check-outs ${when.label}:\n` + r.map(b => line(b)).join('\n') : `I checked OwnerRez: no active check-outs ${when.label}.` };
    }
    case 'staying': {
      const d = when.from;
      const r = prop(active.filter(b => b.arrival <= d && b.departure > d)).sort(by);
      return { verified: true, reply: r.length ? `Staying the night of ${nice(d)} (${r.length}):\n` + r.map(b => line(b)).join('\n') : `No active guests staying the night of ${nice(d)}.` };
    }
  }
  return { verified: false, reply: hdr('') };
}
