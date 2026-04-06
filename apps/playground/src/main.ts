import { Editor } from '@flash/core';
import { StarterKit } from '@flash/starter-kit';
import { Toolbar, BubbleMenu, FloatingMenu, SlashCommand, LinkEditor } from '@flash/ui';
import { injectDefaultTheme } from '@flash/theme-default';
import { injectNotionTheme } from '@flash/theme-notion';
import { injectDocsTheme } from '@flash/theme-docs';
import { getTemplate } from '@flash/templates';

// ── Theme ──
injectDefaultTheme();

const container = document.getElementById('editor-container')!;

// ── Editor ──
const editor = new Editor({
  element: document.getElementById('editor')!,
  extensions: StarterKit(),
  content: {
    type: 'doc',
    content: [
      { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Welcome to Flash Playground' }] },
      { type: 'paragraph', content: [
        { type: 'text', text: 'This is an interactive playground for the ' },
        { type: 'text', marks: [{ type: 'bold' }], text: 'Flash Editor' },
        { type: 'text', text: ' engine. Try editing, formatting, and exploring!' },
      ]},
      { type: 'paragraph', content: [
        { type: 'text', text: 'Features: ' },
        { type: 'text', marks: [{ type: 'code' }], text: 'Ctrl+B' },
        { type: 'text', text: ' bold, ' },
        { type: 'text', marks: [{ type: 'code' }], text: 'Ctrl+I' },
        { type: 'text', text: ' italic, ' },
        { type: 'text', marks: [{ type: 'code' }], text: '/' },
        { type: 'text', text: ' slash commands' },
      ]},
      { type: 'paragraph' },
    ],
  },
  onUpdate: () => updateAll(),
  onTransaction: () => updateAll(),
  onCreate: () => updateAll(),
});

// ── UI Components ──
const toolbar = new Toolbar({ editor, container });
const bubbleMenu = new BubbleMenu({ editor, container });
const floatingMenu = new FloatingMenu({ editor, container });
const slashCommand = new SlashCommand({ editor, container });
const linkEditor = new LinkEditor({ editor, container });

// ── Output panel ──
let activeTab = 'json';

function updateAll() {
  toolbar.update();
  bubbleMenu.update();
  floatingMenu.update();
  slashCommand.update();
  linkEditor.update();
  updateOutput();
  updateCounts();
}

function updateOutput() {
  const el = document.getElementById('output')!;
  switch (activeTab) {
    case 'json':
      el.textContent = JSON.stringify(editor.state.doc.toJSON(), null, 2);
      break;
    case 'html':
      el.textContent = editor.state.doc.textContent;
      break;
    case 'state':
      const sel = editor.state.selection;
      el.textContent = JSON.stringify({
        selection: { anchor: sel.anchor, head: sel.head, empty: sel.empty },
        docSize: editor.state.doc.content.size,
        storedMarks: editor.state.storedMarks?.map(m => m.type.name) ?? null,
      }, null, 2);
      break;
  }
}

function updateCounts() {
  const text = editor.state.doc.textContent || '';
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  document.getElementById('word-count')!.textContent = `${words} word${words !== 1 ? 's' : ''}`;
  document.getElementById('char-count')!.textContent = `${text.length} char${text.length !== 1 ? 's' : ''}`;
}

// ── Tab switching ──
document.querySelectorAll('.tab').forEach((tab) => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach((t) => t.classList.remove('active'));
    tab.classList.add('active');
    activeTab = (tab as HTMLElement).dataset['tab']!;
    updateOutput();
  });
});

// ── Theme switcher ──
document.getElementById('theme-select')!.addEventListener('change', (e) => {
  const themeIds = ['flash-theme-default', 'flash-theme-notion', 'flash-theme-docs'];
  themeIds.forEach((id) => document.getElementById(id)?.remove());

  const inject: Record<string, () => void> = {
    default: injectDefaultTheme,
    notion: injectNotionTheme,
    docs: injectDocsTheme,
  };
  inject[(e.target as HTMLSelectElement).value]?.();
});

// ── Template loader ──
document.getElementById('template-select')!.addEventListener('change', (e) => {
  const tpl = getTemplate((e.target as HTMLSelectElement).value);
  if (!tpl) return;
  const newDoc = editor.state.schema.nodeFromJSON(tpl.content);
  const tr = editor.state.tr;
  tr.replaceWith(0, tr.doc.content.size, newDoc.content);
  editor.dispatch(tr);
  (e.target as HTMLSelectElement).value = '';
});

// ── Clear ──
document.getElementById('btn-clear')!.addEventListener('click', () => {
  const tr = editor.state.tr;
  tr.delete(0, tr.doc.content.size);
  editor.dispatch(tr);
});
