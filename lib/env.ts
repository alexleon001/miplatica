// Lectura de variables públicas del cliente Expo.
// Las EXPO_PUBLIC_* se inlinean en el bundle: solo valores no-secretos acá.
// Secrets (Anthropic, Mercado Pago) viven SOLO en Supabase Edge Functions.

function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `[mi-platica] Falta la variable de entorno ${name}. ` +
        `Definila en .env y reiniciá expo con --clear.`,
    );
  }
  return value;
}

export const env = {
  supabaseUrl: required("EXPO_PUBLIC_SUPABASE_URL", process.env.EXPO_PUBLIC_SUPABASE_URL),
  supabaseAnonKey: required(
    "EXPO_PUBLIC_SUPABASE_ANON_KEY",
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  ),
  appEnv: (process.env.EXPO_PUBLIC_APP_ENV ?? "development") as
    | "development"
    | "staging"
    | "production",
} as const;
