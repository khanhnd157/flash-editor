import { MarkExtension } from '@flash/core';
import { toggleMark } from '@flash/commands';

export interface LinkAttrs {
  href: string;
  target?: string;
  rel?: string;
}

export const Link = MarkExtension.create({
  name: 'link',
  markSpec: () => ({
    attrs: {
      href: { default: '' },
      target: { default: '_blank' },
      rel: { default: 'noopener noreferrer' },
    },
    inclusive: false,
    parseDOM: [{
      tag: 'a[href]',
      getAttrs: (el) => ({
        href: (el as HTMLAnchorElement).getAttribute('href'),
        target: (el as HTMLAnchorElement).getAttribute('target'),
        rel: (el as HTMLAnchorElement).getAttribute('rel'),
      }),
    }],
    toDOM: (mark) => ['a', {
      href: mark.attrs.href as string,
      target: mark.attrs.target as string,
      rel: mark.attrs.rel as string,
    }, 0],
  }),
  addCommands: () => ({
    setLink: (attrs: unknown) =>
      (state, dispatch) => {
        const linkType = state.schema.marks['link'];
        if (!linkType) return false;
        const { from, to, empty } = state.selection;
        if (empty) return false;
        if (!dispatch) return true;
        dispatch(state.tr.addMark(from, to, linkType.create(attrs as Record<string, unknown>)));
        return true;
      },
    unsetLink: () =>
      (state, dispatch) => {
        const linkType = state.schema.marks['link'];
        if (!linkType) return false;
        const { from, to, empty } = state.selection;
        if (empty) return false;
        if (!dispatch) return true;
        dispatch(state.tr.removeMark(from, to, linkType));
        return true;
      },
    toggleLink: (attrs: unknown) =>
      (state, dispatch) => {
        const linkType = state.schema.marks['link'];
        if (!linkType) return false;
        return toggleMark(linkType, attrs as Record<string, unknown>)(state, dispatch);
      },
  }),
});
