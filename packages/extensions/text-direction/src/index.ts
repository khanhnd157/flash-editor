import { Extension } from '@flash/core';
import { Plugin, PluginKey } from '@flash/state';
import { detectDirection } from '@flash/i18n';
import type { TextDirection } from '@flash/i18n';
import type { EditorState, Transaction } from '@flash/state';

export interface TextDirectionOptions {
  /** Default direction for new blocks */
  defaultDirection: TextDirection;
  /** Auto-detect direction from text content */
  autoDetect: boolean;
}

const directionKey = new PluginKey<TextDirectionState>('textDirection');

interface TextDirectionState {
  /** Map of block nodePos → detected direction */
  directions: Map<number, 'ltr' | 'rtl'>;
}

function computeDirections(state: EditorState): Map<number, 'ltr' | 'rtl'> {
  const directions = new Map<number, 'ltr' | 'rtl'>();
  state.doc.descendants((node, pos) => {
    if (node.isTextblock) {
      const text = node.textContent;
      if (text.length > 0) {
        directions.set(pos, detectDirection(text));
      }
    }
  });
  return directions;
}

export const TextDirectionExtension = (options: Partial<TextDirectionOptions> = {}) => {
  const opts: TextDirectionOptions = {
    defaultDirection: 'auto',
    autoDetect: true,
    ...options,
  };

  return Extension.create({
    name: 'textDirection',

    addCommands: () => ({
      setTextDirection: (direction: TextDirection) => {
        return (state: EditorState, dispatch?: (tr: Transaction) => void) => {
          if (!dispatch) return true;
          // Store the direction as meta on transaction for view layer to consume
          const tr = state.tr;
          tr.setMeta(directionKey, { direction });
          dispatch(tr);
          return true;
        };
      },
    }),

    addPlugins: () => [
      new Plugin<TextDirectionState>({
        key: directionKey,
        state: {
          init(_config, state) {
            return {
              directions: opts.autoDetect ? computeDirections(state) : new Map(),
            };
          },
          apply(tr, value, _oldState, newState) {
            // If doc changed and autoDetect is on, recompute
            if (tr.docChanged && opts.autoDetect) {
              return { directions: computeDirections(newState) };
            }
            return value;
          },
        },
      }),
    ],
  });
};

export { directionKey, detectDirection };
export type { TextDirection };
