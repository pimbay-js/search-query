import { describe, it, expect } from 'vitest';
import {
  ParsedSearchTerms,
  createSearchTermsConfig,
  parseSearchTerms,
  parseSearchTermsString,
} from '../../src/searchterms.js';
import { SearchQueryError } from '../../src/errors.js';

describe('ParsedSearchTerms', () => {
  const parsed = new ParsedSearchTerms(['dog'], ['cow'], ['hors*'], ['shee*']);

  it.each([
    ['equals', ['dog']],
    ['notEquals', ['cow']],
    ['likes', ['hors*']],
    ['notLikes', ['shee*']],
  ] as const)('exposes the %s bucket as constructed', (bucket, expected) => {
    expect(parsed[bucket]).toEqual(expected);
  });

  it.each([
    ['all buckets empty', [], [], [], [], true],
    ['equals populated', ['dog'], [], [], [], false],
    ['notEquals populated', [], ['cow'], [], [], false],
    ['likes populated', [], [], ['hors*'], [], false],
    ['notLikes populated', [], [], [], ['shee*'], false],
  ] as const)('isEmpty — %s', (_name, equals, notEquals, likes, notLikes, expected) => {
    expect(new ParsedSearchTerms(equals, notEquals, likes, notLikes).isEmpty()).toBe(expected);
  });
});

describe('createSearchTermsConfig', () => {
  const defaults = { anywhere: true, minLength: 3, likeMarkers: ['*'], ignoreMarkers: ['-', '!'] };

  it.each([
    ['no overrides', {}, defaults],
    ['partial overrides', { minLength: 1 }, { ...defaults, minLength: 1 }],
    ['zero is the smallest valid minLength', { minLength: 0 }, { ...defaults, minLength: 0 }],
  ] as const)('applies defaults on top of overrides — %s', (_name, overrides, expected) => {
    expect(createSearchTermsConfig(overrides)).toEqual(expected);
  });

  it.each([
    ['a prefix never shadows a longer marker', { ignoreMarkers: ['-', '--'] }, 'ignoreMarkers', ['--', '-']],
    ['several lengths sort descending', { likeMarkers: ['*', '***', '**'] }, 'likeMarkers', ['***', '**', '*']],
    ['equal-length markers keep their given order', { ignoreMarkers: ['!', '-'] }, 'ignoreMarkers', ['!', '-']],
  ] as const)('normalizes markers longest first — %s', (_name, overrides, bucket, expected) => {
    expect(createSearchTermsConfig(overrides)[bucket]).toEqual(expected);
  });

  it.each([
    [
      'empty likeMarkers marker',
      { likeMarkers: [''] },
      'Invalid SearchTermsConfig: likeMarkers must not contain an empty marker.',
    ],
    [
      'empty ignoreMarkers marker',
      { ignoreMarkers: [''] },
      'Invalid SearchTermsConfig: ignoreMarkers must not contain an empty marker.',
    ],
    [
      'duplicate likeMarkers marker',
      { likeMarkers: ['*', '*'] },
      'Invalid SearchTermsConfig: likeMarkers must not contain duplicates.',
    ],
    [
      'duplicate ignoreMarkers marker',
      { ignoreMarkers: ['-', '-'] },
      'Invalid SearchTermsConfig: ignoreMarkers must not contain duplicates.',
    ],
    [
      'overlapping likeMarkers and ignoreMarkers',
      { likeMarkers: ['*'], ignoreMarkers: ['-', '*'] },
      'Invalid SearchTermsConfig: likeMarkers and ignoreMarkers must not overlap.',
    ],
    ['negative minLength', { minLength: -1 }, 'Invalid SearchTermsConfig: minLength must be zero or greater.'],
  ] as const)('rejects invalid values — %s', (_name, overrides, expectedMessage) => {
    expect(() => createSearchTermsConfig(overrides)).toThrow(SearchQueryError);
    expect(() => createSearchTermsConfig(overrides)).toThrow(expectedMessage);
  });
});

