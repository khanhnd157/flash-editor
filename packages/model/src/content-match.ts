import type { Schema, NodeType } from './schema';
import type { Node } from './node';
import { Fragment } from './fragment';

/**
 * ContentMatch represents a position in a DFA (deterministic finite automaton)
 * that validates content expressions. Each match state can transition to another
 * state by matching a node type.
 */
export class ContentMatch {
  private constructor(
    readonly validEnd: boolean,
    private readonly transitions: Array<{ type: NodeType; next: ContentMatch }>,
  ) {}

  matchType(type: NodeType): ContentMatch | null {
    for (const t of this.transitions) {
      if (t.type === type) return t.next;
    }
    return null;
  }

  matchFragment(
    frag: Fragment,
    start: number = 0,
    end: number = frag.childCount,
  ): ContentMatch | null {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    let cur: ContentMatch | null = this;
    for (let i = start; cur !== null && i < end; i++) {
      cur = cur.matchType(frag.child(i).type);
    }
    return cur;
  }

  get inlineContent(): boolean {
    if (this.transitions.length === 0) return false;
    return this.transitions[0].type.isInline;
  }

  get defaultType(): NodeType | null {
    for (const t of this.transitions) {
      if (!t.type.isText) return t.type;
    }
    return null;
  }

  compatible(other: ContentMatch): boolean {
    for (const t of this.transitions) {
      if (other.matchType(t.type)) return true;
    }
    return false;
  }

  fillBefore(after: Fragment, toEnd: boolean = false, startIndex: number = 0): Fragment | null {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    let match: ContentMatch | null = this;
    const nodes: Node[] = [];

    for (let i = startIndex; i < after.childCount; i++) {
      const child = after.child(i);
      // Try to fill up to this child
      const fill = match!.fillToType(child.type);
      if (!fill) return null;
      nodes.push(...fill);
      match = match!.matchType(child.type);
      if (!match) return null;
    }

    if (toEnd) {
      const fill = match!.fillToEnd();
      if (!fill) return null;
      nodes.push(...fill);
    }

    return Fragment.from(nodes);
  }

  private fillToType(type: NodeType): Node[] | null {
    const seen = new Set<ContentMatch>();
    const explore = (match: ContentMatch, nodes: Node[]): Node[] | null => {
      if (seen.has(match)) return null;
      seen.add(match);
      if (match.matchType(type)) return nodes;
      for (const t of match.transitions) {
        if (!t.type.isText) {
          const filled = t.type.createAndFill();
          if (filled) {
            const result = explore(t.next, [...nodes, filled]);
            if (result) return result;
          }
        }
      }
      return null;
    };
    return explore(this, []);
  }

  private fillToEnd(): Node[] | null {
    const seen = new Set<ContentMatch>();
    const explore = (match: ContentMatch, nodes: Node[]): Node[] | null => {
      if (seen.has(match)) return null;
      seen.add(match);
      if (match.validEnd) return nodes;
      for (const t of match.transitions) {
        if (!t.type.isText) {
          const filled = t.type.createAndFill();
          if (filled) {
            const result = explore(t.next, [...nodes, filled]);
            if (result) return result;
          }
        }
      }
      return null;
    };
    return explore(this, []);
  }

  // ---- Parsing content expressions → DFA ----

  static parse(expr: string, schema: Schema): ContentMatch {
    if (!expr || expr.trim() === '') return ContentMatch.empty;
    const tokens = tokenize(expr);
    const nfa = parseExpr(tokens, schema);
    return buildDFA(nfa);
  }

  static empty = new ContentMatch(true, []);
}

// ---- Content expression parser ----

interface Token {
  type: 'name' | 'group' | '+' | '*' | '?' | '|' | '(' | ')' | 'space';
  value: string;
}

