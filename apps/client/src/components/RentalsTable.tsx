import { billableDays, calculateRentalFee, type Rental } from '@vidly/shared';
import { RotateCcw, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { toast } from 'sonner';
import { useDeleteRental, useReturnRental } from '../api/rentals';
import { useNow } from '../hooks/useNow';
import { useCurrentUser } from '../auth/context';
import { errorMessage } from '../lib/api-client';
import { cn } from '../lib/cn';
import { formatCurrency, formatDate, formatRelativeDays, pluralize } from '../lib/format';
import { GoldBadge } from './GoldBadge';
import { RentalStatusBadge } from './RentalStatusBadge';
import { Button } from './ui/Button';
import { ConfirmDialog } from './ui/Dialog';
import { SkeletonRows, SortableTh, Table, TBody, Td, Th, THead, type SortOrder } from './ui/Table';

export type RentalSort = 'dateOut' | 'dateReturned' | 'rentalFee';

interface RentalsTableProps {
  rentals: Rental[] | undefined;
  loading: boolean;
  dimmed?: boolean;
  showCustomer?: boolean;
  sorting?: {
    sort: RentalSort;
    order: SortOrder;
    onSort: (sort: RentalSort, order: SortOrder) => void;
  };
}

function ReturnSummary({ rental }: { rental: Rental }) {
  const now = useNow();
  const days = billableDays(rental.dateOut, now);
  const fee = calculateRentalFee(rental.dateOut, now, rental.movie.dailyRentalRate);
  const rows: [string, React.ReactNode][] = [
    ['Customer', rental.customer.name],
    ['Movie', rental.movie.title],
    ['Checked out', `${formatDate(rental.dateOut)} (${formatRelativeDays(rental.dateOut, now)})`],
    [
      'Billable days',
      `${pluralize(days, 'day')} × ${formatCurrency(rental.movie.dailyRentalRate)}`,
    ],
  ];
  return (
    <dl className="divide-y divide-zinc-100 rounded-lg bg-zinc-50 px-4 text-sm ring-1 ring-zinc-200">
      {rows.map(([label, value]) => (
        <div key={label} className="flex justify-between gap-4 py-2">
          <dt className="text-zinc-500">{label}</dt>
          <dd className="text-right font-medium text-zinc-900">{value}</dd>
        </div>
      ))}
      <div className="flex justify-between gap-4 py-2.5">
        <dt className="font-medium text-zinc-900">Amount due</dt>
        <dd className="text-base font-semibold text-zinc-900 tabular-nums">
          {formatCurrency(fee)}
        </dd>
      </div>
    </dl>
  );
}

export function RentalsTable({
  rentals,
  loading,
  dimmed,
  showCustomer = true,
  sorting,
}: RentalsTableProps) {
  const user = useCurrentUser();
  const returnRental = useReturnRental();
  const deleteRental = useDeleteRental();
  const [returning, setReturning] = useState<Rental | null>(null);
  const [deleting, setDeleting] = useState<Rental | null>(null);
  const now = useNow();

  const header = (field: RentalSort, label: string, className?: string) =>
    sorting ? (
      <SortableTh field={field} label={label} className={className} {...sorting} />
    ) : (
      <Th className={className}>{label}</Th>
    );

  return (
    <>
      <Table className={cn(dimmed && 'opacity-60 transition-opacity')}>
        <THead>
          <tr>
            {showCustomer && <Th>Customer</Th>}
            <Th>Movie</Th>
            {header('dateOut', 'Checked out')}
            {header('dateReturned', 'Returned')}
            {header('rentalFee', 'Fee', 'text-right')}
            <Th>
              <span className="sr-only">Actions</span>
            </Th>
          </tr>
        </THead>
        <TBody>
          {loading ? (
            <SkeletonRows columns={showCustomer ? 6 : 5} />
          ) : (
            rentals?.map((rental) => {
              const active = !rental.dateReturned;
              return (
                <tr key={rental._id} className="hover:bg-zinc-50/60">
                  {showCustomer && (
                    <Td>
                      <div className="flex items-center gap-2">
                        <Link
                          to={`/customers/${rental.customer._id}`}
                          className="font-medium text-zinc-900 hover:text-brand-700"
                        >
                          {rental.customer.name}
                        </Link>
                        {rental.customer.isGold && <GoldBadge />}
                      </div>
                      <div className="text-xs text-zinc-500">{rental.customer.phone}</div>
                    </Td>
                  )}
                  <Td>
                    <Link to={`/movies/${rental.movie._id}/edit`} className="hover:text-brand-700">
                      {rental.movie.title}
                    </Link>
                    <div className="text-xs text-zinc-500">
                      {formatCurrency(rental.movie.dailyRentalRate)}/day
                    </div>
                  </Td>
                  <Td className="whitespace-nowrap">
                    {formatDate(rental.dateOut)}
                    <div className="text-xs text-zinc-500">
                      {formatRelativeDays(rental.dateOut, now)}
                    </div>
                  </Td>
                  <Td className="whitespace-nowrap">
                    {rental.dateReturned ? (
                      formatDate(rental.dateReturned)
                    ) : (
                      <RentalStatusBadge rental={rental} />
                    )}
                  </Td>
                  <Td className="text-right whitespace-nowrap tabular-nums">
                    {rental.rentalFee !== undefined ? (
                      <span className="font-medium text-zinc-900">
                        {formatCurrency(rental.rentalFee)}
                      </span>
                    ) : (
                      <span className="text-zinc-500">
                        ≈{' '}
                        {formatCurrency(
                          calculateRentalFee(rental.dateOut, now, rental.movie.dailyRentalRate),
                        )}
                        <span className="block text-xs">
                          {pluralize(billableDays(rental.dateOut, now), 'day')} so far
                        </span>
                      </span>
                    )}
                  </Td>
                  <Td>
                    <div className="flex justify-end gap-1">
                      {active && (
                        <Button variant="secondary" size="sm" onClick={() => setReturning(rental)}>
                          <RotateCcw aria-hidden />
                          Return
                        </Button>
                      )}
                      {user.isAdmin && (
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Delete rental of ${rental.movie.title}`}
                          className="hover:bg-red-50 hover:text-red-600"
                          onClick={() => setDeleting(rental)}
                        >
                          <Trash2 aria-hidden />
                        </Button>
                      )}
                    </div>
                  </Td>
                </tr>
              );
            })
          )}
        </TBody>
      </Table>

      <ConfirmDialog
        open={returning !== null}
        tone="primary"
        title="Process return"
        description="The customer is charged for every started day."
        confirmLabel="Confirm return"
        loading={returnRental.isPending}
        onClose={() => setReturning(null)}
        onConfirm={() =>
          returning &&
          returnRental.mutate(returning._id, {
            onSuccess: (rental) =>
              toast.success(`Returned “${rental.movie.title}”`, {
                description: `Charged ${formatCurrency(rental.rentalFee ?? 0)} to ${rental.customer.name}.`,
              }),
            onError: (error) => toast.error(errorMessage(error)),
            onSettled: () => setReturning(null),
          })
        }
      >
        {returning && <ReturnSummary rental={returning} />}
      </ConfirmDialog>

      <ConfirmDialog
        open={deleting !== null}
        title="Delete rental record?"
        description={
          deleting && !deleting.dateReturned
            ? 'This rental is still active. Deleting it puts the copy back in stock without charging the customer.'
            : 'The record will be removed from the rental history and revenue figures.'
        }
        confirmLabel="Delete record"
        loading={deleteRental.isPending}
        onClose={() => setDeleting(null)}
        onConfirm={() =>
          deleting &&
          deleteRental.mutate(deleting._id, {
            onSuccess: () => toast.success('Rental record deleted'),
            onError: (error) => toast.error(errorMessage(error)),
            onSettled: () => setDeleting(null),
          })
        }
      />
    </>
  );
}
