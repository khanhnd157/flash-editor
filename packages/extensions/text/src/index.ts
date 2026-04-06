import { NodeExtension } from '@flash/core';

export const Text = NodeExtension.create({
  name: 'text',
  nodeSpec: () => ({
    group: 'inline',
  }),
});
