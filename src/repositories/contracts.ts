import type { CreateOrderInput, PlacedOrder } from '@/features/orders/model';
import type {
  LoyaltyAccount,
  Order,
  Product,
  Promotion,
  Store,
  User,
} from '@/types/domain';
import type {
  CatalogRequest,
  CatalogPage,
  CatalogMetadata,
} from '@/features/catalog/model';
import type { AuthChallenge, AuthUser } from '@/features/auth/types';
export interface RequestOptions {
  signal?: AbortSignal;
}
export interface ProductFilters {
  storeId?: string;
  commerceGroup?: Product['commerceGroup'];
  servingType?: Product['servingType'];
  availability?: Product['availability'];
}
export interface PromotionFilters {
  storeId?: string;
  /** Active at this ISO timestamp; adapters must apply start/end boundaries. */
  activeAt: string;
}
export interface PromotionRepository {
  list(
    filters: PromotionFilters,
    options?: RequestOptions,
  ): Promise<Promotion[]>;
}
export interface ProductRepository {
  recommendations(
    id: string,
    storeId?: string,
    options?: RequestOptions,
  ): Promise<{ pairings: Product[]; related: Product[] }>;
  searchProducts(
    request: CatalogRequest,
    options?: RequestOptions,
  ): Promise<CatalogPage>;
  catalogMetadata(options?: RequestOptions): Promise<CatalogMetadata>;
  list(filters?: ProductFilters, options?: RequestOptions): Promise<Product[]>;
  getById(id: string, options?: RequestOptions): Promise<Product | null>;
}
export interface StoreRepository {
  list(options?: RequestOptions): Promise<Store[]>;
  getById(id: string, options?: RequestOptions): Promise<Store | null>;
}
export interface OrderRepository {
  create(input: CreateOrderInput): Promise<PlacedOrder>;
  getById(id: string, options?: RequestOptions): Promise<PlacedOrder | null>;
  list(options?: RequestOptions): Promise<Order[]>;
}
export interface UserRepository {
  getCurrent(options?: RequestOptions): Promise<User | null>;
  updateCurrent(fields: {
    name: string;
    phone: string;
    email?: string;
  }): Promise<User>;
}
export interface LoyaltyRepository {
  getCurrent(options?: RequestOptions): Promise<LoyaltyAccount | null>;
}
export interface AuthRepository {
  requestOtp(phone: string): Promise<AuthChallenge>;
  getPendingChallenge(): Promise<AuthChallenge | null>;
  verifyOtp(challengeId: string, code: string): Promise<AuthUser>;
  restoreSession(): Promise<AuthUser | null>;
  updateProfile(fields: { name: string; email?: string }): Promise<AuthUser>;
  signOut(): Promise<void>;
  cancelChallenge(challengeId: string): Promise<void>;
  /** Only implemented by explicitly enabled internal demo adapters. */
  development?: {
    failNextRequest(): void;
    expireChallenge(): Promise<void>;
    allowResend(): Promise<void>;
    expireSession(): Promise<void>;
  };
}
export interface Repositories {
  auth: AuthRepository;
  promotions: PromotionRepository;
  products: ProductRepository;
  stores: StoreRepository;
  orders: OrderRepository;
  users: UserRepository;
  loyalty: LoyaltyRepository;
}
