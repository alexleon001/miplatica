import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { TablesUpdate } from "../database.types";
import { useAuth } from "../auth";
import { supabase } from "../supabase";

export function useProfile() {
  // Sin sesión NO consultamos: si corriera, RLS devuelve null y ese null queda
  // cacheado/persistido (staleTime 5 min). Al re-loguear, el gate de onboarding
  // (lib_layout) leería ese null stale como "usuario sin nombre" y re-onboardearía
  // a un usuario existente. Con enabled por sesión, recién al loguear se fetchea
  // el perfil real. (Combinado con queryClient.clear() en SIGNED_OUT.)
  const { session } = useAuth();
  return useQuery({
    queryKey: ["profile"],
    enabled: !!session,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: TablesUpdate<"profiles">) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error("Sin sesión");

      const { data, error } = await supabase
        .from("profiles")
        .update(patch)
        .eq("id", user.user.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["profile"] });
    },
  });
}
