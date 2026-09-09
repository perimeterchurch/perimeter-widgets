import { describe, it, expect } from 'vitest';
import { donationsToCsv, donationsFilename } from '../../src/lib/csv';
import { donation } from '../fixtures';

describe('donationsToCsv', () => {
  it('writes the header row followed by one row per donation', () => {
    const lines = donationsToCsv([donation()]).split('\n');
    expect(lines[0]).toBe('Date,Amount,Name,Email,Phone,Address');
    expect(lines).toHaveLength(2);
    expect(lines[1]).toBe(
      '"2/14/2026","$250.00","Marta Whitfield","marta@example.com","770-555-0143","118 Ridgemont Way, Duluth, GA 30097"',
    );
  });

  it('doubles an embedded quote instead of breaking the row', () => {
    // The legacy widget wrapped cells in `"` with no escaping, so one quote in
    // a donor name shifted every later column.
    const csv = donationsToCsv([donation({ donorName: 'Bob "Buddy" Hale' })]);
    expect(csv).toContain('"Bob ""Buddy"" Hale"');
    expect(csv.split('\n')).toHaveLength(2);
  });

  it('neutralises a cell that a spreadsheet would evaluate as a formula', () => {
    const csv = donationsToCsv([donation({ donorName: '=HYPERLINK("http://evil","x")' })]);
    expect(csv).toContain('"\'=HYPERLINK(""http://evil"",""x"")"');
  });

  it('leaves the address blank for an anonymous gift', () => {
    const csv = donationsToCsv([
      donation({ anonymous: true, donorName: 'Anonymous', email: null, phone: null }),
    ]);
    expect(csv.split('\n')[1]).toBe('"2/14/2026","$250.00","Anonymous","","",""');
  });

  it('leaves the address blank when there is no address on file', () => {
    const csv = donationsToCsv([donation({ address: null })]);
    expect(csv.split('\n')[1]).toContain('"770-555-0143",""');
  });

  it('keeps the order it is given', () => {
    const csv = donationsToCsv([
      donation({ donorName: 'First' }),
      donation({ donorName: 'Second' }),
    ]);
    const [, one, two] = csv.split('\n');
    expect(one).toContain('First');
    expect(two).toContain('Second');
  });
});

describe('donationsFilename', () => {
  it('stamps the file with the date', () => {
    expect(donationsFilename(new Date('2026-09-08T12:00:00Z'))).toBe('donations-2026-09-08.csv');
  });
});
