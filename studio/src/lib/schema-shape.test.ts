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
