'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { useDispatch } from 'react-redux';
import { setIsDemo } from '@/store/slices/authSlice';
import { useMutation } from '@apollo/client/react';
import { REGISTER } from '@/graphql/mutations/auth';
import Link from 'next/link';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { TwoFactorSetup } from '@/components/auth/TwoFactorSetup';
import { cn } from '@/lib/utils';

type RegisterStep = 'register' | '2fa-setup';

export default function RegisterPage() {
  const router = useRouter();
  const dispatch = useDispatch();
  const [step, setStep] = useState<RegisterStep>('register');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [authToken, setAuthToken] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const [registerMutation, { loading: registering }] = useMutation<{
    register: { token: string; requiresSetup: boolean } | null;
  }>(REGISTER);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setIsLoading(false);
      return;
    }

    const pw = formData.password;
    if (pw.length < 8 || !/[A-Z]/.test(pw) || !/[a-z]/.test(pw) || !/[0-9]/.test(pw) || !/[^A-Za-z0-9]/.test(pw)) {
      setError('Password does not meet all requirements');
      setIsLoading(false);
      return;
    }

    try {
      const { data } = await registerMutation({
        variables: {
          name: formData.name,
          email: formData.email,
          password: formData.password,
        },
      });

      if (data?.register?.token) {
        setAuthToken(data.register.token);

        // Create NextAuth session immediately so 2FA setup mutations work
        const result = await signIn('credentials', {
          token: data.register.token,
          redirect: false,
        });

        if (result?.error) {
          setError('Authentication failed');
          setIsLoading(false);
          return;
        }

        // Now show 2FA setup with authenticated session
        if (data.register.requiresSetup) {
          setStep('2fa-setup');
        } else {
          // Unlikely case - no 2FA required, go to dashboard
          dispatch(setIsDemo(false));
          router.push('/dashboard');
        }
      } else {
        setError('Registration failed');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during registration');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignIn = async (token: string) => {
    try {
      setIsLoading(true);
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

  const handle2FASetupComplete = async () => {
    // Already signed in, just redirect to dashboard
    dispatch(setIsDemo(false));
    router.push('/dashboard');
  };

  // Show 2FA setup if registration is complete
  if (step === '2fa-setup') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
        <TwoFactorSetup
          onComplete={handle2FASetupComplete}
          required={true}
        />
      </div>
    );
  }

  // Default registration form
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Create your account</h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Start managing your finances with SpendWise
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Name"
            type="text"
            placeholder="John Doe"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
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
            type={showPassword ? 'text' : 'password'}
            placeholder="At least 8 characters"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            required
            rightIcon={
              <button type="button" tabIndex={-1} onClick={() => setShowPassword(!showPassword)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                {showPassword ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" /></svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                )}
              </button>
            }
          />
          {formData.password && (() => {
            const checks = [
              formData.password.length >= 8,
              /[A-Z]/.test(formData.password),
              /[a-z]/.test(formData.password),
              /[0-9]/.test(formData.password),
              /[^A-Za-z0-9]/.test(formData.password),
            ];
            const strength = checks.filter(Boolean).length;
            const colors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-lime-500', 'bg-green-500'];
            const labels = ['Weak', 'Fair', 'Good', 'Strong', 'Excellent'];
            const requirements = [
              'At least 8 characters',
              'One uppercase letter',
              'One lowercase letter',
              'One number',
              'One special character',
            ];
            return (
              <div className="-mt-2 space-y-2">
                <div className="flex gap-1">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className={cn(
                        'h-1.5 flex-1 rounded-full transition-colors duration-300',
                        i < strength ? colors[strength - 1] : 'bg-gray-200 dark:bg-gray-700'
                      )}
                    />
                  ))}
                </div>
                <p className={cn('text-xs font-medium', strength <= 1 ? 'text-red-500' : strength <= 2 ? 'text-orange-500' : strength <= 3 ? 'text-yellow-600 dark:text-yellow-400' : strength <= 4 ? 'text-lime-600 dark:text-lime-400' : 'text-green-600 dark:text-green-400')}>
                  {labels[strength - 1] || 'Weak'}
                </p>
                <ul className="text-xs space-y-1">
                  {requirements.map((req, i) => (
                    <li key={req} className={cn('flex items-center gap-1.5', checks[i] ? 'text-green-600 dark:text-green-400' : 'text-gray-400 dark:text-gray-500')}>
                      {checks[i] ? (
                        <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                      ) : (
                        <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" strokeWidth={2} /></svg>
                      )}
                      {req}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })()}
          <Input
            label="Confirm Password"
            type={showConfirmPassword ? 'text' : 'password'}
            placeholder="Confirm your password"
            value={formData.confirmPassword}
            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
            required
            rightIcon={
              <button type="button" tabIndex={-1} onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                {showConfirmPassword ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" /></svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                )}
              </button>
            }
          />

          <div className="flex items-start">
            <input
              type="checkbox"
              required
              className="w-4 h-4 mt-0.5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
              I agree to the{' '}
              <a href="#" className="text-primary-600 hover:text-primary-700 dark:text-primary-400">
                Terms of Service
              </a>{' '}
              and{' '}
              <a href="#" className="text-primary-600 hover:text-primary-700 dark:text-primary-400">
                Privacy Policy
              </a>
            </span>
          </div>

          <Button type="submit" variant="primary" className="w-full" isLoading={isLoading || registering}>
            Create account
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
          Already have an account?{' '}
          <Link href="/login" className="text-primary-600 hover:text-primary-700 dark:text-primary-400 font-medium">
            Sign in
          </Link>
        </p>
      </Card>
    </div>
  );
}
