import type { AccountingItem,Customer, Item, Project } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";

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

export function useProjects() {
  return useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });
}

export function useAccountingItems() {
  return useQuery<AccountingItem[]>({
    queryKey: ["/api/accounting-items"],
  });
}
