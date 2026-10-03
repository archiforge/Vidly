import { Search, X } from 'lucide-react';
import { useEffect, useEffectEvent, useState } from 'react';
import { cn } from '../../lib/cn';
import { controlClasses } from './styles';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  label: string;
  placeholder?: string;
  className?: string;
  delay?: number;
}

/** Search box that reports changes after the user pauses typing. */
export function SearchInput({
  value,
  onChange,
  label,
  placeholder,
  className,
  delay = 300,
}: SearchInputProps) {
  const [draft, setDraft] = useState(value);
  const [previousValue, setPreviousValue] = useState(value);

  // Adopt external changes (e.g. filters cleared elsewhere), but not the echo of our own
  // update: the parent may apply it asynchronously (URL state), and the user may have
  // typed a trailing space that trimming would otherwise eat.
  if (value !== previousValue) {
    setPreviousValue(value);
    if (value !== draft.trim()) setDraft(value);
  }

  const commit = (next: string) => onChange(next);
  const commitAfterPause = useEffectEvent(commit);

  useEffect(() => {
    if (draft.trim() === value) return;
    const timer = setTimeout(() => commitAfterPause(draft.trim()), delay);
    return () => clearTimeout(timer);
  }, [draft, value, delay]);

  return (
    <div className={cn('relative', className)}>
      <Search
        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-zinc-400"
        aria-hidden
      />
      <input
        type="search"
        aria-label={label}
        placeholder={placeholder ?? label}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') commit(draft.trim());
        }}
        className={cn(controlClasses(), 'pr-8 pl-9 [&::-webkit-search-cancel-button]:hidden')}
      />
      {draft && (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => {
            setDraft('');
            commit('');
          }}
          className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-0.5 text-zinc-400 hover:text-zinc-700"
        >
          <X className="size-4" />
        </button>
      )}
    </div>
  );
}
