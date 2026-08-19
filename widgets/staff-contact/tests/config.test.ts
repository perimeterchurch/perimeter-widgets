import { describe, it, expect } from 'vitest';
import { StaffContactConfigSchema } from '../src/types';

describe('StaffContactConfigSchema', () => {
  it('defaults contactGuid to empty and recaptchaSiteKey to the Perimeter v3 key', () => {
    const config = StaffContactConfigSchema.parse({});
    expect(config.contactGuid).toBe('');
    expect(config.recaptchaSiteKey).toBe('6LfJFoYtAAAAAChdFF8MhIv7ma3l7xG2bJDQdzvk');
    expect(config.apiUrl).toBeUndefined();
  });

  it('passes through a supplied contact GUID and site key override', () => {
    const config = StaffContactConfigSchema.parse({
      contactGuid: '641f26fa-12c2-48b7-8392-81e6c02a76bb',
      recaptchaSiteKey: 'custom-key',
      apiUrl: 'http://localhost:5500',
    });
    expect(config.contactGuid).toBe('641f26fa-12c2-48b7-8392-81e6c02a76bb');
    expect(config.recaptchaSiteKey).toBe('custom-key');
    expect(config.apiUrl).toBe('http://localhost:5500');
  });
});
