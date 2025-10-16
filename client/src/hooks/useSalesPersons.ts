import { useQuery } from '@tanstack/react-query';

import { apiRequest } from '@/lib/queryClient';

export function useSalesPersons() {
  return useQuery<string[]>({
    queryKey: ['/api/projects/sales-persons'],
    queryFn: async () => {
      const res = await apiRequest(
        "GET",
        `/api/projects/sales-persons`,
        undefined
      );
      const result = await res.json();
      return result.data || [];
    },
  });
}
