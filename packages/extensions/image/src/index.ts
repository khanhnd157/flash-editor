import { NodeExtension } from '@flash/core';

export interface ImageAttrs {
  src: string;
  alt?: string;
  title?: string;
}

export const Image = NodeExtension.create({
  name: 'image',
  nodeSpec: () => ({
    inline: true,
    group: 'inline',
    draggable: true,
    atom: true,
    attrs: {
      src: { default: '' },
      alt: { default: null },
      title: { default: null },
    },
    parseDOM: [{
      tag: 'img[src]',
      getAttrs: (el) => ({
        src: (el as HTMLImageElement).getAttribute('src'),
        alt: (el as HTMLImageElement).getAttribute('alt'),
        title: (el as HTMLImageElement).getAttribute('title'),
      }),
    }],
    toDOM: (node) => ['img', {
      src: node.attrs.src as string,
      alt: node.attrs.alt as string | undefined,
      title: node.attrs.title as string | undefined,
    }],
  }),
  addCommands: () => ({
    setImage: (attrs: unknown) =>
      (state, dispatch) => {
        const imageType = state.schema.nodes['image'];
        if (!imageType) return false;
        if (!dispatch) return true;
        const { from, to } = state.selection;
        const tr = state.tr;
        if (from !== to) tr.delete(from, to);
        tr.insert(from, imageType.create(attrs as Record<string, unknown>));
        dispatch(tr);
        return true;
      },
  }),
});