function tokenize(expr: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < expr.length) {
    const c = expr[i];
    if (c === ' ' || c === '\t') {
      if (tokens.length > 0 && tokens[tokens.length - 1].type !== 'space' &&
          tokens[tokens.length - 1].type !== '|' && tokens[tokens.length - 1].type !== '(') {
        tokens.push({ type: 'space', value: ' ' });
      }
      i++;
    } else if (c === '+' || c === '*' || c === '?') {
      tokens.push({ type: c, value: c });
      i++;
    } else if (c === '|') {
      // Remove trailing space token before |
      if (tokens.length > 0 && tokens[tokens.length - 1].type === 'space') {
        tokens.pop();
      }
      tokens.push({ type: '|', value: '|' });
      i++;
    } else if (c === '(' || c === ')') {
      tokens.push({ type: c as '(' | ')', value: c });
      i++;
    } else {
      let name = '';
      while (i < expr.length && /\w/.test(expr[i])) {
        name += expr[i++];
      }
      if (!name) throw new Error(`Unexpected character in content expression: ${c}`);
      tokens.push({ type: 'name', value: name });
    }
  }
  // Remove trailing space
  if (tokens.length > 0 && tokens[tokens.length - 1].type === 'space') {
    tokens.pop();
  }
  return tokens;
}

// NFA state
interface NFAState {
  id: number;
  transitions: Array<{ types: NodeType[] | null; next: NFAState }>; // null = epsilon
}

let nfaIdCounter = 0;
function newState(): NFAState {
  return { id: nfaIdCounter++, transitions: [] };
}

interface NFAFragment {
  start: NFAState;
  end: NFAState;
}

function resolveTypes(name: string, schema: Schema): NodeType[] {
  // Check if it's a direct node type name
  const nodeType = schema.nodes[name];
  if (nodeType) return [nodeType];

  // Check if it's a group name
  const types: NodeType[] = [];
  for (const nt of Object.values(schema.nodes)) {
    if (nt.isInGroup(name)) types.push(nt);
  }
  if (types.length === 0) throw new Error(`Unknown node type or group: "${name}"`);
  return types;
}

function parseExpr(tokens: Token[], schema: Schema): NFAFragment {
  nfaIdCounter = 0;
  let pos = 0;

  function parseSequence(): NFAFragment {
    let result = parseAlternation();
    while (pos < tokens.length && tokens[pos].type === 'space') {
      pos++; // skip space
      const right = parseAlternation();
      // Concatenate: merge result.end with right.start
      result.end.transitions.push(...right.start.transitions);
      result = { start: result.start, end: right.end };
    }
    return result;
  }

  function parseAlternation(): NFAFragment {
    let result = parseQuantified();
    while (pos < tokens.length && tokens[pos].type === '|') {
      pos++; // skip |
      const right = parseQuantified();
      const start = newState();
      const end = newState();
      start.transitions.push({ types: null, next: result.start });
      start.transitions.push({ types: null, next: right.start });
      result.end.transitions.push({ types: null, next: end });
      right.end.transitions.push({ types: null, next: end });
      result = { start, end };
    }
    return result;
  }

  function parseQuantified(): NFAFragment {
    let base = parseAtom();
    if (pos < tokens.length) {
      const t = tokens[pos];
      if (t.type === '+') {
        pos++;
        // one or more: base then base*
        const end = newState();
        base.end.transitions.push({ types: null, next: base.start });
        base.end.transitions.push({ types: null, next: end });
        base = { start: base.start, end };
      } else if (t.type === '*') {
        pos++;
        // zero or more
        const start = newState();
        const end = newState();
        start.transitions.push({ types: null, next: base.start });
        start.transitions.push({ types: null, next: end });
        base.end.transitions.push({ types: null, next: base.start });
        base.end.transitions.push({ types: null, next: end });
        base = { start, end };
      } else if (t.type === '?') {
        pos++;
        // zero or one
        const start = newState();
        const end = newState();
        start.transitions.push({ types: null, next: base.start });
        start.transitions.push({ types: null, next: end });
        base.end.transitions.push({ types: null, next: end });
        base = { start, end };
      }
    }
    return base;
  }

  function parseAtom(): NFAFragment {
    if (pos < tokens.length && tokens[pos].type === '(') {
      pos++; // skip (
      const result = parseSequence();
      if (pos >= tokens.length || tokens[pos].type !== ')') {
        throw new Error('Missing closing parenthesis in content expression');
      }
      pos++; // skip )
      return result;
    }

    const token = tokens[pos++];
    if (!token || token.type !== 'name') {
      throw new Error(`Unexpected token in content expression: ${token?.value ?? 'end'}`);
    }

    const types = resolveTypes(token.value, schema);
    const start = newState();
    const end = newState();
    start.transitions.push({ types, next: end });
    return { start, end };
  }

  return parseSequence();
}

