'use client';

import { ApolloClient, InMemoryCache, createHttpLink, from } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { onError } from '@apollo/client/link/error';
import { getSession } from 'next-auth/react';

const httpLink = createHttpLink({
  uri: process.env.NEXT_PUBLIC_GRAPHQL_URL || 'http://localhost:4000/graphql',
});

const authLink = setContext(async (_, { headers }) => {
  const session = await getSession();

  return {
    headers: {
      ...headers,
      authorization: session?.accessToken ? `Bearer ${session.accessToken}` : '',
    },
  };
});

const errorLink = onError((errorResponse) => {
  const { graphQLErrors, networkError } = errorResponse as any;
  if (graphQLErrors) {
    for (const err of graphQLErrors) {
      switch (err.extensions?.code) {
        case 'UNAUTHENTICATED':
          // Redirect to login on auth errors
          if (typeof window !== 'undefined') {
            window.location.href = '/login';
          }
          break;
      }
      if (process.env.NODE_ENV !== 'production') {
        console.error(`[GraphQL error]: Message: ${err.message}`);
      }
    }
  }

  if (networkError) {
    if (process.env.NODE_ENV !== 'production') {
      console.error(`[Network error]: ${networkError}`);
    }
  }
});

function createApolloClient() {
  return new ApolloClient({
    link: from([errorLink, authLink, httpLink]),
    cache: new InMemoryCache({
      typePolicies: {
        Query: {
          fields: {
            transactions: {
              keyArgs: ['filters', 'sort'],
              merge(existing, incoming, { args }) {
                // For pagination, merge results
                if (!existing || args?.pagination?.page === 1) {
                  return incoming;
                }
                // Deduplicate edges by node reference to prevent duplicate keys
                const existingEdges = existing?.edges || [];
                const seen = new Set(
                  existingEdges.map((e: any) => e.node?.__ref ?? e.node?.id)
                );
                const newEdges = (incoming?.edges || []).filter(
                  (e: any) => !seen.has(e.node?.__ref ?? e.node?.id)
                );
                return {
                  ...incoming,
                  edges: [...existingEdges, ...newEdges],
                };
              },
            },
          },
        },
        Transaction: {
          keyFields: ['id'],
        },
        Account: {
          keyFields: ['id'],
        },
        SavingsGoal: {
          keyFields: ['id'],
        },
        User: {
          keyFields: ['id'],
        },
      },
    }),
    defaultOptions: {
      watchQuery: {
        fetchPolicy: 'cache-and-network',
      },
    },
  });
}

// Create a singleton client
let apolloClient: ReturnType<typeof createApolloClient> | null = null;

export function getApolloClient() {
  if (!apolloClient || typeof window === 'undefined') {
    apolloClient = createApolloClient();
  }
  return apolloClient;
}

export { apolloClient };
