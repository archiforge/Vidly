/** Shapes returned by the Vidly REST API. Dates are ISO-8601 strings on the wire. */

interface Timestamps {
  createdAt: string;
  updatedAt: string;
}

export interface Genre extends Timestamps {
  _id: string;
  name: string;
  /** Number of movies in this genre (included in list responses). */
  movieCount?: number;
}

export interface Movie extends Timestamps {
  _id: string;
  title: string;
  genre: Pick<Genre, '_id' | 'name'>;
  numberInStock: number;
  dailyRentalRate: number;
}

export interface Customer extends Timestamps {
  _id: string;
  name: string;
  phone: string;
  email?: string;
  isGold: boolean;
  /** Number of movies currently checked out (included in list responses). */
  activeRentals?: number;
}

export interface Rental extends Timestamps {
  _id: string;
  customer: Pick<Customer, '_id' | 'name' | 'phone' | 'isGold'>;
  movie: Pick<Movie, '_id' | 'title' | 'dailyRentalRate'>;
  dateOut: string;
  dateReturned?: string;
  rentalFee?: number;
}

export interface User extends Timestamps {
  _id: string;
  name: string;
  email: string;
  isAdmin: boolean;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface DashboardStats {
  counts: {
    movies: number;
    genres: number;
    customers: number;
    goldCustomers: number;
  };
  inventory: {
    totalCopies: number;
    outOfStock: number;
    lowStock: number;
  };
  rentals: {
    active: number;
    returned: number;
    last30Days: number;
    revenue: number;
    revenueLast30Days: number;
  };
  topMovies: { _id: string; title: string; rentals: number }[];
  recentRentals: Rental[];
}

export interface HealthStatus {
  status: 'ok' | 'degraded';
  database: 'connected' | 'disconnected';
  uptime: number;
  version: string;
}

export interface ApiErrorDetail {
  path: string;
  message: string;
}

export interface ApiErrorBody {
  error: {
    message: string;
    code: string;
    details?: ApiErrorDetail[];
  };
}

export interface PublicConfig {
  allowRegistration: boolean;
}
