import { Search } from 'lucide-react';
import { useId, useState, type KeyboardEvent, type ReactNode } from 'react';
import { cn } from '../lib/cn';
import { Button } from './ui/Button';
import { controlClasses } from './ui/styles';
import { Spinner } from './ui/Spinner';

interface EntityPickerProps<T> {
  label: string;
  placeholder: string;
  query: string;
  onQueryChange: (query: string) => void;
  results: T[] | undefined;
  loading: boolean;
  selected: T | null;
  onSelect: (item: T | null) => void;
  getKey: (item: T) => string;
  renderOption: (item: T) => ReactNode;
  renderSelected: (item: T) => ReactNode;
  emptyMessage: string;
  autoFocus?: boolean;
}

/**
 * A searchable list (ARIA combobox + listbox). Results are shown inline rather than in a
 * popover, which suits a dedicated selection step on a page.
 */
export function EntityPicker<T>({
  label,
  placeholder,
  query,
  onQueryChange,
  results,
  loading,
  selected,
  onSelect,
  getKey,
  renderOption,
  renderSelected,
  emptyMessage,
  autoFocus,
}: EntityPickerProps<T>) {
  const id = useId();
  const listId = `${id}-list`;
  const [activeIndex, setActiveIndex] = useState(0);
  const items = results ?? [];
  const active = Math.min(activeIndex, Math.max(items.length - 1, 0));

  if (selected) {
    return (
      <div>
        <p className="mb-1.5 text-sm font-medium text-zinc-800">{label}</p>
        <div className="flex items-center gap-3 rounded-lg bg-brand-50/60 p-3 ring-1 ring-brand-200">
          <div className="min-w-0 flex-1">{renderSelected(selected)}</div>
          <Button variant="secondary" size="sm" onClick={() => onSelect(null)}>
            Change
          </Button>
        </div>
      </div>
    );
  }

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (items.length === 0) return;
    const moves: Record<string, number> = {
      ArrowDown: Math.min(active + 1, items.length - 1),
      ArrowUp: Math.max(active - 1, 0),
      Home: 0,
      End: items.length - 1,
    };
    if (event.key in moves) {
      event.preventDefault();
      setActiveIndex(moves[event.key]!);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const item = items[active];
      if (item) onSelect(item);
    }
  };

  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-zinc-800">
        {label}
      </label>
      <div className="relative">
        <Search
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-zinc-400"
          aria-hidden
        />
        <input
          id={id}
          role="combobox"
          aria-expanded="true"
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={
            items[active] ? `${id}-option-${getKey(items[active])}` : undefined
          }
          autoComplete="off"
          autoFocus={autoFocus}
          placeholder={placeholder}
          value={query}
          onChange={(event) => {
            onQueryChange(event.target.value);
            setActiveIndex(0);
          }}
          onKeyDown={onKeyDown}
          className={cn(controlClasses(), 'pl-9')}
        />
        {loading && <Spinner className="absolute top-1/2 right-3 size-4 -translate-y-1/2" />}
      </div>
      <ul
        id={listId}
        role="listbox"
        aria-label={label}
        className="mt-2 max-h-72 divide-y divide-zinc-100 overflow-y-auto rounded-lg ring-1 ring-zinc-200"
      >
        {items.length === 0 && !loading && (
          <li className="px-3 py-6 text-center text-sm text-zinc-500">{emptyMessage}</li>
        )}
        {items.map((item, index) => {
          const key = getKey(item);
          return (
            <li
              key={key}
              id={`${id}-option-${key}`}
              role="option"
              aria-selected={index === active}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => onSelect(item)}
              className={cn(
                'cursor-pointer px-3 py-2.5',
                index === active ? 'bg-brand-50' : 'bg-white',
              )}
            >
              {renderOption(item)}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
