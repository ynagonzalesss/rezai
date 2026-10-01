// Server-side only. Property details and listing-content checks from OwnerRez.
// The listing payload shape isn't fully documented, so field access is tolerant and
// "debug" mode shows exactly which fields OwnerRez returned.
import { OR, type Fetcher } from './bookings';

const list = (d: any): any[] => Array.isArray(d) ? d : d?.items || d?.results || d?.data || [];
const text = (v: any): string => typeof v === 'string' ? v.replace(/<[^>]+>/g, ' ').replace(/\s+\n/g, '\n').replace(/[ \t]+/g, ' ').trim() : '';
const pick = (o: any, keys: string[]) => { for (const k of keys) { const v = text(o?.[k]); if (v) return v; } return ''; };

// SOP template blocks every Airbnb/Vrbo description should carry. Edit to match the SOP.
export const REQUIRED_BLOCKS: { label: string; test: RegExp }[] = [
  { label: 'POLICIES block', test: /\bpolicies\b/i },
  { label: 'NoiseAware notice', test: /noise\s?aware/i },
  { label: 'Guest Ranger notice', test: /guest\s?ranger/i },
  { label: 'Car rental note', test: /car rental|rental car/i },
];

export const isListingQuestion = (m: string) =>
  /descri|listing|amenit|headline|house rules|rules|summary text|bedroom|bathroom|sleeps|max guests|capacity|audit|pool|hot tub|pet policy|debug fields|what.s in the property/.test(m) &&
  !/booking|check.?in|check.?out|arriv|depart|cancel|staying/.test(m);

async function load(get: Fetcher, m: string) {
  const props = list(await get('/properties?limit=100'));
  const words = (p: any) => String(p.name || p.external_name || '').toLowerCase().split(/[\s–-]+/).filter((w: string) => w.length > 3);
  const named = props.filter(p => { const n = String(p.name || p.external_name || '').toLowerCase(); const w = words(p); if (n.length > 3 && m.includes(n)) return true; if (!w.length) return false;
    if (w.slice(0, 2).every((x: string) => m.includes(x))) return true;
    return m.includes(w[0]) && props.filter(q => words(q)[0] === w[0]).length === 1; });
  return { props, named };
}

async function content(get: Fetcher, p: any) {
  let listing: any = null, source = '';
  for (const path of [`/listings?property_ids=${p.id}`, `/listings/${p.id}`, `/properties/${p.id}/listing`]) {
    try { const d = await get(path); const l = Array.isArray(list(d)) && list(d).length ? list(d)[0] : (d && !Array.isArray(d) && !d.items ? d : null); if (l) { listing = l; source = path.split('?')[0]; break; } } catch {}
  }
  let detail: any = p;
  try { detail = { ...p, ...(await get('/properties/' + p.id)) }; } catch {}
  const flat = { ...detail, ...(listing || {}) };
  const amen = (flat.amenities || flat.features || []);
  return {
    source, flat,
    name: pick(flat, ['name', 'external_name']) || 'Property ' + p.id,
    headline: pick(flat, ['headline', 'title', 'external_name', 'public_name']),
    summary: pick(flat, ['summary', 'short_description', 'shortdescription', 'tagline']),
    description: pick(flat, ['description', 'long_description', 'details', 'about', 'full_description']),
    rules: pick(flat, ['house_rules', 'rules', 'houserules']),
    amenities: Array.isArray(amen) ? amen.map((a: any) => text(typeof a === 'string' ? a : a?.name || a?.label)).filter(Boolean) : [],
  };
}

const cut = (s: string, n: number) => s.length > n ? s.slice(0, n).trimEnd() + '… (ask for "full description" to see the rest)' : s;

