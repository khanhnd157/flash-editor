import { describe, it, expect, beforeEach } from 'vitest';
import { DirtyTracker, VNodePool } from '../lazy-render';

// =============================================
// DirtyTracker tests
// =============================================

describe('DirtyTracker', () => {
  let tracker: DirtyTracker;

  beforeEach(() => {
    tracker = new DirtyTracker();
  });

  it('starts with no dirty ranges', () => {
    expect(tracker.hasDirty).toBe(false);
    expect(tracker.isDirty(0, 100)).toBe(false);
  });

  it('tracks dirty ranges from a transaction', () => {
    tracker.track({
      steps: [{
        getMap() {
          return { ranges: [10, 5, 8] }; // pos=10, oldSize=5, newSize=8
        },
      }],
    });

    expect(tracker.hasDirty).toBe(true);
    expect(tracker.isDirty(10, 18)).toBe(true);  // overlaps
    expect(tracker.isDirty(0, 9)).toBe(false);    // before
    expect(tracker.isDirty(19, 30)).toBe(false);  // after
  });

  it('tracks overlapping check correctly', () => {
    tracker.track({
      steps: [{
        getMap() {
          return { ranges: [5, 3, 3] }; // pos=5, size=3
        },
      }],
    });

    // Range [5, 8] is dirty
    expect(tracker.isDirty(0, 5)).toBe(true);   // touches left edge
    expect(tracker.isDirty(8, 15)).toBe(true);   // touches right edge
    expect(tracker.isDirty(6, 7)).toBe(true);    // inside
    expect(tracker.isDirty(0, 4)).toBe(false);   // fully before
    expect(tracker.isDirty(9, 20)).toBe(false);  // fully after
  });

  it('tracks multiple steps', () => {
    tracker.track({
      steps: [
        { getMap() { return { ranges: [0, 2, 2] }; } },
        { getMap() { return { ranges: [50, 3, 5] }; } },
      ],
    });

    expect(tracker.isDirty(0, 2)).toBe(true);
    expect(tracker.isDirty(50, 55)).toBe(true);
    expect(tracker.isDirty(10, 40)).toBe(false);
  });

  it('clears dirty ranges', () => {
    tracker.track({
      steps: [{ getMap() { return { ranges: [0, 5, 5] }; } }],
    });

    expect(tracker.hasDirty).toBe(true);
    tracker.clear();
    expect(tracker.hasDirty).toBe(false);
    expect(tracker.isDirty(0, 5)).toBe(false);
  });

  it('accumulates across multiple track calls', () => {
    tracker.track({ steps: [{ getMap() { return { ranges: [0, 1, 1] }; } }] });
    tracker.track({ steps: [{ getMap() { return { ranges: [100, 1, 1] }; } }] });

    expect(tracker.isDirty(0, 1)).toBe(true);
    expect(tracker.isDirty(100, 101)).toBe(true);
  });
});

// =============================================
// VNodePool tests
// =============================================

describe('VNodePool', () => {
  it('acquires a fresh object when pool is empty', () => {
    const pool = new VNodePool(10);
    const node = pool.acquire('div', null, [], null);
    expect(node.tag).toBe('div');
    expect(node.dom).toBeNull();
    expect(pool.size).toBe(0);
  });

  it('reuses released objects', () => {
    const pool = new VNodePool(10);
    const original = pool.acquire('p', null, ['child'], null);
    pool.release(original);
    expect(pool.size).toBe(1);

    const reused = pool.acquire('span', { class: 'x' }, [], 'key1');
    expect(reused).toBe(original);
    expect(reused.tag).toBe('span');
    expect(reused.key).toBe('key1');
    expect(reused.children).toEqual([]);
    expect(pool.size).toBe(0);
  });

  it('respects max pool size', () => {
    const pool = new VNodePool(2);

    const a = pool.acquire('a', null, [], null);
    const b = pool.acquire('b', null, [], null);
    const c = pool.acquire('c', null, [], null);

    pool.release(a);
    pool.release(b);
    pool.release(c); // should be dropped (pool full)

    expect(pool.size).toBe(2);
  });

  it('clears the pool', () => {
    const pool = new VNodePool(10);
    const a = pool.acquire('div', null, [], null);
    const b = pool.acquire('div', null, [], null);
    pool.release(a);
    pool.release(b);
    expect(pool.size).toBe(2);

    pool.clear();
    expect(pool.size).toBe(0);
  });

  it('clears children on release', () => {
    const pool = new VNodePool(10);
    const node = pool.acquire('div', null, ['a', 'b', 'c'] as any, null);
    expect(node.children).toHaveLength(3);

    pool.release(node);
    const reused = pool.acquire('span', null, [], null);
    expect(reused.children).toHaveLength(0);
  });
});
