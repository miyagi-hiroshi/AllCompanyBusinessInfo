import { useQuery } from "@tanstack/react-query";
import type { Customer, Item } from "@shared/schema";

export function useCustomers() {
  return useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });
}

export function useItems() {
  return useQuery<Item[]>({
    queryKey: ["/api/items"],
  });
}
