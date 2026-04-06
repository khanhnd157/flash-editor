# Flash Editor — Examples

Các ví dụ minh họa cách sử dụng `@flash/*` editor.

## Getting Started

```bash
# Từ root repo
pnpm install
pnpm build

# Mở ví dụ bằng bất kỳ static server nào
npx serve examples/
```

Hoặc copy trực tiếp import map nếu chạy local:

```html
<script type="importmap">
{
  "imports": {
    "@flash/core": "./node_modules/@flash/core/dist/index.js",
    "@flash/model": "./node_modules/@flash/model/dist/index.js",
    "@flash/state": "./node_modules/@flash/state/dist/index.js",
    "@flash/transform": "./node_modules/@flash/transform/dist/index.js",
    "@flash/view": "./node_modules/@flash/view/dist/index.js",
    "@flash/commands": "./node_modules/@flash/commands/dist/index.js",
    "@flash/starter-kit": "./node_modules/@flash/starter-kit/dist/index.js",
    "@flash/i18n": "./node_modules/@flash/i18n/dist/index.js",
    "@flash/locale-vi": "./node_modules/@flash/locale-vi/dist/index.js"
  }
}
</script>
```

## Examples

| Example | Description |
|---------|-------------|
| [basic/](basic/) | Minimal editor setup with StarterKit, live JSON output |
| [toolbar/](toolbar/) | Full rich-text toolbar with formatting buttons, word count |
| [custom-extension/](custom-extension/) | Build custom Callout block + Emoji inline node extensions |
| [i18n/](i18n/) | Multilingual editor — English, Vietnamese, Chinese locale switching |
| [programmatic/](programmatic/) | API playground — run commands, dry-run checks, inspect state, chain commands |

## Quick Start Code

```js
import { Editor } from '@flash/core';
import { StarterKit } from '@flash/starter-kit';

const editor = new Editor({
  element: document.getElementById('editor'),
  extensions: StarterKit(),
  onUpdate(editor) {
    console.log(editor.state.doc.toJSON());
  },
});

// Run commands
editor.command('toggleBold');
editor.command('setHeading', { level: 2 });

// Check if command is available
editor.can().command('lift');

// Chain commands
editor.chain().command('selectAll').command('toggleBold').run();

// Access state
console.log(editor.state.doc.textContent);
console.log(editor.state.selection.from, editor.state.selection.to);
```
