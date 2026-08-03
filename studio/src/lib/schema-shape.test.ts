// studio/src/lib/schema-shape.test.ts
import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { describeSchemaFields } from './schema-shape';

describe('describeSchemaFields — enum/min-max/description', () => {
  const schema = z.object({
    view: z.enum(['grid', 'list']).default('grid').describe('How items are laid out.'),
    perPage: z.coerce.number().int().min(0).max(20).default(3).describe('Items per page.'),
    showHeader: z.coerce.boolean().optional().describe('Toggle the header.'),
    showImage: z.coerce.boolean().default(true).describe('Show the artwork.'),
    title: z.string().default('Hello'),
  });

  const fields = describeSchemaFields(schema);
  const field = (key: string) => {
    const found = fields.find((f) => f.key === key);
    if (!found) throw new Error(`no field ${key}`);
    return found;
  };
  const byKey = {
    view: field('view'),
    perPage: field('perPage'),
    showHeader: field('showHeader'),
    showImage: field('showImage'),
    title: field('title'),
  };

  it('captures enum options from a ZodEnum', () => {
    expect(byKey.view.enumOptions).toEqual(['grid', 'list']);
    // non-enum fields have null enumOptions
    expect(byKey.perPage.enumOptions).toBeNull();
    expect(byKey.showHeader.enumOptions).toBeNull();
  });

  it('captures min/max from a coerced number with checks', () => {
    expect(byKey.perPage.min).toBe(0);
    expect(byKey.perPage.max).toBe(20);
    // coerced number surfaces as a number type (not a wrapper)
    expect(byKey.perPage.type).toBe('number');
  });

  it('leaves min/max null when there are no numeric checks', () => {
    expect(byKey.view.min).toBeNull();
    expect(byKey.view.max).toBeNull();
    expect(byKey.title.min).toBeNull();
    expect(byKey.title.max).toBeNull();
  });

  it('captures the description from the OUTERMOST wrapper', () => {
    // description sits on ZodDefault (view), ZodOptional (showHeader)
    expect(byKey.view.description).toBe('How items are laid out.');
    expect(byKey.perPage.description).toBe('Items per page.');
    expect(byKey.showHeader.description).toBe('Toggle the header.');
  });

  it('returns null description when a field has none', () => {
    expect(byKey.title.description).toBeNull();
  });

  it('coerced boolean surfaces as boolean type', () => {
    expect(byKey.showHeader.type).toBe('boolean');
  });

  it('keeps existing key/type/default/optional fields', () => {
    expect(byKey.view.default).toBe('grid');
    expect(byKey.showHeader.optional).toBe(true);
    expect(byKey.title.default).toBe('Hello');
  });

  // `default` is display text, so a boolean default arrives as the STRING "true".
  // ConfigPanel's switch needs the real value to render its on/off state, which is
  // what `rawDefault` carries — parsing the display string back would be a trap.
  it('carries the default as its real value in rawDefault', () => {
    expect(byKey.showImage.rawDefault).toBe(true);
    expect(byKey.showImage.default).toBe('true');
    expect(byKey.perPage.rawDefault).toBe(3);
    expect(byKey.view.rawDefault).toBe('grid');
  });

  it('leaves rawDefault undefined for a field with no default', () => {
    expect(byKey.showHeader.rawDefault).toBeUndefined();
  });
});

// Regression for the studio's config controls vanishing on the DEPLOYED site: the
// field type was derived from `constructor.name`, which a production minifier
// mangles, so `type` was never "boolean"/"number" in the shipped bundle and every
// control fell back to a text input. Dev + the Playwright harness run unminified
// source, so it only showed up on style.perimeter.org. This simulates the mangling
// — shadow each inner type's `constructor` with a garbage-named class, exactly what
// the minifier does to `.name` — while leaving zod's `_def.typeName` string intact,
// and asserts the derived type survives it. Fails against the old constructor.name
// code, passes reading `_def.typeName`.
describe('describeSchemaFields — minification safety', () => {
  it('derives the type from a source the minifier cannot rename', () => {
    const schema = z.object({
      flag: z.coerce.boolean().default(true),
      count: z.coerce.number().min(0).max(20).default(3),
      label: z.string().default('hi'),
      view: z.enum(['grid', 'list']).default('grid'),
    });

    // A mangled class binding: `.name` is a short garbage identifier, as a
    // minified `class Xy extends ZodType {}` would be. instanceof is untouched
    // (it walks the prototype chain, not this property), so peeling + min/max
    // extraction still work — only the name source is corrupted.
    const mangle = (zt: z.ZodTypeAny) =>
      Object.defineProperty(zt, 'constructor', { value: class Q {}, configurable: true });
    mangle(schema.shape.flag._def.innerType); // ZodBoolean inside the ZodDefault
    mangle(schema.shape.count._def.innerType); // ZodNumber
    mangle(schema.shape.label._def.innerType); // ZodString
    mangle(schema.shape.view._def.innerType); // ZodEnum

    const byKey = Object.fromEntries(describeSchemaFields(schema).map((f) => [f.key, f]));
    expect(byKey.flag?.type).toBe('boolean');
    expect(byKey.count?.type).toBe('number');
    expect(byKey.label?.type).toBe('string');
    // enum options come from instanceof, so they were never at risk — assert they
    // still resolve under the same mangling so the whole control set is covered.
    expect(byKey.view?.enumOptions).toEqual(['grid', 'list']);
    // the number's min/max ride on instanceof too; confirm they survive.
    expect(byKey.count?.min).toBe(0);
    expect(byKey.count?.max).toBe(20);
  });
});
