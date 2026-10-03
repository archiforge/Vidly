import { zodResolver } from '@hookform/resolvers/zod';
import { customerInputSchema, type Customer } from '@vidly/shared';
import { ReceiptText } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router';
import { toast } from 'sonner';
import { useCustomer, useSaveCustomer } from '../../api/customers';
import { useRentals } from '../../api/rentals';
import { RentalsTable } from '../../components/RentalsTable';
import { Button, LinkButton } from '../../components/ui/Button';
import { Card, CardHeader } from '../../components/ui/Card';
import { CheckboxField, TextField } from '../../components/ui/Form';
import { PageHeader } from '../../components/ui/PageHeader';
import { Pagination } from '../../components/ui/Pagination';
import { PageSpinner } from '../../components/ui/Spinner';
import { EmptyState, ErrorState } from '../../components/ui/States';
import { ApiError } from '../../lib/api-client';
import { formatDate } from '../../lib/format';
import { handleFormError } from '../../lib/form-errors';
import { NotFoundPage } from '../ErrorPages';

function CustomerForm({ customer }: { customer?: Customer }) {
  const navigate = useNavigate();
  const save = useSaveCustomer();
  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isDirty },
  } = useForm({
    resolver: zodResolver(customerInputSchema),
    defaultValues: {
      name: customer?.name ?? '',
      phone: customer?.phone ?? '',
      email: customer?.email ?? '',
      isGold: customer?.isGold ?? false,
    },
  });

  const onSubmit = handleSubmit((values) =>
    save.mutate(
      { ...values, id: customer?._id },
      {
        onSuccess: (saved) => {
          if (customer) {
            toast.success('Customer updated');
            reset({
              name: saved.name,
              phone: saved.phone,
              email: saved.email ?? '',
              isGold: saved.isGold,
            });
          } else {
            toast.success(`Added ${saved.name}`);
            navigate(`/customers/${saved._id}`, { replace: true });
          }
        },
        onError: (error) => handleFormError(error, setError, ['name', 'phone', 'email', 'isGold']),
      },
    ),
  );

  return (
    <Card>
      <CardHeader
        title="Details"
        description={customer && `Member since ${formatDate(customer.createdAt)}`}
      />
      {/* Laid out by the card's own width, since it shares the row with the rental history. */}
      <form noValidate onSubmit={onSubmit} className="@container">
        <div className="grid gap-5 p-5 @md:grid-cols-2">
          <TextField
            label="Full name"
            className="@md:col-span-2"
            autoComplete="off"
            autoFocus={!customer}
            error={errors.name?.message}
            {...register('name')}
          />
          <TextField
            label="Phone"
            type="tel"
            error={errors.phone?.message}
            {...register('phone')}
          />
          <TextField
            label="Email (optional)"
            type="email"
            error={errors.email?.message}
            {...register('email')}
          />
          <CheckboxField
            className="@md:col-span-2"
            label="Gold member"
            description="Gold members are highlighted at checkout."
            {...register('isGold')}
          />
        </div>
        <div className="flex justify-end gap-2 border-t border-zinc-100 px-5 py-4">
          <LinkButton variant="secondary" to="/customers">
            {customer ? 'Back' : 'Cancel'}
          </LinkButton>
          <Button type="submit" loading={save.isPending} disabled={Boolean(customer) && !isDirty}>
            {customer ? 'Save changes' : 'Add customer'}
          </Button>
        </div>
      </form>
    </Card>
  );
}

function RentalHistory({ customer }: { customer: Customer }) {
  const [page, setPage] = useState(1);
  const rentals = useRentals({ customerId: customer._id, page, pageSize: 5 });

  return (
    <Card>
      <CardHeader
        title="Rental history"
        actions={
          <LinkButton size="sm" to={`/rentals/new?customerId=${customer._id}`}>
            <ReceiptText aria-hidden />
            New rental
          </LinkButton>
        }
      />
      {rentals.error ? (
        <ErrorState error={rentals.error} onRetry={() => void rentals.refetch()} />
      ) : rentals.data?.total === 0 ? (
        <EmptyState
          icon={ReceiptText}
          title="No rentals yet"
          description={`${customer.name} hasn’t rented anything.`}
        />
      ) : (
        <>
          <RentalsTable
            rentals={rentals.data?.items}
            loading={rentals.isPending}
            dimmed={rentals.isPlaceholderData}
            showCustomer={false}
          />
          {rentals.data && <Pagination {...rentals.data} onPageChange={setPage} />}
        </>
      )}
    </Card>
  );
}

export default function CustomerDetailPage() {
  const { id } = useParams();
  const customer = useCustomer(id);

  if (customer.error instanceof ApiError && customer.error.status === 404) return <NotFoundPage />;

  if (!id) {
    return (
      <>
        <PageHeader title="Add customer" description="Register a new member." />
        <div className="max-w-2xl">
          <CustomerForm />
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={customer.data?.name ?? 'Customer'}
        description="Contact details and rentals."
      />
      {customer.isPending ? (
        <PageSpinner />
      ) : customer.error ? (
        <Card>
          <ErrorState error={customer.error} onRetry={() => void customer.refetch()} />
        </Card>
      ) : (
        <div className="grid gap-6 xl:grid-cols-3">
          <div>
            <CustomerForm key={customer.data._id} customer={customer.data} />
          </div>
          <div className="xl:col-span-2">
            <RentalHistory customer={customer.data} />
          </div>
        </div>
      )}
    </>
  );
}
