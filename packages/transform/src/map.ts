/**
 * StepMap tracks how positions in a document map through a transformation step.
 * Uses a compact representation: ranges array of [oldStart, oldLen, newLen] triples.
 */
export class StepMap {
  constructor(readonly ranges: readonly number[]) {}

  map(pos: number, assoc: number = 1): number {
    return this.mapResult(pos, assoc).pos;
  }

  mapResult(pos: number, assoc: number = 1): MapResult {
    let diff = 0;
    for (let i = 0; i < this.ranges.length; i += 3) {
      const start = this.ranges[i];
      const oldSize = this.ranges[i + 1];
      const newSize = this.ranges[i + 2];
      const end = start + oldSize;

      if (pos < start) return new MapResult(pos + diff, false);

      if (pos <= end) {
        const side = !oldSize ? assoc : pos === start ? -1 : pos === end ? 1 : assoc;
        const mapped = start + diff + (side < 0 ? 0 : newSize);
        const deleted = pos !== (side < 0 ? start : end);
        return new MapResult(mapped, deleted);
      }

      diff += newSize - oldSize;
    }
    return new MapResult(pos + diff, false);
  }

  invert(): StepMap {
    const result: number[] = [];
    for (let i = 0; i < this.ranges.length; i += 3) {
      result.push(this.ranges[i], this.ranges[i + 2], this.ranges[i + 1]);
    }
    return new StepMap(result);
  }

  static empty = new StepMap([]);

  static offset(n: number): StepMap {
    return n ? new StepMap([0, 0, n]) : StepMap.empty;
  }
}

export class MapResult {
  constructor(
    readonly pos: number,
    readonly deleted: boolean,
  ) {}
}

/**
 * Mapping composes multiple StepMaps together for position mapping
 * across multiple transformation steps.
 */
export class Mapping {
  readonly maps: StepMap[];
  readonly mirror: number[] | undefined;
  from: number;
  to: number;

  constructor(
    maps: StepMap[] = [],
    mirror?: number[],
    from?: number,
    to?: number,
  ) {
    this.maps = maps;
    this.mirror = mirror;
    this.from = from ?? 0;
    this.to = to ?? maps.length;
  }

  appendMap(map: StepMap, mirrors?: number): void {
    this.maps.push(map);
    this.to = this.maps.length;
    if (mirrors !== undefined) this.setMirror(this.maps.length - 1, mirrors);
  }

  appendMapping(mapping: Mapping): void {
    for (let i = mapping.from; i < mapping.to; i++) {
      this.appendMap(mapping.maps[i]);
    }
  }

  private setMirror(a: number, b: number): void {
    const mirror = this.mirror ?? ((this as { mirror: number[] }).mirror = []);
    mirror.push(a, b);
  }

  getMirror(n: number): number | undefined {
    if (!this.mirror) return undefined;
    for (let i = 0; i < this.mirror.length; i += 2) {
      if (this.mirror[i] === n) return this.mirror[i + 1];
      if (this.mirror[i + 1] === n) return this.mirror[i];
    }
    return undefined;
  }

  map(pos: number, assoc: number = 1): number {
    for (let i = this.from; i < this.to; i++) {
      pos = this.maps[i].map(pos, assoc);
    }
    return pos;
  }

  mapResult(pos: number, assoc: number = 1): MapResult {
    let deleted = false;
    for (let i = this.from; i < this.to; i++) {
      const result = this.maps[i].mapResult(pos, assoc);
      if (result.deleted) {
        // Check if there's a mirror that recovers this deletion
        const mirror = this.getMirror(i);
        if (mirror !== undefined && mirror > i && mirror < this.to) {
          // Position will be recovered by mirror step, keep going
          pos = result.pos;
          continue;
        }
        deleted = true;
      }
      pos = result.pos;
    }
    return new MapResult(pos, deleted);
  }

  slice(from: number = this.from, to: number = this.to): Mapping {
    return new Mapping(this.maps, this.mirror, from, to);
  }
}
