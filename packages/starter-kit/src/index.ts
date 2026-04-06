import type { Extension } from '@flash/core';

// Node extensions
import { Document } from '@flash/extension-document';
import { Text } from '@flash/extension-text';
import { Paragraph } from '@flash/extension-paragraph';
import { Heading } from '@flash/extension-heading';
import { Blockquote } from '@flash/extension-blockquote';
import { CodeBlock } from '@flash/extension-code-block';
import { BulletList } from '@flash/extension-bullet-list';
import { OrderedList } from '@flash/extension-ordered-list';
import { ListItem } from '@flash/extension-list-item';
import { HorizontalRule } from '@flash/extension-horizontal-rule';
import { HardBreak } from '@flash/extension-hard-break';
import { Image } from '@flash/extension-image';

// Mark extensions
import { Bold } from '@flash/extension-bold';
import { Italic } from '@flash/extension-italic';
import { Strike } from '@flash/extension-strike';
import { Underline } from '@flash/extension-underline';
import { Code } from '@flash/extension-code';
import { Link } from '@flash/extension-link';
import { Highlight } from '@flash/extension-highlight';

// Re-export everything
export {
  Document, Text, Paragraph, Heading, Blockquote, CodeBlock,
  BulletList, OrderedList, ListItem, HorizontalRule, HardBreak, Image,
  Bold, Italic, Strike, Underline, Code, Link, Highlight,
};

export interface StarterKitOptions {
  document?: boolean;
  text?: boolean;
  paragraph?: boolean;
  heading?: boolean | Record<string, unknown>;
  blockquote?: boolean;
  codeBlock?: boolean | Record<string, unknown>;
  bulletList?: boolean;
  orderedList?: boolean;
  listItem?: boolean;
  horizontalRule?: boolean;
  hardBreak?: boolean;
  image?: boolean;
  bold?: boolean;
  italic?: boolean;
  strike?: boolean;
  underline?: boolean;
  code?: boolean;
  link?: boolean | Record<string, unknown>;
  highlight?: boolean | Record<string, unknown>;
}

export function StarterKit(options: StarterKitOptions = {}): Extension[] {
  const extensions: Extension[] = [];

  if (options.document !== false) extensions.push(Document);
  if (options.text !== false) extensions.push(Text);
  if (options.paragraph !== false) extensions.push(Paragraph);
  if (options.heading !== false) extensions.push(Heading);
  if (options.blockquote !== false) extensions.push(Blockquote);
  if (options.codeBlock !== false) extensions.push(CodeBlock);
  if (options.bulletList !== false) extensions.push(BulletList);
  if (options.orderedList !== false) extensions.push(OrderedList);
  if (options.listItem !== false) extensions.push(ListItem);
  if (options.horizontalRule !== false) extensions.push(HorizontalRule);
  if (options.hardBreak !== false) extensions.push(HardBreak);
  if (options.image !== false) extensions.push(Image);
  if (options.bold !== false) extensions.push(Bold);
  if (options.italic !== false) extensions.push(Italic);
  if (options.strike !== false) extensions.push(Strike);
  if (options.underline !== false) extensions.push(Underline);
  if (options.code !== false) extensions.push(Code);
  if (options.link !== false) extensions.push(Link);
  if (options.highlight !== false) extensions.push(Highlight);

  return extensions;
}
