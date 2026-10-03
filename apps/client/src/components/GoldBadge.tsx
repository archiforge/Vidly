import { Crown } from 'lucide-react';
import { Badge } from './ui/Badge';

export function GoldBadge() {
  return (
    <Badge tone="yellow">
      <Crown aria-hidden />
      Gold
    </Badge>
  );
}
