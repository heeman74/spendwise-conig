'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useDispatch } from 'react-redux';
import { setIsDemo } from '@/store/slices/authSlice';
import Link from 'next/link';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { useLoginStep1, TwoFactorType } from '@/hooks/useTwoFactor';
import { TwoFactorVerify } from '@/components/auth/TwoFactorVerify';

type LoginStep = 'credentials' | '2fa';

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<LoginStep>('credentials');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [pendingToken, setPendingToken] = useState('');
  const [availableMethods, setAvailableMethods] = useState<TwoFactorType[]>([]);
  const dispatch = useDispatch();
  const { loginStep1, loading: step1Loading } = useLoginStep1();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      // Step 1: Validate credentials and check if 2FA is required
      const { data } = await loginStep1(formData.email, formData.password);

      if (data?.loginStep1?.requiresTwoFactor) {
        // User has 2FA enabled - proceed to 2FA verification
        setPendingToken(data.loginStep1.pendingToken || '');
        setAvailableMethods(data.loginStep1.availableMethods || []);
        setStep('2fa');
      } else {
        // No 2FA required - sign in directly with NextAuth
        // This case is rare since 2FA is mandatory for new users
        const result = await signIn('credentials', {
          email: formData.email,
          password: formData.password,
          redirect: false,
        });

        if (result?.error) {
          setError('Authentication failed');
        } else {
          dispatch(setIsDemo(false));
          router.push('/dashboard');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Invalid email or password');
    } finally {
      setIsLoading(false);
    }
  };

  const handle2FAVerify = async (token: string, user: any) => {
    try {
      setIsLoading(true);
      setError('');

      // Sign in to NextAuth with the full access token
      const result = await signIn('credentials', {
        token,
        redirect: false,
      });

      if (result?.error) {
        setError('Authentication failed');
      } else {
        dispatch(setIsDemo(false));
        router.push('/dashboard');
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel2FA = () => {
    setStep('credentials');
    setPendingToken('');
    setAvailableMethods([]);
    setError('');
  };

  // Demo login handler
  const handleDemoLogin = async () => {
    setIsLoading(true);
    // For demo purposes, redirect directly to dashboard
    dispatch(setIsDemo(true));
    router.push('/dashboard');
  };

  // Show 2FA verification if on step 2
  if (step === '2fa') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm max-w-md mx-auto">
            {error}
          </div>
        )}
        <TwoFactorVerify
          pendingToken={pendingToken}
          availableMethods={availableMethods}
          onVerify={handle2FAVerify}
          onCancel={handleCancel2FA}
        />
      </div>
    );
  }

  // Default credentials form
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md" padding="lg">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="w-12 h-12 rounded-xl bg-primary-600 flex items-center justify-center">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Welcome to SpendWise</h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Sign in to manage your finances
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Email"
            type="email"
            placeholder="you@example.com"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            required
          />
          <Input
            label="Password"
            type="password"
            placeholder="Enter your password"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            required
          />

          <div className="flex items-center justify-between">
            <label className="flex items-center">
              <input
                type="checkbox"
                className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">Remember me</span>
            </label>
            <a href="#" className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400">
              Forgot password?
            </a>
          </div>

          <Button type="submit" variant="primary" className="w-full" isLoading={isLoading || step1Loading}>
            Sign in
          </Button>
        </form>

        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200 dark:border-gray-700" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white dark:bg-gray-800 text-gray-500">Or</span>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full mt-4"
            onClick={handleDemoLogin}
            isLoading={isLoading}
          >
            Try Demo Account
          </Button>
        </div>

        <p className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
          Don&apos;t have an account?{' '}
          <Link href="/register" className="text-primary-600 hover:text-primary-700 dark:text-primary-400 font-medium">
            Sign up
          </Link>
        </p>
      </Card>
    </div>
  );
}
