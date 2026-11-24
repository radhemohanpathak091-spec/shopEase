import { useEffect, useState } from 'react';
import type { Session, User as SupabaseUser } from '@supabase/supabase-js';
import { AlertCircle, Eye, EyeOff, LogOut, PackageCheck, User, X } from 'lucide-react';
import { formatINR } from '../data/catalog.ts';
import { supabase } from '../supabaseClient.js';
import type { Order, UserProfile } from '../types/store.ts';
import { ResilientImage } from './ResilientImage.tsx';

export interface AuthSuccessMeta {
  isNewAccount?: boolean;
  email?: string;
  needsConfirmation?: boolean;
  name?: string;
}

interface AuthDrawerProps {
  isOpen: boolean;
  user: UserProfile | null;
  orders: Order[];
  ordersLoading: boolean;
  initialMode?: 'login' | 'register';
  onClose: () => void;
  onAuthSuccess: (
    session: Session | null,
    supabaseUser: SupabaseUser | null,
    meta?: AuthSuccessMeta,
  ) => Promise<void>;
  onBackendAuthSuccess: (
    token: string,
    user: UserProfile,
    meta?: AuthSuccessMeta,
  ) => Promise<void>;
  onLogout: () => Promise<void>;
}

export function AuthDrawer({
  isOpen,
  user,
  orders,
  ordersLoading,
  initialMode = 'login',
  onClose,
  onAuthSuccess,
  onBackendAuthSuccess,
  onLogout,
}: AuthDrawerProps) {
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMode(initialMode);
    setError(null);
  }, [initialMode, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const normalizedEmail = email.trim();
      if (mode === 'login') {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        });
        if (signInError) {
          const fallbackRes = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: normalizedEmail, password }),
          });
          const fallbackData = (await fallbackRes.json()) as {
            token?: string;
            user?: UserProfile;
            error?: string;
          };
          if (fallbackRes.ok && fallbackData.token && fallbackData.user) {
            await onBackendAuthSuccess(fallbackData.token, fallbackData.user);
          } else {
            setError(
              /email not confirmed/i.test(signInError.message)
                ? signInError.message
                : fallbackData.error || signInError.message,
            );
            return;
          }
        } else {
          await onAuthSuccess(data.session, data.user);
        }
      } else {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: normalizedEmail,
          password,
        });
        if (signUpError) {
          const isRateLimited =
            signUpError.status === 429 || /rate limit/i.test(signUpError.message);
          if (!isRateLimited) {
            setError(signUpError.message);
            return;
          }

          const fallbackRes = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: name.trim(),
              email: normalizedEmail,
              password,
            }),
          });
          const fallbackData = (await fallbackRes.json()) as {
            token?: string;
            user?: UserProfile;
            error?: string;
          };
          if (!fallbackRes.ok || !fallbackData.token || !fallbackData.user) {
            setError(fallbackData.error || 'Unable to create account. Please try again.');
            return;
          }
          await onBackendAuthSuccess(fallbackData.token, fallbackData.user, {
            isNewAccount: true,
            email: fallbackData.user.email,
            needsConfirmation: false,
            name: fallbackData.user.name,
          });
          setName('');
        } else {
          if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
            setError('An account with this email already exists. Please sign in.');
            return;
          }
          await onAuthSuccess(data.session, data.user, {
            isNewAccount: true,
            email: data.user?.email || normalizedEmail,
            needsConfirmation: !data.session,
            name: name.trim() || undefined,
          });
          setName('');
        }
      }

      setPassword('');
      if (window.location.pathname !== '/') {
        window.history.pushState(null, '', '/');
      }
      onClose();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-[2px]"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-drawer-title"
    >
      <aside
        className="w-full max-w-md h-full bg-white border-l border-[#E5E4DF] flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-5 border-b border-[#EFEFED] flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <User className="w-4 h-4 text-[#141413]" />
            <h2 id="auth-drawer-title" className="font-display text-lg font-semibold text-[#141413]">
              {user ? 'Your Account' : mode === 'login' ? 'Sign In' : 'Create Account'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close account drawer"
            className="w-10 h-10 flex items-center justify-center rounded-lg text-[#575652] hover:bg-[#F1F0ED] hover:text-[#141413] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {!user ? (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-1 p-1 bg-[#F1F0ED] rounded-lg">
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setError(null);
                  }}
                  className={`min-h-[40px] py-2 px-3 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                    mode === 'login'
                      ? 'bg-white text-[#141413] shadow-xs'
                      : 'text-[#575652] hover:text-[#141413]'
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode('register');
                    setError(null);
                  }}
                  className={`min-h-[40px] py-2 px-3 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                    mode === 'register'
                      ? 'bg-white text-[#141413] shadow-xs'
                      : 'text-[#575652] hover:text-[#141413]'
                  }`}
                >
                  Create Account
                </button>
              </div>

              <p className="text-sm text-[#575652] leading-relaxed">
                {mode === 'login'
                  ? 'Sign in to access your saved shopping bag, express checkout, and order history.'
                  : 'Create an account to save your bag, track deliveries, and speed through checkout.'}
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                {mode === 'register' && (
                  <div>
                    <label htmlFor="auth-name" className="block text-xs font-medium text-[#141413] mb-1.5">
                      Full Name
                    </label>
                    <input
                      id="auth-name"
                      type="text"
                      required
                      minLength={2}
                      maxLength={80}
                      autoComplete="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Jordan Mercer"
                      className="w-full h-11 px-3.5 text-sm bg-white border border-[#D6D5CF] rounded-lg text-[#141413] placeholder:text-[#9E9D97] focus:outline-none focus:border-[#1D4ED8]"
                    />
                  </div>
                )}

                <div>
                  <label htmlFor="auth-email" className="block text-xs font-medium text-[#141413] mb-1.5">
                    Email Address
                  </label>
                  <input
                    id="auth-email"
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full h-11 px-3.5 text-sm bg-white border border-[#D6D5CF] rounded-lg text-[#141413] placeholder:text-[#9E9D97] focus:outline-none focus:border-[#1D4ED8]"
                  />
                </div>

                <div>
                  <label htmlFor="auth-password" className="block text-xs font-medium text-[#141413] mb-1.5">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      id="auth-password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={8}
                      maxLength={128}
                      autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Minimum 8 characters"
                      className="w-full h-11 pl-3.5 pr-11 text-sm bg-white border border-[#D6D5CF] rounded-lg text-[#141413] placeholder:text-[#9E9D97] focus:outline-none focus:border-[#1D4ED8]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center text-[#575652] hover:text-[#141413] rounded"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full min-h-[44px] px-5 py-2.5 bg-[#1D4ED8] hover:bg-[#1E40AF] disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors whitespace-nowrap"
                >
                  {submitting
                    ? 'Verifying...'
                    : mode === 'login'
                      ? 'Sign In'
                      : 'Create Account'}
                </button>
              </form>

              {error && (
                <div
                  role="alert"
                  className="flex items-start gap-2 p-3 rounded-lg bg-[#FEF2F2] border border-[#FECACA] text-[#991B1B] text-xs"
                >
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              <div className="p-4 rounded-xl bg-[#F8F8F7] border border-[#E5E4DF] flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-display text-base font-semibold text-[#141413] truncate">
                    {user.name}
                  </p>
                  <p className="text-xs text-[#575652] truncate mt-0.5">{user.email}</p>
                </div>
                <button
                  type="button"
                  onClick={onLogout}
                  className="inline-flex items-center gap-1.5 min-h-[40px] px-3.5 py-2 text-xs font-medium text-[#141413] bg-white border border-[#D6D5CF] rounded-lg hover:bg-[#F1F0ED] transition-colors whitespace-nowrap shrink-0"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Sign Out
                </button>
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-display text-sm font-semibold text-[#141413]">
                    Order History
                  </h3>
                  <span className="font-mono text-xs text-[#6B6A65] tabular-nums">
                    {orders.length} {orders.length === 1 ? 'order' : 'orders'}
                  </span>
                </div>

                {ordersLoading ? (
                  <div className="py-10 text-center text-xs text-[#6B6A65]">
                    Loading your orders...
                  </div>
                ) : orders.length === 0 ? (
                  <div className="py-10 px-4 text-center border border-dashed border-[#D6D5CF] rounded-xl">
                    <PackageCheck className="w-6 h-6 text-[#8E8D87] mx-auto mb-2" strokeWidth={1.5} />
                    <p className="text-sm font-medium text-[#141413]">No orders placed yet</p>
                    <p className="text-xs text-[#6B6A65] mt-1">
                      Completed checkouts will appear here with full shipping receipts.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {orders.map((order) => (
                      <div
                        key={order.id}
                        className="border border-[#E5E4DF] rounded-xl p-4 space-y-3 bg-white"
                      >
                        <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-[#EFEFED]">
                          <div>
                            <p className="font-mono text-xs font-medium text-[#141413]">
                              {order.id}
                            </p>
                            <p className="text-[11px] text-[#6B6A65]">
                              {new Date(order.createdAt).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-mono text-sm font-medium text-[#141413] tabular-nums">
                              {formatINR(order.total)}
                            </p>
                            <p className="text-[11px] text-[#15803D] font-medium">
                              {order.status}
                            </p>
                          </div>
                        </div>

                        <div className="space-y-2">
                          {order.items.map((item) => (
                            <div
                              key={`${order.id}-${item.productId}-${item.variant}`}
                              className="flex items-center gap-3 text-xs"
                            >
                              <div className="w-10 h-10 rounded-md overflow-hidden bg-[#F1F0ED] shrink-0">
                                <ResilientImage
                                  src={item.image}
                                  alt={item.name}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-[#141413] truncate">{item.name}</p>
                                <p className="text-[#6B6A65]">
                                  {item.variant} · Qty {item.quantity}
                                </p>
                              </div>
                              <span className="font-mono text-[#141413] tabular-nums shrink-0">
                                {formatINR(item.unitPrice * item.quantity)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
