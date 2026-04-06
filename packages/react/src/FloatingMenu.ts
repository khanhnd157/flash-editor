import { createElement, useRef, type ReactNode } from 'react';
import type { Editor } from '@flash/core';

export interface FloatingMenuProps {
  editor: Editor | null;
  children?: ReactNode;
  className?: string;
  offset?: number;
}

/**
 * Menu that appears when the cursor is on an empty block (e.g., empty paragraph).
 * Useful for showing block insertion controls.
 */
export function FloatingMenu({ editor, children, className, offset = 8 }: FloatingMenuProps): ReactNode {
  const menuRef = useRef<HTMLDivElement>(null);

  if (!editor) return null;

  const { selection } = editor.state;
  if (!selection.empty) return null;

  // Check if the current block is empty
  const $pos = selection.$anchor ?? editor.state.doc.resolve(selection.anchor);
  const parent = $pos.parent;
  if (parent.content.size !== 0) return null;

  // Get cursor position from DOM
  const domSel = typeof window !== 'undefined' ? window.getSelection() : null;
  if (!domSel || domSel.rangeCount === 0) return null;

  const range = domSel.getRangeAt(0);
  const rect = range.getBoundingClientRect();
  if (rect.height === 0) return null;

  return createElement(
    'div',
    {
      ref: menuRef,
      className,
      style: {
        position: 'fixed',
        top: `${rect.top}px`,
        left: `${rect.left - offset}px`,
        transform: 'translateX(-100%)',
        zIndex: 50,
      },
    },
    children,
  );
}