describe('parseSearchTerms', () => {
  const config = createSearchTermsConfig();

  it.each([
    ['an equals term', {}, ['pes'], ['pes'], [], [], []],
    ['a like term', {}, ['pes*'], [], [], ['pes*'], []],
    ['a negated equals term', {}, ['-pes'], [], ['pes'], [], []],
    ['a negated like term', {}, ['-pes*'], [], [], [], ['pes*']],
    ['a term negated by the bang alias', {}, ['!pes'], [], ['pes'], [], []],
    [
      'every like marker as the same wildcard',
      { likeMarkers: ['*', '%'] },
      ['pes*', 'mac%'],
      [],
      [],
      ['pes*', 'mac%'],
      [],
    ],
    ['the longest negation marker over its prefix', { ignoreMarkers: ['-', '--'] }, ['--pes'], [], ['pes'], [], []],
    ['multi-character markers', { likeMarkers: ['%%'], ignoreMarkers: ['!!'] }, ['!!pes%%'], [], [], [], ['pes%%']],
    [
      'a leading dash as part of the term when ignoreMarkers is empty',
      { minLength: 0, ignoreMarkers: [] },
      ['-5'],
      ['-5'],
      [],
      [],
      [],
    ],
    ['a star as part of the term when likeMarkers is empty', { likeMarkers: [] }, ['pes*'], ['pes*'], [], [], []],
    ['only the terms reaching minLength', { minLength: 3 }, ['ab', 'abc'], ['abc'], [], [], []],
    ['the negation marker towards minLength', { minLength: 3 }, ['-ab'], [], ['ab'], [], []],
    ['mixed terms independently', {}, ['dog', 'hors*', '-cow', '-shee*'], ['dog'], ['cow'], ['hors*'], ['shee*']],
  ] as const)(
    'buckets %s',
    (_name, overrides, terms, expectedEquals, expectedNotEquals, expectedLikes, expectedNotLikes) => {
      const result = parseSearchTerms(terms, createSearchTermsConfig(overrides));

      expect(result.equals).toEqual(expectedEquals);
      expect(result.notEquals).toEqual(expectedNotEquals);
      expect(result.likes).toEqual(expectedLikes);
      expect(result.notLikes).toEqual(expectedNotLikes);
    },
  );

  it.each([
    ['no terms at all', []],
    ['a term that is nothing but the dash negation marker', ['-']],
    ['a term that is nothing but the bang negation marker', ['!']],
    ['a bare empty term', ['']],
  ] as const)('produces an empty result — %s', (_name, terms) => {
    expect(parseSearchTerms(terms, createSearchTermsConfig({ minLength: 0 })).isEmpty()).toBe(true);
  });

  it.each(['pes', '-pes', 'pes*', '-pes*'])('isEmpty is false when exactly one bucket is populated — %s', (term) => {
    expect(parseSearchTerms([term], config).isEmpty()).toBe(false);
  });
});

describe('parseSearchTermsString', () => {
  const config = createSearchTermsConfig();

  it.each([
    ['simple whitespace', {}, 'dog hors* -cow', ['dog'], ['cow'], ['hors*']],
    ['repeated and mixed whitespace', {}, ' dog \t  hors* \n -cow ', ['dog'], ['cow'], ['hors*']],
    ['"0" as a valid term', { minLength: 1 }, '0 dog', ['0', 'dog'], [], []],
  ] as const)(
    'splits a raw input string — %s',
    (_name, overrides, text, expectedEquals, expectedNotEquals, expectedLikes) => {
      const result = parseSearchTermsString(text, createSearchTermsConfig(overrides));

      expect(result.equals).toEqual(expectedEquals);
      expect(result.notEquals).toEqual(expectedNotEquals);
      expect(result.likes).toEqual(expectedLikes);
    },
  );

  describe.each([
    ['default config', config],
    ['minLength: 0', createSearchTermsConfig({ minLength: 0 })],
  ] as const)('blank input produces an empty result — %s', (_label, cfg) => {
    it.each(['', '   \t\n  '])('%j', (text) => {
      expect(parseSearchTermsString(text, cfg).isEmpty()).toBe(true);
    });
  });

  it.each([
    ['multiple mixed terms', 'dog hors* -cow -shee*', ['dog', 'hors*', '-cow', '-shee*']],
    ['a single term', 'dog', ['dog']],
  ] as const)('behaves like parseSearchTerms on pre-split terms — %s', (_name, text, terms) => {
    expect(parseSearchTermsString(text, config)).toEqual(parseSearchTerms(terms, config));
  });
});
