import { NodeExtension } from '@flash/core';

export const Document = NodeExtension.create({
  name: 'doc',
  nodeSpec: () => ({
    content: 'block+',
  }),
});
