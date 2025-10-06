import { useQuery } from "@tanstack/react-query";
import type { Customer, Item, Project, AccountingItem } from "@shared/schema";

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
