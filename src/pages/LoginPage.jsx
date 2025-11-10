import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext'; // 1. Import

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();
  const { t } = useLanguage(); // 2. Initialize

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      const response = await axios.post('/api/auth', {
        action: 'login',
        email,
        password,
      });

      if (response.data && response.data.token) {
        console.log('Login successful! Token received.');
        login(response.data.token);
        navigate('/progression');
      } else {
        throw new Error('Login response was invalid.');
      }

    } catch (err) {
      console.error("Login attempt failed:", err);
      setError(err.response?.data?.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-full items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-text-primary"> {/* THEMED */}
            {t('login_to_your_account')}
          </h2>
        </div>
        <form className="mt-8 space-y-6 bg-ui-bg p-8 rounded-xl shadow-2xl border border-primary-bg" onSubmit={handleSubmit}> {/* THEMED */}
          <input type="hidden" name="remember" defaultValue="true" />
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email-address" className="sr-only">
                {t('email_address')}
              </label>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="relative block w-full appearance-none rounded-none rounded-t-md border border-primary-bg bg-primary-bg px-3 py-2 text-text-primary placeholder-text-muted focus:z-10 focus:border-accent focus:outline-none focus:ring-accent sm:text-sm" /* THEMED */
                placeholder={t('email_address')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isSubmitting}
              />
            </div>
            <div>
              <label htmlFor="password" class="sr-only">
                {t('password')}
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="relative block w-full appearance-none rounded-none rounded-b-md border border-primary-bg bg-primary-bg px-3 py-2 text-text-primary placeholder-text-muted focus:z-10 focus:border-accent focus:outline-none focus:ring-accent sm:text-sm" /* THEMED */
                placeholder={t('password')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isSubmitting}
              />
            </div>
          </div>

          {error && <p className="text-red-400 text-center text-sm">{error}</p>}

          <div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="group relative flex w-full justify-center rounded-md border border-transparent bg-accent py-2 px-4 text-sm font-medium text-text-on-ui hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-primary-bg disabled:opacity-70 disabled:cursor-not-allowed" /* THEMED */
            >
              {isSubmitting ? t('signing_in') : t('sign_in')}
            </button>
          </div>
        </form>
        <p className="mt-2 text-center text-sm text-text-muted"> {/* THEMED */}
          {t('dont_have_account')}{' '}
          <Link to="/register" className="font-medium text-accent hover:text-accent/80 transition-colors"> {/* THEMED */}
            {t('register_now')}
          </Link>
        </p>
      </div>
    </div>
  );
}