export async function listingAnswer(get: Fetcher, message: string): Promise<{ reply: string; verified: boolean }> {
  const m = message.toLowerCase();
  const { props, named } = await load(get, m);
  const wantAudit = /audit|check|missing|template|compliant|verify/.test(m) && /descri|listing|audit|template/.test(m);
  const full = /full|entire|whole|complete/.test(m);

  if (!named.length && wantAudit && /all|every|each|properties|listings|portfolio|audit/.test(m)) {
    const rows: string[] = []; let blocked = 0;
    for (let i = 0; i < props.length; i += 8) {
      await Promise.all(props.slice(i, i + 8).map(async p => {
        const c = await content(get, p);
        if (!c.description) { blocked++; return; }
        const miss = REQUIRED_BLOCKS.filter(b => !b.test.test(c.description + ' ' + c.summary)).map(b => b.label);
        if (miss.length) rows.push(`• [${c.name}](${OR}/properties/${p.id}/description/edit) — missing: ${miss.join(', ')}`);
      }));
    }
    if (blocked === props.length) return { verified: false, reply: noContent() };
    return { verified: true, reply: (rows.length ? `Template check across ${props.length - blocked} listings. ${rows.length} need attention:\n${rows.sort().join('\n')}` : `All ${props.length - blocked} listings contain every required template block.`) + (blocked ? `\n(${blocked} listings had no readable description.)` : '') };
  }

  if (!named.length && /(list|show|all|which|how many|overview)/.test(m) && /propert|listing|home|house|villa/.test(m) && !wantAudit) {
    return { verified: true, reply: `Properties (${props.length}):\n` + props.map(p => `• [${p.name || p.external_name}](${OR}/properties/${p.id})${p.bedrooms != null ? ` — ${p.bedrooms} bd` : ''}${p.bathrooms != null ? ` / ${p.bathrooms} ba` : ''}${p.max_guests != null ? ` — sleeps ${p.max_guests}` : ''}${p.active === false ? ' — inactive' : ''}`).join('\n') };
  }

  if (!named.length) {
    return { verified: true, reply: 'Which property? Include its name, e.g. "description for Irma Arrowhead Lakes". Properties I can see:\n' + props.slice(0, 45).map(p => `• [${p.name || p.external_name}](${OR}/properties/${p.id})`).join('\n') };
  }

  const out: string[] = []; let any = false;
  for (const p of named.slice(0, 3)) {
    const c = await content(get, p);
    if (/debug|fields|raw/.test(m)) { out.push(`${c.name} — fields returned${c.source ? ' (from ' + c.source + ')' : ''}:\n` + Object.keys(c.flat).sort().join(', ')); any = true; continue; }
    const facts = [c.flat.bedrooms != null && `${c.flat.bedrooms} bedrooms`, c.flat.bathrooms != null && `${c.flat.bathrooms} baths`, c.flat.max_guests != null && `sleeps ${c.flat.max_guests}`].filter(Boolean).join(' · ');
    const pid = String(p.id);
    const lines = [`**[${c.name}](${OR}/properties/${pid})**${facts ? ' — ' + facts : ''}`, `Open in OwnerRez: [description](${OR}/properties/${pid}/description/edit) · [amenities](${OR}/properties/${pid}/amenities) · [house rules](${OR}/properties/${pid}/houserules) · [rules](${OR}/properties/${pid}/rules)`];
    if (c.headline && c.headline !== c.name) lines.push('Headline: ' + c.headline);
    if (c.summary) lines.push('Summary: ' + cut(c.summary, full ? 5000 : 400));
    if (c.description) { any = true; lines.push('Description: ' + (full ? c.description : cut(c.description, 900))); }
    if (c.rules && /rules/.test(m)) lines.push('House rules: ' + cut(c.rules, full ? 5000 : 700));
    if (c.amenities.length && /amenit|pool|hot tub|pet/.test(m)) lines.push('Amenities: ' + c.amenities.join(', '));
    if (c.description || c.summary) {
      const miss = REQUIRED_BLOCKS.filter(b => !b.test.test(c.description + ' ' + c.summary)).map(b => b.label);
      lines.push(miss.length ? 'Template check: missing ' + miss.join(', ') : 'Template check: all required blocks present');
    } else lines.push('OwnerRez returned no description text for this property through the API.');
    out.push(lines.join('\n'));
  }
  return { verified: true, reply: out.join('\n\n') + (any || /debug|fields|raw/.test(m) ? '' : '\n\n' + noContent()) };
}

function noContent() {
  return 'OwnerRez\'s API didn\'t return listing text for this account. Say "debug fields for <property>" and I\'ll show exactly which fields come back. Descriptions are edited in OwnerRez under the property\'s Listing Content, and I can\'t read them if the API doesn\'t expose them.';
}
