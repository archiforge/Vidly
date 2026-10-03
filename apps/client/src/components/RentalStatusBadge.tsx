import type { Rental } from '@vidly/shared';
import { Badge } from './ui/Badge';

export function RentalStatusBadge({ rental }: { rental: Pick<Rental, 'dateReturned'> }) {
  return rental.dateReturned ? (
    <Badge tone="gray">Returned</Badge>
  ) : (
    <Badge tone="brand">Out</Badge>
  );
}
