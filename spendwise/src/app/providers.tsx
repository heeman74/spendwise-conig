'use client';

import { Provider } from 'react-redux';
import { SessionProvider } from 'next-auth/react';
import { store } from '@/store';
import { useEffect } from 'react';
import { useAppSelector } from '@/store/hooks';
import { ApolloWrapper } from './apollo-provider';

function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { theme } = useAppSelector((state) => state.ui);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  return <>{children}</>;
}

function ThemeWrapper({ children }: { children: React.ReactNode }) {
  return (
    <Provider store={store}>
      <ThemeProvider>{children}</ThemeProvider>
    </Provider>
  );
}

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ApolloWrapper>
        <ThemeWrapper>{children}</ThemeWrapper>
      </ApolloWrapper>
    </SessionProvider>
  );
}
