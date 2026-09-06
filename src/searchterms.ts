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
  /** counts the ignoreChar marker too, e.g. `-ab` needs minLength <= 3 */
  readonly minLength: number;
  readonly likeChar: string;
  readonly ignoreChar: string;
}

/** Applies defaults, then validates. */
export function createSearchTermsConfig(overrides: Partial<SearchTermsConfig> = {}): SearchTermsConfig {
  const config: SearchTermsConfig = { anywhere: true, minLength: 3, likeChar: '*', ignoreChar: '-', ...overrides };

  if (config.likeChar === '') {
    throw SearchQueryError.invalidSearchTermsConfig('likeChar must not be empty');
  }

  if (config.ignoreChar === '') {
    throw SearchQueryError.invalidSearchTermsConfig('ignoreChar must not be empty');
  }

  if (config.likeChar === config.ignoreChar) {
    throw SearchQueryError.invalidSearchTermsConfig('likeChar and ignoreChar must differ');
  }

  if (config.minLength < 0) {
    throw SearchQueryError.invalidSearchTermsConfig('minLength must be zero or greater');
  }

  return config;
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

    const negated = value.startsWith(config.ignoreChar);
    const body = negated ? value.slice(config.ignoreChar.length) : value;

    if (body === '') {
      continue;
    }

    const isLike = body.includes(config.likeChar);

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
