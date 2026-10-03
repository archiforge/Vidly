import type { RentalStatus } from '@vidly/shared';
import { Plus, ReceiptText } from 'lucide-react';
import { RentalsTable, type RentalSort } from '../../components/RentalsTable';
import { Button, LinkButton } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { PageHeader } from '../../components/ui/PageHeader';
import { Pagination } from '../../components/ui/Pagination';
import { SearchInput } from '../../components/ui/SearchInput';
import { EmptyState, ErrorState } from '../../components/ui/States';
import { useRentals } from '../../api/rentals';
import { useUrlState } from '../../hooks/useUrlState';
import { cn } from '../../lib/cn';

const TABS: { value: RentalStatus; label: string }[] = [
  { value: 'active', label: 'Out now' },
  { value: 'returned', label: 'Returned' },
  { value: 'all', label: 'All' },
];

const SORTS = ['dateOut', 'dateReturned', 'rentalFee'] as const;

export default function RentalsPage() {
  const url = useUrlState();
  const status = url.getOneOf('status', ['active', 'returned', 'all'] as const, 'active');
  const search = url.getString('q');
  const sort = url.getOneOf('sort', SORTS, 'dateOut');
  const order = url.getOneOf('order', ['asc', 'desc'] as const, 'desc');
  const page = url.getPage();

  const rentals = useRentals({
    status,
    search: search || undefined,
    sort,
    order,
    page,
    pageSize: 10,
  });

  return (
    <>
      <PageHeader
        title="Rentals"
        description="Check movies out to customers and process returns."
        actions={
          <LinkButton to="/rentals/new">
            <Plus aria-hidden />
            New rental
          </LinkButton>
        }
      />

      <Card>
        <div className="flex flex-col gap-3 border-b border-zinc-100 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div
            role="tablist"
            aria-label="Rental status"
            className="inline-flex rounded-lg bg-zinc-100 p-1"
          >
            {TABS.map((tab) => (
              <button
                key={tab.value}
                role="tab"
                type="button"
                aria-selected={status === tab.value}
                onClick={() => url.update({ status: tab.value === 'active' ? '' : tab.value })}
                className={cn(
                  'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                  status === tab.value
                    ? 'bg-white text-zinc-900 shadow-sm'
                    : 'text-zinc-600 hover:text-zinc-900',
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <SearchInput
            label="Search rentals"
            placeholder="Customer, phone or movie…"
            value={search}
            onChange={(q) => url.update({ q })}
            className="sm:w-72"
          />
        </div>

        {rentals.error ? (
          <ErrorState error={rentals.error} onRetry={() => void rentals.refetch()} />
        ) : rentals.data?.total === 0 ? (
          search ? (
            <EmptyState
              icon={ReceiptText}
              title="No rentals match your search"
              action={
                <Button variant="secondary" onClick={() => url.update({ q: '' })}>
                  Clear search
                </Button>
              }
            />
          ) : (
            <EmptyState
              icon={ReceiptText}
              title={status === 'active' ? 'Nothing is checked out' : 'No rentals yet'}
              description="New rentals will appear here."
              action={<LinkButton to="/rentals/new">New rental</LinkButton>}
            />
          )
        ) : (
          <>
            <RentalsTable
              rentals={rentals.data?.items}
              loading={rentals.isPending}
              dimmed={rentals.isPlaceholderData}
              sorting={{
                sort,
                order,
                onSort: (field: RentalSort, nextOrder) =>
                  url.update({ sort: field, order: nextOrder }),
              }}
            />
            {rentals.data && (
              <Pagination {...rentals.data} onPageChange={(next) => url.update({ page: next })} />
            )}
          </>
        )}
      </Card>
    </>
  );
}
