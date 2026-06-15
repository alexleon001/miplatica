// ============================================
// Mi Platica — Edge Function: rewarded-ssv
// ============================================
// Server-Side Verification (SSV) de rewarded ads de AdMob. Cuando un usuario
// gana la recompensa, el SERVER de Google llama esta URL por GET con los
// parámetros firmados. Verificamos la firma ECDSA contra las claves públicas de
// Google y, si es válida, otorgamos 1 crédito de IA al user_id que el cliente
// pasó como SSV userId (= supabase user id). Cierra el agujero de que un cliente
// se otorgue créditos sin mirar el anuncio (ver migración 0013 / 0014).
//
// Auth: verify_jwt = false (lo llama Google, no un usuario). FALLA CERRADO: si la
// firma no verifica, 403 y NO se otorga nada.
//
// ⚠️ INACTIVO hasta activar SSV (ver CLAUDE.md "Activar SSV"): requiere un
// rewarded unit REAL en AdMob + configurar esta URL como "SSV callback" en ese
// unit + que el cliente pase userId en setServerSideVerificationOptions. Con los
// test units de Google NO se puede (no son tuyos). El verificador necesita una
// pasada de validación contra un callback real la primera vez (no testeable acá).
//
// Spec: https://developers.google.com/admob/android/rewarded-video-ssv
// ============================================

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const VERIFIER_KEYS_URL = "https://www.gstatic.com/admob/reward/verifier-keys.json";

type VerifierKey = { keyId: number; pem: string; base64: string };
let keysCache: { fetchedAt: number; keys: VerifierKey[] } | null = null;

// Las claves rotan; cacheamos 24 h (la doc recomienda refrescarlas a diario).
async function getVerifierKeys(): Promise<VerifierKey[]> {
  if (keysCache && Date.now() - keysCache.fetchedAt < 24 * 60 * 60 * 1000) {
    return keysCache.keys;
  }
  const res = await fetch(VERIFIER_KEYS_URL);
  if (!res.ok) throw new Error(`verifier keys fetch failed: ${res.status}`);
  const json = await res.json();
  const keys: VerifierKey[] = json.keys ?? [];
  keysCache = { fetchedAt: Date.now(), keys };
  return keys;
}

Deno.serve(async (req: Request) => {
  if (req.method !== "GET") return new Response("method not allowed", { status: 405 });

  const url = new URL(req.url);
  const params = url.searchParams;
  const signatureB64 = params.get("signature");
  const keyId = params.get("key_id");
  if (!signatureB64 || !keyId) return new Response("missing signature/key_id", { status: 400 });

  // El contenido a verificar es el query string SIN signature ni key_id (que van
  // siempre últimos, en ese orden). Usamos los bytes crudos tal como llegaron.
  const raw = url.search.startsWith("?") ? url.search.slice(1) : url.search;
  const sigIdx = raw.indexOf("&signature=");
  if (sigIdx < 0) return new Response("malformed query", { status: 400 });
  const message = raw.slice(0, sigIdx);

  let keys: VerifierKey[];
  try {
    keys = await getVerifierKeys();
  } catch {
    // Sin claves no podemos verificar: fallamos cerrado (503 → AdMob reintenta).
    return new Response("verifier keys unavailable", { status: 503 });
  }
  const key = keys.find((k) => String(k.keyId) === keyId);
  if (!key) return new Response("unknown key_id", { status: 403 });

  const valid = await verifyEcdsa(key.base64, signatureB64, message);
  if (!valid) return new Response("invalid signature", { status: 403 });

  // Firma OK. Otorgamos al user_id que el cliente puso como SSV userId.
  const userId = params.get("user_id");
  if (userId) {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    // Idempotencia best-effort: AdMob puede reintentar el callback. El tope de la
    // función ya acota el abuso; transaction_id queda disponible si más adelante
    // querés deduplicar de forma estricta (tabla de ids vistos).
    await supabase.rpc("grant_ai_reward_credit_for", { p_uid: userId });
  }

  // 200 = recibido y verificado. AdMob reintenta ante cualquier no-2xx.
  return new Response("ok", { status: 200 });
});

// Verifica una firma ECDSA P-256 / SHA-256. AdMob manda la firma DER en base64url.
// WebCrypto.verify espera la firma cruda (r||s) → convertimos DER→raw.
async function verifyEcdsa(spkiB64: string, sigB64url: string, message: string): Promise<boolean> {
  try {
    const pub = await crypto.subtle.importKey(
      "spki",
      b64ToBytes(spkiB64),
      { name: "ECDSA", namedCurve: "P-256" },
      false,
      ["verify"],
    );
    const rawSig = derToRawEcdsa(b64urlToBytes(sigB64url), 32);
    return await crypto.subtle.verify(
      { name: "ECDSA", hash: "SHA-256" },
      pub,
      rawSig,
      new TextEncoder().encode(message),
    );
  } catch {
    return false;
  }
}

function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function b64urlToBytes(s: string): Uint8Array {
  let b64 = s.replace(/-/g, "+").replace(/_/g, "/");
  while (b64.length % 4) b64 += "=";
  return b64ToBytes(b64);
}

// Convierte una firma ECDSA DER (SEQUENCE { INTEGER r, INTEGER s }) a r||s de
// longitud fija (size bytes cada componente). P-256 → size 32.
function derToRawEcdsa(der: Uint8Array, size: number): Uint8Array {
  let off = 0;
  if (der[off++] !== 0x30) throw new Error("bad DER: no SEQUENCE");
  // length de la SEQUENCE (short o long form)
  let seqLen = der[off++];
  if (seqLen & 0x80) {
    const n = seqLen & 0x7f;
    seqLen = 0;
    for (let i = 0; i < n; i++) seqLen = (seqLen << 8) | der[off++];
  }
  const readInt = (): Uint8Array => {
    if (der[off++] !== 0x02) throw new Error("bad DER: no INTEGER");
    const len = der[off++];
    const v = der.slice(off, off + len);
    off += len;
    return v;
  };
  const r = trimAndPad(readInt(), size);
  const s = trimAndPad(readInt(), size);
  const out = new Uint8Array(size * 2);
  out.set(r, 0);
  out.set(s, size);
  return out;
}

// Quita el 0x00 de signo de DER y left-padea a `size` bytes.
function trimAndPad(b: Uint8Array, size: number): Uint8Array {
  let start = 0;
  while (start < b.length - 1 && b[start] === 0x00) start++;
  let v = b.slice(start);
  if (v.length > size) v = v.slice(v.length - size);
  const out = new Uint8Array(size);
  out.set(v, size - v.length);
  return out;
}
