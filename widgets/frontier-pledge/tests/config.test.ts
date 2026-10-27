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

  it('leaves every color unset by default, so the brand palette applies', () => {
    const config = FrontierPledgeConfigSchema.parse({});
    expect(config.backgroundColor).toBeUndefined();
    expect(config.textColor).toBeUndefined();
    expect(config.headingColor).toBeUndefined();
    expect(config.accentColor).toBeUndefined();
    expect(config.periodColor).toBeUndefined();
    expect(config.buttonTextColor).toBeUndefined();
  });

  it('does not reject a malformed color — a typo must not fail the mount', () => {
    expect(() =>
      FrontierPledgeConfigSchema.parse({ backgroundColor: 'not a color' }),
    ).not.toThrow();
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

  it('leaves the campaign unset by default, so the API pledges to Frontier', () => {
    expect(FrontierPledgeConfigSchema.parse({}).pledgeCampaignId).toBeUndefined();
  });

  it('reads the campaign id from its data-* string', () => {
    expect(FrontierPledgeConfigSchema.parse({ pledgeCampaignId: '887' }).pledgeCampaignId).toBe(
      887,
    );
  });

  it('fails the mount on a malformed campaign id rather than pledging to Frontier', () => {
    for (const pledgeCampaignId of ['abc', '', '0', '-4', '9.5']) {
      expect(() => FrontierPledgeConfigSchema.parse({ pledgeCampaignId })).toThrow();
    }
  });

  it('defaults the thank-you heading to the Frontier copy', () => {
    expect(FrontierPledgeConfigSchema.parse({}).thankYouHeading).toBe(
      'Thank you for your pledge to the Frontier Campaign!',
    );
  });
});
