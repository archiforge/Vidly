import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { SearchInput } from './SearchInput';

describe('SearchInput', () => {
  it('reports the trimmed value once typing pauses', async () => {
    const onChange = vi.fn();
    render(<SearchInput label="Search" value="" onChange={onChange} delay={20} />);

    await userEvent.type(screen.getByRole('searchbox', { name: 'Search' }), '  alien ');

    await waitFor(() => expect(onChange).toHaveBeenCalledWith('alien'));
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('commits immediately on Enter and can be cleared', async () => {
    const onChange = vi.fn();
    render(<SearchInput label="Search" value="" onChange={onChange} delay={10_000} />);
    const input = screen.getByRole('searchbox', { name: 'Search' });

    await userEvent.type(input, 'heat{Enter}');
    expect(onChange).toHaveBeenLastCalledWith('heat');

    await userEvent.click(screen.getByRole('button', { name: 'Clear search' }));
    expect(onChange).toHaveBeenLastCalledWith('');
    expect(input).toHaveValue('');
  });

  it('follows external changes to the value', () => {
    const { rerender } = render(<SearchInput label="Search" value="old" onChange={() => {}} />);
    rerender(<SearchInput label="Search" value="" onChange={() => {}} />);
    expect(screen.getByRole('searchbox')).toHaveValue('');
  });
});

describe('SearchInput with asynchronous parent updates', () => {
  it('keeps what the user typed while the committed value catches up', async () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <SearchInput label="Search" value="" onChange={onChange} delay={20} />,
    );
    const input = screen.getByRole('searchbox');

    await userEvent.type(input, 'die ');
    await waitFor(() => expect(onChange).toHaveBeenCalledWith('die'));
    // The parent echoes the trimmed value back later; the trailing space must survive.
    rerender(<SearchInput label="Search" value="die" onChange={onChange} delay={20} />);
    await userEvent.type(input, 'hard');

    expect(input).toHaveValue('die hard');
    await waitFor(() => expect(onChange).toHaveBeenLastCalledWith('die hard'));
  });
});
