export type ProductCategory = 'apparel' | 'accessories' | 'electronics';

export interface ProductSpec {
  label: string;
  value: string;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  brand: string;
  category: ProductCategory;
  categoryLabel: string;
  price: number;
  rating: number;
  reviewCount: number;
  inStock: boolean;
  tag?: string;
  material: string;
  description: string;
  image: string;
  variants: string[];
  variantLabel: string;
  specs: ProductSpec[];
}

export interface CartItem {
  productId: string;
  variant: string;
  quantity: number;
}

export interface ShippingAddress {
  fullName: string;
  street: string;
  city: string;
  postalCode: string;
  country: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  dob?: string;
  phone?: string;
  defaultAddress?: ShippingAddress;
  createdAt: string;
}

export type PaymentMethod = 'card' | 'cod';

export interface OrderItemSnapshot {
  productId: string;
  name: string;
  brand: string;
  variant: string;
  quantity: number;
  unitPrice: number;
  image: string;
}

export interface Order {
  id: string;
  userId: string;
  items: OrderItemSnapshot[];
  subtotal: number;
  shippingCost: number;
  taxAmount: number;
  total: number;
  shippingAddress: ShippingAddress;
  paymentMethod: PaymentMethod;
  status: 'Confirmed — Preparing Shipment';
  trackingNumber?: string;
  estimatedDelivery?: string;
  trackingStep?: 0 | 1 | 2 | 3;
  createdAt: string;
}
