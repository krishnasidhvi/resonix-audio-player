import type { License } from './types';

/** Turn a Creative Commons / public-domain URL or short code into a readable label. */
export function licenseFromUrl(url?: string | null): License | undefined {
  if (!url) return undefined;
  const u = url.toLowerCase();
  if (u.includes('publicdomain/zero')) return { name: 'CC0 (public domain)', url };
  if (u.includes('publicdomain/mark') || u.includes('publicdomain')) return { name: 'Public domain', url };
  const m = u.match(/licenses\/([a-z-]+)\/(\d\.\d)/);
  if (m) return { name: `CC ${m[1].toUpperCase()} ${m[2]}`, url };
  if (u.includes('creativecommons')) return { name: 'Creative Commons', url };
  return { name: 'See source', url };
}

export function licenseFromCode(code: string, version?: string, url?: string): License {
  const c = code.toLowerCase();
  if (c === 'cc0') return { name: 'CC0 (public domain)', url };
  if (c === 'pdm') return { name: 'Public domain', url };
  return { name: `CC ${c.toUpperCase()}${version ? ' ' + version : ''}`, url };
}

/** True for licences that are accepted as "open" for the Internet Archive filter. */
export const OPEN_LICENSE_QUERY = 'licenseurl:(*creativecommons.org* OR *publicdomain*)';
