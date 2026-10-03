import { LOW_STOCK_THRESHOLD } from '@vidly/shared';
import { Badge } from './ui/Badge';

export function StockBadge({ stock }: { stock: number }) {
  if (stock === 0) return <Badge tone="red">Out of stock</Badge>;
  if (stock <= LOW_STOCK_THRESHOLD) return <Badge tone="amber">{stock} left</Badge>;
  return <Badge tone="green">{stock} in stock</Badge>;
}
