#!/usr/bin/env bun
/**
 * Mi Platica — regenera lib/database.types.ts desde el schema vivo de Supabase.
 *
 * Uso:
 *   bun run db:types
 *
 * Requiere:
 *   - Supabase CLI accesible vía `bunx supabase` (o `supabase` global)
 *   - Estar logueado: `bunx supabase login` (token persistente en ~/.supabase)
 *   - O exportar SUPABASE_ACCESS_TOKEN (CI)
 *
 * Alternativa cuando no podés instalar el CLI: pedile a Claude Code que use
 * el MCP `mcp__Supabase__generate_typescript_types` y escriba el resultado
 * en lib/database.types.ts (es lo mismo que hace este script).
 */

import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

const PROJECT_ID = "jgszdxqhrbpfjqtqqlpw";
const OUT = resolve(import.meta.dir, "..", "lib", "database.types.ts");

const HEADER = `// ===========================================================================
// Mi Platica — tipos autogenerados desde el schema vivo de Supabase.
// ===========================================================================
// NO editar a mano. Para regenerar:
//   bun run db:types
// ===========================================================================

`;

const result = spawnSync(
  "bunx",
  [
    "--bun",
    "supabase",
    "gen",
    "types",
    "typescript",
    "--project-id",
    PROJECT_ID,
    "--schema",
    "public",
  ],
  { encoding: "utf8" },
);

if (result.status !== 0 || !result.stdout) {
  console.error("❌ No pude generar tipos.");
  console.error(result.stderr ?? result.error?.message ?? "(sin detalle)");
  console.error("\n💡 Probá:");
  console.error("   bunx supabase login");
  console.error("   bun run db:types");
  process.exit(1);
}

writeFileSync(OUT, HEADER + result.stdout);
console.log(`✅ Tipos regenerados en ${OUT}`);
