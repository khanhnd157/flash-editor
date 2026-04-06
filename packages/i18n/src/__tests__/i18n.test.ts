import { describe, it, expect } from 'vitest';
import { createI18n, enMessages, detectDirection } from '../index';

describe('createI18n', () => {
  it('translates a key from active locale', () => {
    const i18n = createI18n({
      locale: 'en',
      messages: { en: enMessages },
    });
    expect(i18n.t('bold')).toBe('Bold');
    expect(i18n.t('italic')).toBe('Italic');
  });

  it('falls back to fallback locale when key missing', () => {
    const i18n = createI18n({
      locale: 'vi',
      fallbackLocale: 'en',
      messages: {
        en: { bold: 'Bold', italic: 'Italic' },
        vi: { bold: 'Đậm' },
      },
    });
    expect(i18n.t('bold')).toBe('Đậm');
    expect(i18n.t('italic')).toBe('Italic'); // fallback to en
  });

  it('returns key itself when not found in any locale', () => {
    const i18n = createI18n({
      locale: 'en',
      messages: { en: {} },
    });
    expect(i18n.t('nonexistent.key')).toBe('nonexistent.key');
  });

  it('interpolates params with {key} syntax', () => {
    const i18n = createI18n({
      locale: 'en',
      messages: { en: { 'heading.level': 'Heading {level}' } },
    });
    expect(i18n.t('heading.level', { level: 2 })).toBe('Heading 2');
  });

  it('interpolates multiple params', () => {
    const i18n = createI18n({
      locale: 'en',
      messages: { en: { greeting: 'Hello {name}, welcome to {app}!' } },
    });
    expect(i18n.t('greeting', { name: 'Alice', app: 'Flash' })).toBe(
      'Hello Alice, welcome to Flash!',
    );
  });

  it('replaces all occurrences of same param', () => {
    const i18n = createI18n({
      locale: 'en',
      messages: { en: { msg: '{x} and {x}' } },
    });
    expect(i18n.t('msg', { x: 'A' })).toBe('A and A');
  });

  it('setLocale switches active locale', () => {
    const i18n = createI18n({
      locale: 'en',
      messages: {
        en: { bold: 'Bold' },
        vi: { bold: 'Đậm' },
      },
    });
    expect(i18n.t('bold')).toBe('Bold');
    i18n.setLocale('vi');
    expect(i18n.locale).toBe('vi');
    expect(i18n.t('bold')).toBe('Đậm');
  });

  it('mergeMessages adds keys to existing locale', () => {
    const i18n = createI18n({
      locale: 'en',
      messages: { en: { bold: 'Bold' } },
    });
    i18n.mergeMessages('en', { italic: 'Italic', underline: 'Underline' });
    expect(i18n.t('italic')).toBe('Italic');
    expect(i18n.t('underline')).toBe('Underline');
    expect(i18n.t('bold')).toBe('Bold'); // original preserved
  });

  it('mergeMessages creates new locale if not exists', () => {
    const i18n = createI18n({
      locale: 'en',
      messages: { en: { bold: 'Bold' } },
    });
    i18n.mergeMessages('fr', { bold: 'Gras' });
    i18n.setLocale('fr');
    expect(i18n.t('bold')).toBe('Gras');
  });

  it('availableLocales returns all locale keys', () => {
    const i18n = createI18n({
      locale: 'en',
      messages: { en: {}, vi: {}, zh: {} },
    });
    expect(i18n.availableLocales().sort()).toEqual(['en', 'vi', 'zh']);
  });

  it('does not mutate original messages object', () => {
    const original = { bold: 'Bold' };
    const i18n = createI18n({
      locale: 'en',
      messages: { en: original },
    });
    i18n.mergeMessages('en', { italic: 'Italic' });
    expect(original).toEqual({ bold: 'Bold' }); // not modified
  });
});

describe('detectDirection', () => {
  it('detects LTR for English text', () => {
    expect(detectDirection('Hello world')).toBe('ltr');
  });

  it('detects RTL for Arabic text', () => {
    expect(detectDirection('مرحبا بالعالم')).toBe('rtl');
  });

  it('detects RTL for Hebrew text', () => {
    expect(detectDirection('שלום עולם')).toBe('rtl');
  });

  it('detects LTR for Chinese text', () => {
    // Chinese characters are in the CJK range which falls into LTR
    expect(detectDirection('你好世界')).toBe('ltr');
  });

  it('detects based on first strong directional char', () => {
    // Starts with Arabic then English
    expect(detectDirection('مرحبا hello')).toBe('rtl');
    // Starts with English then Arabic
    expect(detectDirection('hello مرحبا')).toBe('ltr');
  });

  it('defaults to LTR for empty string', () => {
    expect(detectDirection('')).toBe('ltr');
  });

  it('defaults to LTR for numbers-only', () => {
    expect(detectDirection('12345')).toBe('ltr');
  });

  it('detects LTR for Vietnamese text', () => {
    expect(detectDirection('Xin chào thế giới')).toBe('ltr');
  });
});

describe('enMessages', () => {
  it('has all expected mark keys', () => {
    expect(enMessages['bold']).toBe('Bold');
    expect(enMessages['italic']).toBe('Italic');
    expect(enMessages['strike']).toBe('Strikethrough');
    expect(enMessages['code']).toBe('Code');
    expect(enMessages['link']).toBe('Link');
  });

  it('has all expected node keys', () => {
    expect(enMessages['paragraph']).toBe('Paragraph');
    expect(enMessages['heading']).toBe('Heading');
    expect(enMessages['blockquote']).toBe('Blockquote');
    expect(enMessages['code_block']).toBe('Code Block');
  });

  it('has action keys', () => {
    expect(enMessages['undo']).toBe('Undo');
    expect(enMessages['redo']).toBe('Redo');
  });

  it('has placeholder', () => {
    expect(enMessages['placeholder']).toBe('Type something…');
  });
});
