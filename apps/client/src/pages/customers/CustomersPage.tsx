import type { Customer } from '@vidly/shared';
import { Pencil, Plus, ReceiptText, Trash2, UsersRound } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { toast } from 'sonner';
import { useCustomers, useDeleteCustomer } from '../../api/customers';
import { useCurrentUser } from '../../auth/context';
import { GoldBadge } from '../../components/GoldBadge';
import { Badge } from '../../components/ui/Badge';
import { Button, LinkButton } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { ConfirmDialog } from '../../components/ui/Dialog';
import { controlClasses } from '../../components/ui/styles';
import { PageHeader } from '../../components/ui/PageHeader';
import { Pagination } from '../../components/ui/Pagination';
import { SearchInput } from '../../components/ui/SearchInput';
import { EmptyState, ErrorState } from '../../components/ui/States';
import { SkeletonRows, SortableTh, Table, TBody, Td, Th, THead } from '../../components/ui/Table';
import { useUrlState } from '../../hooks/useUrlState';
import { errorMessage } from '../../lib/api-client';
import { cn } from '../../lib/cn';
import { formatDate } from '../../lib/format';

const SORTS = ['name', 'createdAt'] as const;
const TIERS = ['all', 'gold', 'regular'] as const;

export default function CustomersPage() {
  const user = useCurrentUser();
  const url = useUrlState();
  const search = url.getString('q');
  const tier = url.getOneOf('tier', TIERS, 'all');
  const sort = url.getOneOf('sort', SORTS, 'name');
  const order = url.getOneOf('order', ['asc', 'desc'] as const, 'asc');
  const page = url.getPage();

  const customers = useCustomers({
    page,
    pageSize: 10,
    search: search || undefined,
    gold: tier === 'all' ? undefined : tier === 'gold',
    sort,
    order,
  });
  const deleteCustomer = useDeleteCustomer();
  const [deleting, setDeleting] = useState<Customer | null>(null);
  const onSort = (field: (typeof SORTS)[number], nextOrder: 'asc' | 'desc') =>
    url.update({ sort: field, order: nextOrder });
  const filtered = Boolean(search || tier !== 'all');

  return (
    <>
      <PageHeader
        title="Customers"
        description="Members who can rent movies."
        actions={
          <LinkButton to="/customers/new">
            <Plus aria-hidden />
            Add customer
          </LinkButton>
        }
      />

      <Card>
        <div className="flex flex-col gap-3 border-b border-zinc-100 p-4 sm:flex-row">
          <SearchInput
            label="Search customers"
            placeholder="Name, phone or email…"
            value={search}
            onChange={(q) => url.update({ q })}
            className="sm:max-w-xs sm:flex-1"
          />
          <select
            aria-label="Membership"
            value={tier}
            onChange={(event) =>
              url.update({ tier: event.target.value === 'all' ? '' : event.target.value })
            }
            className={cn(controlClasses(), 'sm:w-44')}
          >
            <option value="all">All members</option>
            <option value="gold">Gold members</option>
            <option value="regular">Regular members</option>
          </select>
        </div>

        {customers.error ? (
          <ErrorState error={customers.error} onRetry={() => void customers.refetch()} />
        ) : customers.data?.total === 0 ? (
          filtered ? (
            <EmptyState
              icon={UsersRound}
              title="No customers match your filters"
              action={
                <Button variant="secondary" onClick={() => url.update({ q: '', tier: '' })}>
                  Clear filters
                </Button>
              }
            />
          ) : (
            <EmptyState
              icon={UsersRound}
              title="No customers yet"
              action={<LinkButton to="/customers/new">Add a customer</LinkButton>}
            />
          )
        ) : (
          <>
            <Table className={cn(customers.isPlaceholderData && 'opacity-60 transition-opacity')}>
              <THead>
                <tr>
                  <SortableTh field="name" label="Name" sort={sort} order={order} onSort={onSort} />
                  <Th>Contact</Th>
                  <Th>Rentals</Th>
                  <SortableTh
                    field="createdAt"
                    label="Member since"
                    sort={sort}
                    order={order}
                    onSort={onSort}
                    className="hidden md:table-cell"
                  />
                  <Th>
                    <span className="sr-only">Actions</span>
                  </Th>
                </tr>
              </THead>
              <TBody>
                {customers.isPending ? (
                  <SkeletonRows columns={5} />
                ) : (
                  customers.data?.items.map((customer) => (
                    <tr key={customer._id} className="hover:bg-zinc-50/60">
                      <Td>
                        <div className="flex items-center gap-2">
                          <Link
                            to={`/customers/${customer._id}`}
                            className="font-medium text-zinc-900 hover:text-brand-700"
                          >
                            {customer.name}
                          </Link>
                          {customer.isGold && <GoldBadge />}
                        </div>
                      </Td>
                      <Td>
                        <div>{customer.phone}</div>
                        {customer.email && (
                          <div className="text-xs text-zinc-500">{customer.email}</div>
                        )}
                      </Td>
                      <Td>
                        {customer.activeRentals ? (
                          <Badge tone="brand">{customer.activeRentals} out</Badge>
                        ) : (
                          <span className="text-zinc-400">None out</span>
                        )}
                      </Td>
                      <Td className="hidden md:table-cell">{formatDate(customer.createdAt)}</Td>
                      <Td>
                        <div className="flex justify-end gap-1">
                          <LinkButton
                            variant="ghost"
                            size="sm"
                            to={`/rentals/new?customerId=${customer._id}`}
                            aria-label={`New rental for ${customer.name}`}
                          >
                            <ReceiptText aria-hidden />
                            Rent
                          </LinkButton>
                          <LinkButton
                            variant="ghost"
                            size="icon"
                            to={`/customers/${customer._id}`}
                            aria-label={`Edit ${customer.name}`}
                          >
                            <Pencil aria-hidden />
                          </LinkButton>
                          {user.isAdmin && (
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label={`Delete ${customer.name}`}
                              className="hover:bg-red-50 hover:text-red-600"
                              onClick={() => setDeleting(customer)}
                            >
                              <Trash2 aria-hidden />
                            </Button>
                          )}
                        </div>
                      </Td>
                    </tr>
                  ))
                )}
              </TBody>
            </Table>
            {customers.data && (
              <Pagination {...customers.data} onPageChange={(next) => url.update({ page: next })} />
            )}
          </>
        )}
      </Card>

      <ConfirmDialog
        open={deleting !== null}
        title="Delete customer?"
        description={
          <>
            <strong className="font-medium text-zinc-900">{deleting?.name}</strong> will be removed.
            Their rental history is kept.
          </>
        }
        confirmLabel="Delete customer"
        loading={deleteCustomer.isPending}
        onClose={() => setDeleting(null)}
        onConfirm={() =>
          deleting &&
          deleteCustomer.mutate(deleting._id, {
            onSuccess: () => toast.success(`Deleted ${deleting.name}`),
            onError: (error) => toast.error(errorMessage(error)),
            onSettled: () => setDeleting(null),
          })
        }
      />
    </>
  );
}
