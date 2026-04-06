// ---- Types ----

export type LocaleMessages = Record<string, string>;
export type LocaleRegistry = Record<string, LocaleMessages>;

export interface I18nConfig {
  /** Active locale key (e.g. 'en', 'vi', 'zh') */
  locale: string;
  /** Fallback locale when key missing in active locale */
  fallbackLocale?: string;
  /** Locale message registry */
  messages: LocaleRegistry;
}

export interface I18n {
  /** Translate key. Supports simple interpolation: t('hello', { name: 'World' }) */
  t(key: string, params?: Record<string, string | number>): string;
  /** Current locale */
  readonly locale: string;
  /** Change active locale */
  setLocale(locale: string): void;
  /** Merge additional messages for a locale */
  mergeMessages(locale: string, messages: LocaleMessages): void;
  /** Get all available locale keys */
  availableLocales(): string[];
}

// ---- Implementation ----

export function createI18n(config: I18nConfig): I18n {
  let currentLocale = config.locale;
  const fallbackLocale = config.fallbackLocale ?? 'en';
  const registry: LocaleRegistry = {};

  // Deep-copy initial messages
  for (const [locale, msgs] of Object.entries(config.messages)) {
    registry[locale] = { ...msgs };
  }

  function t(key: string, params?: Record<string, string | number>): string {
    // Lookup chain: current locale → fallback locale → key itself
    let value = registry[currentLocale]?.[key]
      ?? registry[fallbackLocale]?.[key]
      ?? key;

    // Simple interpolation: {name} → params.name
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        value = value.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
      }
    }

    return value;
  }

  return {
    t,
    get locale() {
      return currentLocale;
    },
    setLocale(locale: string) {
      currentLocale = locale;
    },
    mergeMessages(locale: string, messages: LocaleMessages) {
      if (!registry[locale]) {
        registry[locale] = {};
      }
      Object.assign(registry[locale], messages);
    },
    availableLocales() {
      return Object.keys(registry);
    },
  };
}

// ---- Built-in English messages ----

export const enMessages: LocaleMessages = {
  // Marks
  'bold': 'Bold',
  'italic': 'Italic',
  'underline': 'Underline',
  'strike': 'Strikethrough',
  'code': 'Code',
  'link': 'Link',
  'highlight': 'Highlight',

  // Nodes
  'paragraph': 'Paragraph',
  'heading': 'Heading',
  'heading.level': 'Heading {level}',
  'blockquote': 'Blockquote',
  'code_block': 'Code Block',
  'bullet_list': 'Bullet List',
  'ordered_list': 'Ordered List',
  'list_item': 'List Item',
  'horizontal_rule': 'Horizontal Rule',
  'hard_break': 'Hard Break',
  'image': 'Image',

  // Actions
  'undo': 'Undo',
  'redo': 'Redo',
  'copy': 'Copy',
  'cut': 'Cut',
  'paste': 'Paste',
  'select_all': 'Select All',
  'delete': 'Delete',

  // Toolbar / UI
  'toolbar.text_style': 'Text Style',
  'toolbar.align': 'Alignment',
  'toolbar.color': 'Text Color',
  'toolbar.bg_color': 'Background Color',
  'toolbar.insert': 'Insert',
  'toolbar.table': 'Table',

  // Link dialog
  'link.url': 'URL',
  'link.text': 'Text',
  'link.open_new_tab': 'Open in new tab',
  'link.apply': 'Apply',
  'link.remove': 'Remove link',

  // Image dialog
  'image.url': 'Image URL',
  'image.alt': 'Alt text',
  'image.title': 'Title',
  'image.upload': 'Upload',

  // Placeholder
  'placeholder': 'Type something…',
};

// ---- Text Direction Utilities ----

/** Detects dominant text direction of a string */
export function detectDirection(text: string): 'ltr' | 'rtl' {
  // RTL Unicode ranges: Arabic, Hebrew, Thaana, NKo, Samaritan, Mandaic, Syriac, etc.
  const rtlChars = /[\u0590-\u05FF\u0600-\u06FF\u0700-\u074F\u0750-\u077F\u0780-\u07BF\u07C0-\u07FF\u0800-\u083F\u0840-\u085F\u08A0-\u08FF\uFB1D-\uFDFF\uFE70-\uFEFF]/;
  const ltrChars = /[A-Za-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02B8\u0300-\u0590\u0900-\u1FFF\u200E\u2C00-\uFB1C\uFE00-\uFE6F\uFEFD-\uFFFF]/;

  // Count first strong directional character
  for (const ch of text) {
    if (rtlChars.test(ch)) return 'rtl';
    if (ltrChars.test(ch)) return 'ltr';
  }

  return 'ltr'; // default
}

export type TextDirection = 'ltr' | 'rtl' | 'auto';
