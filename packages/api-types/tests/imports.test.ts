import { describe, it, expectTypeOf } from 'vitest';
import type { operations } from '../src';

// NOTE: These are COMPILE-TIME assertions enforced by `tsc --noEmit` (which
// runs as part of `pnpm quality`), NOT by `vitest run`. `vitest run` strips
// types, so a missing/renamed operation id is caught at typecheck, not at the
// runtime test. If you rename an op in the OpenAPI spec, `pnpm typecheck`
// fails here — that is the intended safety net.
describe('codegen sermons operations', () => {
  it('exposes the sermons-related operation ids', () => {
    type Op = keyof operations;
    expectTypeOf<'listSermons'>().toExtend<Op>();
    expectTypeOf<'getSermon'>().toExtend<Op>();
    expectTypeOf<'listSeries'>().toExtend<Op>();
    expectTypeOf<'getSeriesDetail'>().toExtend<Op>();
    expectTypeOf<'listSpeakers'>().toExtend<Op>();
    expectTypeOf<'listBooks'>().toExtend<Op>();
    expectTypeOf<'listServiceTypes'>().toExtend<Op>();
    expectTypeOf<'listSeriesTypes'>().toExtend<Op>();
  });
});
