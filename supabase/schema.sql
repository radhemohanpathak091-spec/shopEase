-- ============================================================================
-- shopEase — Supabase PostgreSQL Schema & Row Level Security (RLS)
-- Paste this entire script into the Supabase SQL Editor and click "Run".
-- ============================================================================

-- 1. Helper function to automatically update `updated_at` timestamps
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- 2. PROFILES (1-to-1 with auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text not null,
  dob date,
  phone text,
  default_address jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles
  add column if not exists name text,
  add column if not exists email text,
  add column if not exists dob date,
  add column if not exists phone text,
  add column if not exists default_address jsonb,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute function public.handle_updated_at();

alter table public.profiles enable row level security;

drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "Users can delete own profile" on public.profiles;
create policy "Users can delete own profile"
  on public.profiles for delete
  using (auth.uid() = id);

-- Automatically create a profile row whenever a new user signs up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, name, email)
  values (
    new.id,
    coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'name'), ''),
      split_part(coalesce(new.email, 'Shopper'), '@', 1)
    ),
    coalesce(new.email, '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 3. CATEGORIES (Storefront departments — public read)
create table if not exists public.categories (
  id text primary key,
  title text not null,
  subtitle text not null,
  image text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_categories_updated_at on public.categories;
create trigger set_categories_updated_at
  before update on public.categories
  for each row execute function public.handle_updated_at();

alter table public.categories enable row level security;

drop policy if exists "Categories are publicly readable" on public.categories;
create policy "Categories are publicly readable"
  on public.categories for select
  using (true);

insert into public.categories (id, title, subtitle, image, sort_order)
values
  ('electronics', 'Tech Goods', 'Audio, Keyboards, Mice & Docks', '/src/assets/images/product_anc_headphones_1795513367126.jpg', 1),
  ('apparel', 'Fashion', 'Jeans, Korean Pants & Shirts', '/src/assets/images/clothes_korean_pants_1795521624857.jpg', 2),
  ('footwear', 'Footwear', 'Sneakers, Loafers, Boots & Slides', '/src/assets/images/product_leather_sneakers_1795523787294.jpg', 3),
  ('home-living', 'Home & Living', 'Ceramics, Throws, Lamps & Candles', '/src/assets/images/product_pourover_set_1795523787352.jpg', 4),
  ('accessories', 'Accessories', 'Bags, Watches, Eyewear & Leather', '/src/assets/images/product_leather_tote_1795513368076.jpg', 5),
  ('beauty', 'Beauty', 'Serums, Cleansers, SPF & Balms', '/src/assets/images/product_hydration_serum_1795523788162.jpg', 6)
on conflict (id) do nothing;

-- 4. PRODUCTS (Catalog items — public read)
create table if not exists public.products (
  id text primary key,
  sku text not null unique,
  name text not null,
  brand text not null,
  category_id text not null references public.categories(id) on delete restrict,
  sub_category text,
  category_label text not null,
  price integer not null check (price >= 0),
  rating numeric(2,1) not null default 5.0,
  review_count integer not null default 0,
  in_stock boolean not null default true,
  trending boolean not null default false,
  best_seller boolean not null default false,
  tag text,
  material text not null,
  description text not null,
  image text not null,
  variants jsonb not null default '[]'::jsonb,
  variant_label text not null,
  specs jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_products_updated_at on public.products;
create trigger set_products_updated_at
  before update on public.products
  for each row execute function public.handle_updated_at();

alter table public.products enable row level security;

drop policy if exists "Products are publicly readable" on public.products;
create policy "Products are publicly readable"
  on public.products for select
  using (true);

-- 5. CART ITEMS (Per-user shopping bag)
create table if not exists public.cart_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id text not null,
  variant text not null,
  quantity integer not null default 1 check (quantity between 1 and 20),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, product_id, variant)
);

create index if not exists cart_items_user_id_idx on public.cart_items(user_id);

drop trigger if exists set_cart_items_updated_at on public.cart_items;
create trigger set_cart_items_updated_at
  before update on public.cart_items
  for each row execute function public.handle_updated_at();

alter table public.cart_items enable row level security;

drop policy if exists "Users can view own cart items" on public.cart_items;
create policy "Users can view own cart items"
  on public.cart_items for select
  using (auth.uid() = user_id);

drop policy if exists "Users can add own cart items" on public.cart_items;
create policy "Users can add own cart items"
  on public.cart_items for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own cart items" on public.cart_items;
create policy "Users can update own cart items"
  on public.cart_items for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own cart items" on public.cart_items;
create policy "Users can delete own cart items"
  on public.cart_items for delete
  using (auth.uid() = user_id);

-- 6. WISHLIST ITEMS (Per-user saved products)
create table if not exists public.wishlist_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id text not null,
  created_at timestamptz not null default now(),
  unique (user_id, product_id)
);

