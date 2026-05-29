import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { queryClient } from "./query-client";
import { supabase } from "./supabase";

type AuthState = {
  session: Session | null;
  loading: boolean;
};

const AuthContext = createContext<AuthState>({ session: null, loading: true });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      // Tirar todo el cache en login/logout explícito: (1) privacidad — no dejar
      // datos financieros del usuario anterior en memoria/AsyncStorage; (2) evitar
      // que un perfil/lista stale (incl. ["profile"]=null) dispare el onboarding o
      // muestre datos ajenos al re-loguear con otra cuenta. SIGNED_IN solo dispara
      // en login explícito (no en resume de sesión = INITIAL_SESSION/TOKEN_REFRESHED),
      // así que no rompe el cache offline-first del uso normal.
      if (event === "SIGNED_OUT" || event === "SIGNED_IN") {
        queryClient.clear();
      }
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const value = useMemo(() => ({ session, loading }), [session, loading]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
