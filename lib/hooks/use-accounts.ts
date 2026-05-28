import { useQuery } from "@tanstack/react-query";
import { supabase } from "../supabase";

export function useAccounts() {
  return useQuery({
    queryKey: ["accounts", "active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("accounts")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data;
    },
  });
}
