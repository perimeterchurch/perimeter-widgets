/// <reference types="@testing-library/jest-dom/vitest" />
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { DateTime } from 'luxon';
import { DateRangePicker } from '../../../src/components/ui/DateRangePicker';

/**
 * Characterization tests for DateRangePicker.
 *
 * These pin the OBSERVABLE behavior before the Modal-dependency split so the
 * refactor (extract Calendar / RangePresets / self-contained popover shell)
 * can be proven behavior-identical. jsdom renders the inline popover (no
 * portal), so the dialog is queryable directly.
 */
describe('DateRangePicker (characterization)', () => {
  it('shows the placeholder when there is no value', () => {
    render(<DateRangePicker from="" to="" onRangeChange={() => {}} placeholder="Pick dates" />);
    expect(screen.getByText('Pick dates')).toBeInTheDocument();
  });

  it('renders the trigger summary for a full range', () => {
    render(<DateRangePicker from="2026-01-10" to="2026-02-20" onRangeChange={() => {}} />);
    // "MMM d, yyyy – MMM d, yyyy"
    expect(screen.getByText(/Jan 10, 2026\s*–\s*Feb 20, 2026/)).toBeInTheDocument();
  });

  it('renders "After" when only a start is set and "Before" when only an end is set', () => {
    const { rerender } = render(
      <DateRangePicker from="2026-01-10" to="" onRangeChange={() => {}} />,
    );
    expect(screen.getByText(/After Jan 10, 2026/)).toBeInTheDocument();

    rerender(<DateRangePicker from="" to="2026-02-20" onRangeChange={() => {}} />);
    expect(screen.getByText(/Before Feb 20, 2026/)).toBeInTheDocument();
  });

  it('opens a dialog when the trigger is clicked', () => {
    render(<DateRangePicker from="" to="" onRangeChange={() => {}} />);
    expect(screen.queryByRole('dialog')).toBeNull();
    fireEvent.click(screen.getByText('Select date range...'));
    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByText('Select date range')).toBeInTheDocument();
    // From / To pills
    expect(within(dialog).getByText('From')).toBeInTheDocument();
    expect(within(dialog).getByText('To')).toBeInTheDocument();
  });

  it('picks a start date from the calendar and applies the range', () => {
    const onRangeChange = vi.fn();
    render(<DateRangePicker from="2026-03-01" to="" onRangeChange={onRangeChange} />);
    fireEvent.click(screen.getByText(/After Mar 1, 2026/));
    const dialog = screen.getByRole('dialog');
    // Calendar opens on the selected month (March 2026).
    expect(within(dialog).getByText('March 2026')).toBeInTheDocument();
    // Click day 15 (current-month day cells).
    const day15 = within(dialog).getByRole('button', { name: '15' });
    fireEvent.click(day15);
    // Apply.
    fireEvent.click(within(dialog).getByText('Apply'));
    expect(onRangeChange).toHaveBeenCalledTimes(1);
    expect(onRangeChange).toHaveBeenCalledWith('2026-03-15', '');
  });

  it('navigates months with the chevrons', () => {
    render(<DateRangePicker from="2026-03-01" to="" onRangeChange={() => {}} />);
    fireEvent.click(screen.getByText(/After Mar 1, 2026/));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('March 2026')).toBeInTheDocument();
    fireEvent.click(within(dialog).getByLabelText('Next month'));
    expect(within(dialog).getByText('April 2026')).toBeInTheDocument();
    fireEvent.click(within(dialog).getByLabelText('Previous month'));
    fireEvent.click(within(dialog).getByLabelText('Previous month'));
    expect(within(dialog).getByText('February 2026')).toBeInTheDocument();
  });

  it('renders presets and selecting one sets a start relative to now', () => {
    const presets = [{ label: 'Last 7 days', duration: { days: 7 } }];
    render(<DateRangePicker from="" to="" onRangeChange={() => {}} presets={presets} />);
    fireEvent.click(screen.getByText('Select date range...'));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('Quick select')).toBeInTheDocument();
    fireEvent.click(within(dialog).getByText('Last 7 days'));
    // The "From" pill now reflects ~7 days ago (not "Select start").
    const expected = DateTime.now().minus({ days: 7 }).toFormat('MMM d, yyyy');
    expect(within(dialog).getByText(expected)).toBeInTheDocument();
  });

  it('clears drafts from the footer Clear button', () => {
    render(<DateRangePicker from="2026-03-10" to="2026-03-20" onRangeChange={() => {}} />);
    fireEvent.click(screen.getByText(/Mar 10, 2026/));
    const dialog = screen.getByRole('dialog');
    // Draft pills reflect the incoming values.
    expect(within(dialog).getByText('Mar 10, 2026')).toBeInTheDocument();
    // Footer Clear empties both drafts → pills revert to placeholders.
    const clearBtn = within(dialog).getByText('Clear');
    fireEvent.click(clearBtn);
    expect(within(dialog).getByText('Select start')).toBeInTheDocument();
    expect(within(dialog).getByText('Now')).toBeInTheDocument();
  });

  it('renders an inline clear affordance and clears the whole range when clearable', () => {
    const onRangeChange = vi.fn();
    render(
      <DateRangePicker from="2026-03-10" to="2026-03-20" clearable onRangeChange={onRangeChange} />,
    );
    fireEvent.click(screen.getByLabelText('Clear date range'));
    expect(onRangeChange).toHaveBeenCalledWith('', '');
  });
});