create index if not exists wishlist_items_user_id_idx on public.wishlist_items(user_id);

alter table public.wishlist_items enable row level security;

drop policy if exists "Users can view own wishlist items" on public.wishlist_items;
create policy "Users can view own wishlist items"
  on public.wishlist_items for select
  using (auth.uid() = user_id);

drop policy if exists "Users can add own wishlist items" on public.wishlist_items;
create policy "Users can add own wishlist items"
  on public.wishlist_items for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own wishlist items" on public.wishlist_items;
create policy "Users can update own wishlist items"
  on public.wishlist_items for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own wishlist items" on public.wishlist_items;
create policy "Users can delete own wishlist items"
  on public.wishlist_items for delete
  using (auth.uid() = user_id);

-- 7. ORDERS (Per-user placed orders & tracking)
create table if not exists public.orders (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  subtotal integer not null check (subtotal >= 0),
  shipping_cost integer not null check (shipping_cost >= 0),
  tax_amount integer not null check (tax_amount >= 0),
  total integer not null check (total >= 0),
  shipping_address jsonb not null,
  payment_method text not null check (payment_method in ('card', 'cod')),
  status text not null default 'Confirmed — Preparing Shipment',
  tracking_number text not null,
  estimated_delivery timestamptz not null,
  tracking_step smallint not null default 1 check (tracking_step between 0 and 3),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists orders_user_created_idx on public.orders(user_id, created_at desc);

drop trigger if exists set_orders_updated_at on public.orders;
create trigger set_orders_updated_at
  before update on public.orders
  for each row execute function public.handle_updated_at();

alter table public.orders enable row level security;

create unique index if not exists cart_items_user_product_variant_uidx
  on public.cart_items(user_id, product_id, variant);
create unique index if not exists wishlist_items_user_product_uidx
  on public.wishlist_items(user_id, product_id);

drop policy if exists "Users can view own orders" on public.orders;
create policy "Users can view own orders"
  on public.orders for select
  using (auth.uid() = user_id);

drop policy if exists "Users can create own orders" on public.orders;
create policy "Users can create own orders"
  on public.orders for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own orders" on public.orders;
create policy "Users can update own orders"
  on public.orders for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own orders" on public.orders;
create policy "Users can delete own orders"
  on public.orders for delete
  using (auth.uid() = user_id);

-- 8. ORDER ITEMS (Line-item snapshots per order)
create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id text not null references public.orders(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id text not null,
  name text not null,
  brand text not null,
  variant text not null,
  quantity integer not null check (quantity >= 1),
  unit_price integer not null check (unit_price >= 0),
  image text not null,
  created_at timestamptz not null default now()
);

create index if not exists order_items_order_id_idx on public.order_items(order_id);
create index if not exists order_items_user_id_idx on public.order_items(user_id);

alter table public.order_items enable row level security;

drop policy if exists "Users can view own order items" on public.order_items;
create policy "Users can view own order items"
  on public.order_items for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own order items" on public.order_items;
create policy "Users can insert own order items"
  on public.order_items for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own order items" on public.order_items;
create policy "Users can update own order items"
  on public.order_items for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own order items" on public.order_items;
create policy "Users can delete own order items"
  on public.order_items for delete
  using (auth.uid() = user_id);

-- 9. GRANT TABLE & SEQUENCE PRIVILEGES FOR ALL TABLES
grant usage on schema public to anon, authenticated;
grant select on public.categories, public.products to anon, authenticated;
grant select, insert, update, delete on public.profiles, public.cart_items, public.wishlist_items, public.orders, public.order_items to authenticated;
grant usage, select on all sequences in schema public to authenticated;

alter default privileges in schema public grant select on tables to anon;
alter default privileges in schema public grant select, insert, update, delete on tables to authenticated;

-- 10. Backfill profiles for any users who signed up before running this script
insert into public.profiles (id, name, email)
select
  u.id,
  coalesce(nullif(trim(u.raw_user_meta_data ->> 'name'), ''), split_part(coalesce(u.email, 'Shopper'), '@', 1)),
  coalesce(u.email, '')
from auth.users u
on conflict (id) do nothing;


