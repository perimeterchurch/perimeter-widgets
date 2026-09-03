import { describe, it, expect } from 'vitest';
import { FrontierPledgeConfigSchema } from '../src/types';

describe('FrontierPledgeConfigSchema', () => {
  it('defaults to the Frontier campaign copy and the My Perimeter account link', () => {
    const config = FrontierPledgeConfigSchema.parse({});
    expect(config.heading).toBe('My 3-Year Pledge');
    expect(config.period).toBe('Jan 2026 - Dec 2028');
    expect(config.amountLabel).toBe('Total 3-Year Pledge Amount');
    expect(config.accountUrl).toBe('https://www.perimeter.org/my-perimeter/');
    expect(config.apiUrl).toBeUndefined();
  });

  it('passes host-page overrides through', () => {
    const config = FrontierPledgeConfigSchema.parse({
      heading: 'My 5-Year Pledge',
      period: 'Jan 2030 - Dec 2034',
      amountLabel: 'Total 5-Year Pledge Amount',
      accountUrl: 'https://example.org/account/',
      apiUrl: 'http://localhost:5500',
    });
    expect(config.heading).toBe('My 5-Year Pledge');
    expect(config.period).toBe('Jan 2030 - Dec 2034');
    expect(config.amountLabel).toBe('Total 5-Year Pledge Amount');
    expect(config.accountUrl).toBe('https://example.org/account/');
    expect(config.apiUrl).toBe('http://localhost:5500');
  });

  it('has no campaign field — the campaign is pinned server-side', () => {
    const keys = Object.keys(FrontierPledgeConfigSchema.shape);
    expect(keys).not.toContain('campaignId');
    expect(keys).not.toContain('pledgeCampaignId');
  });
});
