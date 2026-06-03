import { describe, it, expect } from 'vitest';
import { parseReleaseArgs, planRelease } from '../src/release';

describe('parseReleaseArgs', () => {
  it('parses a bare name (no bump, no flags)', () => {
    expect(parseReleaseArgs(['example'])).toEqual({ name: 'example', force: false, dryRun: false });
  });

  it('parses a bump flag', () => {
    expect(parseReleaseArgs(['example', '--minor'])).toEqual({
      name: 'example',
      bump: 'minor',
      force: false,
      dryRun: false,
    });
  });

  it('parses a bump with --dry-run', () => {
    expect(parseReleaseArgs(['example', '--patch', '--dry-run'])).toEqual({
      name: 'example',
      bump: 'patch',
      force: false,
      dryRun: true,
    });
  });

  it('allows --dry-run with no bump', () => {
    expect(parseReleaseArgs(['example', '--dry-run'])).toEqual({
      name: 'example',
      force: false,
      dryRun: true,
    });
  });

  it('parses --force', () => {
    expect(parseReleaseArgs(['example', '--force'])).toEqual({
      name: 'example',
      force: true,
      dryRun: false,
    });
  });

  it('throws when the name slot is a --flag (missing name)', () => {
    expect(() => parseReleaseArgs(['--minor'])).toThrow(/missing widget name/);
  });

  it('throws on two bump flags', () => {
    expect(() => parseReleaseArgs(['example', '--patch', '--major'])).toThrow();
  });
});

describe('planRelease', () => {
  it('plans a minor bump for example@0.0.1', () => {
    const plan = planRelease('example', '0.0.1', 'minor');
    expect(plan.newVersion).toBe('0.1.0');
    expect(plan.branch).toBe('release/example-0.1.0');
    expect(plan.commitMessage).toBe('chore(release): example@0.1.0');
    expect(plan.prTitle).toBe('chore(release): example@0.1.0');
    expect(plan.prBody).toContain('example@0.1.0');
  });
});
