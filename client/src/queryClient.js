import { QueryClient } from "@tanstack/react-query";

const HOURS = 60 * 60 * 1000; // milliseconds in an hour

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: Infinity,
      gcTime: 24 * HOURS,
      retry: 2,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchOnMount: false,
    },
  },
});

