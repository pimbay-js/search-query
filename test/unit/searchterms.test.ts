import { describe, it, expect } from 'vitest';
import {
  ParsedSearchTerms,
  createSearchTermsConfig,
  parseSearchTerms,
  parseSearchTermsString,
} from '../../src/searchterms.js';
import { SearchQueryError } from '../../src/errors.js';

describe('ParsedSearchTerms', () => {
  it('getters reflect constructor arguments', () => {
    const parsed = new ParsedSearchTerms(['dog'], ['cow'], ['hors*'], ['shee*']);

    expect(parsed.equals).toEqual(['dog']);
    expect(parsed.notEquals).toEqual(['cow']);
    expect(parsed.likes).toEqual(['hors*']);
    expect(parsed.notLikes).toEqual(['shee*']);
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
  it.each([
    ['no overrides', {}, { anywhere: true, minLength: 3, likeChar: '*', ignoreChar: '-' }],
    ['partial overrides', { minLength: 1 }, { anywhere: true, minLength: 1, likeChar: '*', ignoreChar: '-' }],
    [
      'zero is the smallest valid minLength',
      { minLength: 0 },
      { anywhere: true, minLength: 0, likeChar: '*', ignoreChar: '-' },
    ],
  ] as const)('applies defaults on top of overrides — %s', (_name, overrides, expected) => {
    expect(createSearchTermsConfig(overrides)).toEqual(expected);
  });

  it.each([
    ['empty likeChar', { likeChar: '' }, 'Invalid SearchTermsConfig: likeChar must not be empty.'],
    ['empty ignoreChar', { ignoreChar: '' }, 'Invalid SearchTermsConfig: ignoreChar must not be empty.'],
    [
      'same likeChar and ignoreChar',
      { likeChar: '*', ignoreChar: '*' },
      'Invalid SearchTermsConfig: likeChar and ignoreChar must differ.',
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
    ['equals term', 'pes', ['pes'], [], [], []],
    ['like term', 'pes*', [], [], ['pes*'], []],
    ['negated equals term', '-pes', [], ['pes'], [], []],
    ['negated like term', '-pes*', [], [], [], ['pes*']],
  ] as const)(
    'buckets a single term — %s',
    (_name, term, expectedEquals, expectedNotEquals, expectedLikes, expectedNotLikes) => {
      const result = parseSearchTerms([term], config);

      expect(result.equals).toEqual(expectedEquals);
      expect(result.notEquals).toEqual(expectedNotEquals);
      expect(result.likes).toEqual(expectedLikes);
      expect(result.notLikes).toEqual(expectedNotLikes);
    },
  );

  it('skips terms shorter than minLength', () => {
    const result = parseSearchTerms(['ab', 'abc'], createSearchTermsConfig({ minLength: 3 }));

    expect(result.equals).toEqual(['abc']);
  });

  it('counts the negation marker towards minLength', () => {
    const result = parseSearchTerms(['-ab'], createSearchTermsConfig({ minLength: 3 }));

    expect(result.notEquals).toEqual(['ab']);
  });

  it('supports multi-character markers', () => {
    const result = parseSearchTerms(['!!pes%%'], createSearchTermsConfig({ likeChar: '%%', ignoreChar: '!!' }));

    expect(result.notLikes).toEqual(['pes%%']);
  });

  it.each([
    ['no terms at all', []],
    ['a term that is nothing but the negation marker', ['-']],
    ['a bare empty term', ['']],
  ] as const)('produces an empty result — %s', (_name, terms) => {
    expect(parseSearchTerms(terms, createSearchTermsConfig({ minLength: 0 })).isEmpty()).toBe(true);
  });

  it.each(['pes', '-pes', 'pes*', '-pes*'])('isEmpty is false when exactly one bucket is populated — %s', (term) => {
    expect(parseSearchTerms([term], config).isEmpty()).toBe(false);
  });

  it('buckets mixed terms independently', () => {
    const result = parseSearchTerms(['dog', 'hors*', '-cow', '-shee*'], config);

    expect(result.equals).toEqual(['dog']);
    expect(result.likes).toEqual(['hors*']);
    expect(result.notEquals).toEqual(['cow']);
    expect(result.notLikes).toEqual(['shee*']);
    expect(result.isEmpty()).toBe(false);
  });
});

describe('parseSearchTermsString', () => {
  const config = createSearchTermsConfig();

  it.each([
    ['simple whitespace', 'dog hors* -cow', ['dog'], ['cow'], ['hors*']],
    ['repeated and mixed whitespace', ' dog \t  hors* \n -cow ', ['dog'], ['cow'], ['hors*']],
  ] as const)('splits on whitespace — %s', (_name, text, expectedEquals, expectedNotEquals, expectedLikes) => {
    const result = parseSearchTermsString(text, config);

    expect(result.equals).toEqual(expectedEquals);
    expect(result.notEquals).toEqual(expectedNotEquals);
    expect(result.likes).toEqual(expectedLikes);
  });

  describe.each([
    ['default config', config],
    ['minLength: 0', createSearchTermsConfig({ minLength: 0 })],
  ] as const)('blank input produces an empty result — %s', (_label, cfg) => {
    it.each(['', '   \t\n  '])('%j', (text) => {
      expect(parseSearchTermsString(text, cfg).isEmpty()).toBe(true);
    });
  });

  it('keeps "0" as a valid term', () => {
    const result = parseSearchTermsString('0 dog', createSearchTermsConfig({ minLength: 1 }));

    expect(result.equals).toEqual(['0', 'dog']);
  });

  it('behaves like parseSearchTerms on pre-split terms', () => {
    const viaString = parseSearchTermsString('dog hors* -cow -shee*', config);
    const viaArray = parseSearchTerms(['dog', 'hors*', '-cow', '-shee*'], config);

    expect(viaString).toEqual(viaArray);
  });
});
