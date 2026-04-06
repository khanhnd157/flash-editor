import { defineConfig } from 'vitepress';

export default defineConfig({
  title: 'Flash Editor',
  description: 'A lightweight, fast, headless rich-text editor engine',
  themeConfig: {
    logo: '/flash.svg',
    nav: [
      { text: 'Guide', link: '/guide/getting-started' },
      { text: 'API', link: '/api/' },
      { text: 'Examples', link: '/examples/' },
    ],
    sidebar: {
      '/guide/': [
        {
          text: 'Introduction',
          items: [
            { text: 'What is Flash?', link: '/guide/' },
            { text: 'Getting Started', link: '/guide/getting-started' },
            { text: 'Architecture', link: '/guide/architecture' },
          ],
        },
        {
          text: 'Core Concepts',
          items: [
            { text: 'Document Model', link: '/guide/document-model' },
            { text: 'Extensions', link: '/guide/extensions' },
            { text: 'Commands', link: '/guide/commands' },
            { text: 'Styling & Themes', link: '/guide/themes' },
          ],
        },
        {
          text: 'UI Components',
          items: [
            { text: 'Toolbar', link: '/guide/toolbar' },
            { text: 'Bubble Menu', link: '/guide/bubble-menu' },
            { text: 'Floating Menu', link: '/guide/floating-menu' },
            { text: 'Slash Commands', link: '/guide/slash-commands' },
          ],
        },
      ],
      '/api/': [
        {
          text: 'Packages',
          items: [
            { text: '@flash/core', link: '/api/' },
            { text: '@flash/model', link: '/api/model' },
            { text: '@flash/state', link: '/api/state' },
            { text: '@flash/view', link: '/api/view' },
            { text: '@flash/commands', link: '/api/commands' },
            { text: '@flash/ui', link: '/api/ui' },
          ],
        },
      ],
    },
    socialLinks: [
      { icon: 'github', link: 'https://github.com/nicekid1/MixEditor' },
    ],
    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright 2026 Flash Editor Contributors',
    },
    search: {
      provider: 'local',
    },
  },
  head: [
    ['meta', { name: 'theme-color', content: '#4361ee' }],
  ],
});
