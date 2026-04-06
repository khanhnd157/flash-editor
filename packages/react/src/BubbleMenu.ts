import { createElement, useRef, type ReactNode } from 'react';
import type { Editor } from '@flash/core';

export interface BubbleMenuProps {
  editor: Editor | null;
  children?: ReactNode;
  className?: string;
  offset?: number;
}

/**
 * Floating menu that appears above the current text selection.
 * Only visible when the selection is non-empty.
 */
export function BubbleMenu({ editor, children, className, offset = 8 }: BubbleMenuProps): ReactNode {
  const menuRef = useRef<HTMLDivElement>(null);

  if (!editor || editor.state.selection.empty) return null;

  const domSel = typeof window !== 'undefined' ? window.getSelection() : null;
  if (!domSel || domSel.rangeCount === 0) return null;

  const range = domSel.getRangeAt(0);
  const rect = range.getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0) return null;

  return createElement(
    'div',
    {
      ref: menuRef,
      className,
      style: {
        position: 'fixed',
        top: `${rect.top - offset}px`,
        left: `${rect.left + rect.width / 2}px`,
        transform: 'translate(-50%, -100%)',
        zIndex: 50,
      },
    },
    children,
  );
}
