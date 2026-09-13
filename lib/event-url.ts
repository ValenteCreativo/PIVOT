// Target-event resolution helpers.
//
// PIVOT must resolve the SPECIFIC target event before doing broad research,
// so that event-specific facts (sponsors, prizes, tracks) are only established
// from that event's own first-party pages — never from other events run by the
// same organizer. This module is pure and independently testable so the
// retrieval/evidence logic can be verified without any paid inference.

export type EventIdentity = {
  /** Hostname without a leading www. e.g. "ethglobal.com" */
  host: string;
  /** The event collection prefix on this host, e.g. "/events" (empty if none). */
  collection: string;
  /** The event slug, e.g. "ethonline2026" (empty if the URL is organizer-general). */
  slug: string;
  /** Canonical path that identifies the event, e.g. "/events/ethonline2026". */
  eventPath: string;
  /** Canonical base URL for the event, e.g. "https://ethglobal.com/events/ethonline2026". */
  baseEventUrl: string;
  /** Human label derived from the slug, e.g. "ETHOnline 2026". */
  label: string;
};

export type EvidenceClass =
  | 'TARGET_EVENT_FIRST_PARTY'
  | 'ORGANIZER_GENERAL'
  | 'OTHER_EVENT'
  | 'THIRD_PARTY_RELEVANT'
  | 'UNRELATED';

// Hosts that publish many events under a shared collection path. Used only as
// optional hints for slug detection and first-party page discovery — generic
// same-event logic runs regardless of whether a host is recognized here.
const KNOWN_EVENT_COLLECTIONS: { match: RegExp; collection: string }[] = [
  { match: /(^|\.)ethglobal\.com$/i, collection: '/events' },
  { match: /(^|\.)devpost\.com$/i, collection: '' },
  { match: /(^|\.)dorahacks\.io$/i, collection: '/hackathon' },
  { match: /(^|\.)devfolio\.co$/i, collection: '' },
];

function stripWww(host: string) {
  return host.replace(/^www\./i, '').toLowerCase();
}

/** Humanize a slug: "ethonline2026" -> "ETHOnline 2026"; "eth-denver-2025" -> "Eth Denver 2025". */
export function humanizeSlug(slug: string): string {
  if (!slug) return '';
  const spaced = slug
    .replace(/[-_]+/g, ' ')
    .replace(/([a-z])([0-9])/gi, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim();
  return spaced
    .split(' ')
    .map((word) => {
      if (/^eth/i.test(word) && word.length > 3) {
        // "ethonline" -> "ETHOnline", "ethglobal" -> "ETHGlobal"
        return `ETH${word.slice(3, 4).toUpperCase()}${word.slice(4)}`;
      }
      if (/^eth$/i.test(word)) return 'ETH';
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
}

/**
 * Resolve a user-supplied event URL into a canonical event identity.
 * Returns null when the input is empty or not a parseable http(s) URL.
 */
export function canonicalizeEventUrl(rawUrl?: string): EventIdentity | null {
  if (!rawUrl) return null;
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return null;
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;

  const host = stripWww(url.hostname);
  const segments = url.pathname.split('/').filter(Boolean);

  const known = KNOWN_EVENT_COLLECTIONS.find((c) => c.match.test(host));
  let collection = '';
  let slug = '';

  if (known && known.collection) {
    // e.g. /events/<slug> — the segment after the known collection prefix.
    const prefix = known.collection.replace(/^\//, '');
    const idx = segments.findIndex((s) => s.toLowerCase() === prefix);
    if (idx >= 0 && segments[idx + 1]) {
      collection = known.collection;
      slug = segments[idx + 1];
    }
  }

  if (!slug) {
    // Generic detection: look for a "/events|hackathons|event|hackathon/<slug>" pair.
    const collectionWords = ['events', 'event', 'hackathons', 'hackathon', 'e'];
    const idx = segments.findIndex((s) => collectionWords.includes(s.toLowerCase()));
    if (idx >= 0 && segments[idx + 1]) {
      collection = `/${segments[idx].toLowerCase()}`;
      slug = segments[idx + 1];
    } else if (segments.length === 1) {
      // A single meaningful path segment is treated as the event slug (e.g. Devpost).
      slug = segments[0];
    }
  }

  slug = slug ? decodeURIComponent(slug).toLowerCase() : '';
  const eventPath = slug ? `${collection}/${slug}`.replace(/\/{2,}/g, '/') : '';
  const baseEventUrl = eventPath ? `https://${host}${eventPath}` : `https://${host}`;

  return {
    host,
    collection,
    slug,
    eventPath,
    baseEventUrl,
    label: humanizeSlug(slug),
  };
}

/** Extract the event slug from an arbitrary result URL on the same host, if any. */
function slugOnHost(resultUrl: string, identity: EventIdentity): string | null {
  let u: URL;
  try {
    u = new URL(resultUrl);
  } catch {
    return null;
  }
  if (stripWww(u.hostname) !== identity.host) return null;
  const segments = u.pathname.split('/').filter(Boolean);
  if (identity.collection) {
    const prefix = identity.collection.replace(/^\//, '').toLowerCase();
    const idx = segments.findIndex((s) => s.toLowerCase() === prefix);
    if (idx >= 0 && segments[idx + 1]) return decodeURIComponent(segments[idx + 1]).toLowerCase();
    return ''; // same host, inside/at collection root but no specific event
  }
  return segments[0] ? decodeURIComponent(segments[0]).toLowerCase() : '';
}

/**
 * Classify a piece of evidence relative to the resolved target event.
 * Only TARGET_EVENT_FIRST_PARTY may establish event-specific facts.
 */
export function classifyEvidence(resultUrl: string, identity: EventIdentity | null): EvidenceClass {
  if (!identity) return 'THIRD_PARTY_RELEVANT';
  let u: URL;
  try {
    u = new URL(resultUrl);
  } catch {
    return 'UNRELATED';
  }
  const host = stripWww(u.hostname);
  const sameHost = host === identity.host || host.endsWith(`.${identity.host}`);

  if (!sameHost) return 'THIRD_PARTY_RELEVANT';

  // No event slug was resolvable from the input URL: the whole organizer host
  // is the target, so same-host pages are first-party (backward compatible).
  if (!identity.slug) return 'TARGET_EVENT_FIRST_PARTY';

  const resultSlug = slugOnHost(resultUrl, identity);
  if (resultSlug === identity.slug) return 'TARGET_EVENT_FIRST_PARTY';
  if (resultSlug && resultSlug !== identity.slug) return 'OTHER_EVENT';
  // Same host, but an organizer-general page (no specific event in the path).
  return 'ORGANIZER_GENERAL';
}

/** Only target-event first-party evidence may establish event-specific facts. */
export function establishesEventFacts(evidenceClass: EvidenceClass): boolean {
  return evidenceClass === 'TARGET_EVENT_FIRST_PARTY';
}
