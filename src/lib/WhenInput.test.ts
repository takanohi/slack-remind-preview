import { fireEvent, render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import WhenInput from './WhenInput.svelte';

describe('WhenInput', () => {
  it('shows a warning when recurring mode has no selected days', async () => {
    render(WhenInput, { value: '' });

    await fireEvent.click(screen.getByRole('button', { name: 'Recurring' }));
    await fireEvent.click(screen.getByRole('button', { name: 'Monday' }));

    expect(screen.getByText('⚠ Select at least one day.')).toBeTruthy();
  });

  it('shows a warning when the recurring start date cannot be parsed', async () => {
    render(WhenInput, { value: '' });

    await fireEvent.click(screen.getByRole('button', { name: 'Recurring' }));
    await fireEvent.input(screen.getByLabelText('Starts'), {
      target: { value: 'not a date' },
    });

    expect(screen.getByText("⚠ Couldn't parse the start date.")).toBeTruthy();
  });
});