// ---- NFA → DFA (subset construction) ----

function epsilonClosure(states: Set<NFAState>): Set<NFAState> {
  const result = new Set(states);
  const stack = [...states];
  while (stack.length > 0) {
    const state = stack.pop()!;
    for (const t of state.transitions) {
      if (t.types === null && !result.has(t.next)) {
        result.add(t.next);
        stack.push(t.next);
      }
    }
  }
  return result;
}

function buildDFA(nfa: NFAFragment): ContentMatch {
  // Compute epsilon closure of start state
  const startClosure = epsilonClosure(new Set([nfa.start]));
  const stateKey = (states: Set<NFAState>) => [...states].map((s) => s.id).sort().join(',');

  const dfaStates = new Map<string, { nfaStates: Set<NFAState>; match: ContentMatch }>();
  const queue: Array<{ key: string; nfaStates: Set<NFAState> }> = [];

  // First pass: create all DFA states
  const startKey = stateKey(startClosure);
  const placeholder = new Map<string, { validEnd: boolean; transitions: Array<{ type: NodeType; nextKey: string }> }>();

  queue.push({ key: startKey, nfaStates: startClosure });
  const visited = new Set<string>();

  while (queue.length > 0) {
    const { key, nfaStates: states } = queue.shift()!;
    if (visited.has(key)) continue;
    visited.add(key);

    const validEnd = states.has(nfa.end);
    const transitions: Array<{ type: NodeType; nextKey: string }> = [];

    // Collect all possible type transitions
    const typeTransitions = new Map<NodeType, Set<NFAState>>();
    for (const s of states) {
      for (const t of s.transitions) {
        if (t.types !== null) {
          for (const type of t.types) {
            let targetStates = typeTransitions.get(type);
            if (!targetStates) {
              targetStates = new Set();
              typeTransitions.set(type, targetStates);
            }
            targetStates.add(t.next);
          }
        }
      }
    }

    for (const [type, targets] of typeTransitions) {
      const closure = epsilonClosure(targets);
      const nextKey = stateKey(closure);
      transitions.push({ type, nextKey });
      if (!visited.has(nextKey)) {
        queue.push({ key: nextKey, nfaStates: closure });
      }
    }

    placeholder.set(key, { validEnd, transitions });
  }

  // Second pass: build actual ContentMatch objects
  const matches = new Map<string, ContentMatch>();

  function getMatch(key: string): ContentMatch {
    let match = matches.get(key);
    if (match) return match;

    const data = placeholder.get(key)!;
    // Create with empty transitions first (to handle cycles)
    const transArr: Array<{ type: NodeType; next: ContentMatch }> = [];
    match = new (ContentMatch as unknown as new (validEnd: boolean, transitions: Array<{ type: NodeType; next: ContentMatch }>) => ContentMatch)(
      data.validEnd,
      transArr,
    );
    matches.set(key, match);

    for (const t of data.transitions) {
      transArr.push({ type: t.type, next: getMatch(t.nextKey) });
    }

    return match;
  }

  return getMatch(startKey);
}
