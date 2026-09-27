/**
 * This file is part of the PimBay Search Query library.
 *
 * @author Jan Sarmir <sarmir@pimbay.dev>
 * @link   https://pimbay.dev
 *
 * For the full license information, see the LICENSE file.
 */
import { SearchQueryError } from './errors.js';

export class ParsedSearchTerms {
  constructor(
    /** negation marker stripped */
    readonly equals: readonly string[],
    readonly notEquals: readonly string[],
    /** negation marker stripped, like marker kept */
    readonly likes: readonly string[],
    readonly notLikes: readonly string[],
  ) {}

  isEmpty(): boolean {
    return (
      this.equals.length === 0 && this.notEquals.length === 0 && this.likes.length === 0 && this.notLikes.length === 0
    );
  }
}

export interface SearchTermsConfig {
  /** pass-through hint for a datasource-specific package's query builder */
  readonly anywhere: boolean;
  /** counts the negation marker too, e.g. `-ab` needs minLength <= 3 */
  readonly minLength: number;
  /** every entry is an alias for the same wildcard; empty disables wildcards */
  readonly likeMarkers: readonly string[];
  /** every entry is an alias for negation; empty disables negation */
  readonly ignoreMarkers: readonly string[];
}

/** Applies defaults, then normalizes and validates. */
export function createSearchTermsConfig(overrides: Partial<SearchTermsConfig> = {}): SearchTermsConfig {
  const merged: SearchTermsConfig = {
    anywhere: true,
    minLength: 3,
    likeMarkers: ['*'],
    ignoreMarkers: ['-', '!'],
    ...overrides,
  };

  const likeMarkers = normalizeMarkers(merged.likeMarkers, 'likeMarkers');
  const ignoreMarkers = normalizeMarkers(merged.ignoreMarkers, 'ignoreMarkers');

  if (likeMarkers.some((marker) => ignoreMarkers.includes(marker))) {
    throw SearchQueryError.invalidSearchTermsConfig('likeMarkers and ignoreMarkers must not overlap');
  }

  if (merged.minLength < 0) {
    throw SearchQueryError.invalidSearchTermsConfig('minLength must be zero or greater');
  }

  return { ...merged, likeMarkers, ignoreMarkers };
}

/**
 * Longest first, so that a marker which is a prefix of another one (`-` next to `--`) never
 * shadows it — matching would otherwise depend on the order the caller happened to pass.
 */
function normalizeMarkers(markers: readonly string[], name: string): readonly string[] {
  if (markers.includes('')) {
    throw SearchQueryError.invalidSearchTermsConfig(`${name} must not contain an empty marker`);
  }

  if (new Set(markers).size !== markers.length) {
    throw SearchQueryError.invalidSearchTermsConfig(`${name} must not contain duplicates`);
  }

  return [...markers].sort((a, b) => b.length - a.length);
}

/**
 * Buckets terms by leading negation marker and embedded wildcard marker. Pure string parsing —
 * no SQL or column awareness; a datasource-specific layer turns this into actual conditions.
 */
export function parseSearchTerms(terms: readonly string[], config: SearchTermsConfig): ParsedSearchTerms {
  const equals: string[] = [];
  const notEquals: string[] = [];
  const likes: string[] = [];
  const notLikes: string[] = [];

  for (const value of terms) {
    if (value.length < config.minLength) {
      continue;
    }

    const marker = config.ignoreMarkers.find((candidate) => value.startsWith(candidate));
    const negated = marker !== undefined;
    const body = marker === undefined ? value : value.slice(marker.length);

    if (body === '') {
      continue;
    }

    const isLike = config.likeMarkers.some((candidate) => body.includes(candidate));

    if (negated && isLike) {
      notLikes.push(body);
    } else if (negated) {
      notEquals.push(body);
    } else if (isLike) {
      likes.push(body);
    } else {
      equals.push(body);
    }
  }

  return new ParsedSearchTerms(equals, notEquals, likes, notLikes);
}

export function parseSearchTermsString(text: string, config: SearchTermsConfig): ParsedSearchTerms {
  return parseSearchTerms(text.split(/\s/), config);
}
