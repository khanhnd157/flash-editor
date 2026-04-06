import { describe, it, expect, beforeEach } from 'vitest';
import { StepMap, Mapping, MapResult } from '../map';

describe('StepMap', () => {
  it('maps positions through insertions', () => {
    // Insert 3 chars at position 5
    const map = new StepMap([5, 0, 3]);
    expect(map.map(0)).toBe(0);
    expect(map.map(4)).toBe(4);
    expect(map.map(5)).toBe(8); // after insertion point, shifted right
    expect(map.map(10)).toBe(13);
  });

  it('maps positions through deletions', () => {
    // Delete 3 chars starting at position 5
    const map = new StepMap([5, 3, 0]);
    expect(map.map(0)).toBe(0);
    expect(map.map(4)).toBe(4);
    expect(map.map(6)).toBe(5); // inside deleted range
    expect(map.map(8)).toBe(5); // right at end of deletion
    expect(map.map(10)).toBe(7);
  });

  it('maps with assoc -1 (left bias)', () => {
    const map = new StepMap([5, 0, 3]);
    expect(map.map(5, -1)).toBe(5); // cursor stays before insert
  });

  it('maps with replacement', () => {
    // Replace 2 chars at position 5 with 4 chars
    const map = new StepMap([5, 2, 4]);
    expect(map.map(0)).toBe(0);
    expect(map.map(5, -1)).toBe(5);
    expect(map.map(7, 1)).toBe(9);
    expect(map.map(10)).toBe(12);
  });

  it('mapResult returns deleted flag', () => {
    const map = new StepMap([5, 3, 0]);
    const r1 = map.mapResult(6);
    expect(r1.deleted).toBe(true);
    const r2 = map.mapResult(3);
    expect(r2.deleted).toBe(false);
  });

  it('invert() swaps old/new sizes', () => {
    const map = new StepMap([5, 2, 4]);
    const inv = map.invert();
    expect(inv.ranges).toEqual([5, 4, 2]);
  });

  it('empty map is identity', () => {
    expect(StepMap.empty.map(42)).toBe(42);
  });
});

describe('Mapping', () => {
  it('composes multiple maps', () => {
    const mapping = new Mapping();
    // Insert 3 at pos 5
    mapping.appendMap(new StepMap([5, 0, 3]));
    // Insert 2 at pos 2
    mapping.appendMap(new StepMap([2, 0, 2]));

    expect(mapping.map(0)).toBe(0);
    expect(mapping.map(1)).toBe(1);
    expect(mapping.map(3)).toBe(5); // shifted by second insert
    expect(mapping.map(5)).toBe(10); // shifted by both
    expect(mapping.map(10)).toBe(15);
  });

  it('mapResult through composed maps', () => {
    const mapping = new Mapping();
    mapping.appendMap(new StepMap([5, 3, 0])); // delete 3 at 5
    const result = mapping.mapResult(6); // inside deletion
    expect(result.deleted).toBe(true);
  });

  it('slice() creates sub-mapping', () => {
    const mapping = new Mapping();
    mapping.appendMap(new StepMap([0, 0, 5]));
    mapping.appendMap(new StepMap([0, 0, 3]));
    const sliced = mapping.slice(0, 1);
    expect(sliced.map(0)).toBe(5);
  });

  it('appendMapping() merges mappings', () => {
    const m1 = new Mapping();
    m1.appendMap(new StepMap([0, 0, 5]));
    const m2 = new Mapping();
    m2.appendMap(new StepMap([0, 0, 3]));
    m1.appendMapping(m2);
    expect(m1.map(0)).toBe(8);
  });
});
