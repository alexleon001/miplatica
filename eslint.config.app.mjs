// ESLint para el código de la APP (Expo/RN): lib/, app/, components/.
// Separado del root eslint.config.js (que es del boilerplate KATA y no aplica al
// app). Enfocado en CORRECTITUD, no estilo: `stylistic: false` apaga todas las
// reglas de formato (comillas/semicolons/comas) — el formato lo maneja el estilo
// existente del código, no queremos un diff de miles de líneas ni pelear contra
// las comillas dobles del app. Lo que sí queremos del lint: atrapar bugs reales
// (variables sin usar, imports rotos, promesas sin await mal usadas, etc.).
//
// Se corre scopeado con: eslint --config eslint.config.app.mjs lib app components
// (ver script "lint:app"). El CI lo ejecuta en cada push/PR.

import antfu from '@antfu/eslint-config';
import reactHooks from 'eslint-plugin-react-hooks';

export default antfu({
  // typescript SIN type-aware (no pasamos tsconfigPath): la correctitud de tipos
  // ya la valida `tsc` (type-check:app) en el CI. ESLint hace lo que tsc no:
  // imports/vars sin usar, hooks de React, no-debugger, etc. Sin type-aware
  // tampoco se dispara la avalancha de no-floating-promises/no-unsafe-* sobre el
  // código idiomático de TanStack Query/Supabase.
  typescript: true,
  // Sin reglas de formato: sólo correctitud.
  stylistic: false,
  // Los *.test.ts los corre bun y van en tsconfig.test.json (no en el project
  // service de tsconfig.json) → excluidos del lint type-aware del app.
  ignores: ['node_modules', '**/*.md', '**/*.test.ts', '**/*.test.tsx'],
  rules: {
    'no-console': 'off',
    'ts/explicit-function-return-type': 'off',
    'ts/explicit-module-boundary-types': 'off',
    'ts/no-explicit-any': 'warn',
    // Reglas organizativas/opinadas del preset que NO son bugs (el app tiene su
    // propia convención: usa `type`, ordena imports a mano). Las apagamos para
    // que el lint marque sólo problemas reales.
    'ts/consistent-type-definitions': 'off',
    'perfectionist/sort-imports': 'off',
    'perfectionist/sort-named-imports': 'off',
    'perfectionist/sort-named-exports': 'off',
    'import/consistent-type-specifier-style': 'off',
    'import/order': 'off',
    // Pedante: exige manejar null/empty explícito en cada condicional. El config
    // KATA root también la apaga. TypeScript strict ya cubre lo importante.
    'ts/strict-boolean-expressions': 'off',
    // Estilo, no bug: Math.pow vs **. Lo dejamos como está.
    'style/prefer-exponentiation-operator': 'off',
    'prefer-exponentiation-operator': 'off',
    // Requiere type-aware (que desactivamos) → off. Su valor era marginal.
    'ts/no-unnecessary-type-assertion': 'off',
    // Patrón universal de RN: `styles` se referencia en el render y se define con
    // StyleSheet.create al pie del archivo. No es un bug.
    'ts/no-use-before-define': 'off',
    'no-use-before-define': 'off',
    // Estilo: concatenación vs template literal. No tocamos.
    'prefer-template': 'off',
    // Bun/Node: `process` es global estándar (el root también lo apaga).
    'node/prefer-global/process': 'off',
    // Estas pegan sobre regex de normalización de texto intencional (sacar
    // acentos U+0300–U+036f, BOM en CSV). Son a propósito, no errores.
    'regexp/no-obscure-range': 'off',
    'regexp/no-misleading-unicode-character': 'off',
    'regexp/no-invisible-character': 'off',
    'no-irregular-whitespace': 'off',
    // Variables/imports sin usar: aviso, ignorando los prefijados con _.
    'unused-imports/no-unused-vars': [
      'warn',
      { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
    ],
  },
})
  // react-hooks: lo más valioso para una app RN. rules-of-hooks atrapa hooks
  // condicionales (bug seguro); exhaustive-deps avisa deps faltantes en
  // useEffect (warn, no rompe el CI). Sólo este plugin, no el resto del stack
  // react de @antfu (react-refresh es web, @eslint-react es pesado/opinado).
  .append({
    files: ['**/*.tsx', '**/*.ts'],
    plugins: { 'react-hooks': reactHooks },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
  });
