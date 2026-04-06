# Getting Started

## Installation

```bash
pnpm add @flash/core @flash/starter-kit
```

For UI components and themes:

```bash
pnpm add @flash/ui @flash/theme-default
```

## Basic Setup

```html
<div id="editor"></div>
```

```typescript
import { Editor } from '@flash/core';
import { StarterKit } from '@flash/starter-kit';
import { injectDefaultTheme } from '@flash/theme-default';

// Inject the default theme CSS
injectDefaultTheme();

// Create the editor
const editor = new Editor({
  element: document.getElementById('editor'),
  extensions: StarterKit(),
  content: '<p>Start typing...</p>',
  onUpdate(editor) {
    console.log('Document changed:', editor.state.doc.toJSON());
  },
});
```

## Adding a Toolbar

```typescript
import { Toolbar, BubbleMenu } from '@flash/ui';

const container = document.getElementById('editor-container');

const toolbar = new Toolbar({ editor, container });
const bubbleMenu = new BubbleMenu({ editor, container });

// Update UI state on every transaction
editor.onTransaction = () => {
  toolbar.update();
  bubbleMenu.update();
};
```

## Using Themes

Flash ships with three themes. Import and inject the one you want:

```typescript
import { injectDefaultTheme } from '@flash/theme-default';
import { injectNotionTheme } from '@flash/theme-notion';
import { injectDocsTheme } from '@flash/theme-docs';

// Choose one:
injectDefaultTheme();
// injectNotionTheme();
// injectDocsTheme();
```

All themes use CSS custom properties (`--flash-*`), so you can override individual tokens.

## Document Templates

```typescript
import { getTemplate } from '@flash/templates';

const blog = getTemplate('blog-post');
if (blog) {
  // Load template content into editor
  const newDoc = editor.state.schema.nodeFromJSON(blog.content);
  const tr = editor.state.tr.replaceWith(0, tr.doc.content.size, newDoc.content);
  editor.dispatch(tr);
}
```

Available templates: `blog-post`, `meeting-notes`, `email`, `resume`.
