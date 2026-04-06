import { createContext, useContext } from 'react';
import type { Editor } from '@flash/core';

export const EditorContext = createContext<Editor | null>(null);

export function useCurrentEditor(): Editor | null {
  return useContext(EditorContext);
}
