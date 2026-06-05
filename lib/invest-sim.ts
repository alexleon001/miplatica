// Lógica pura del simulador / comparador de inversiones. Proyecta un capital a
// N meses en distintos instrumentos y compara el rendimiento REAL (ajustado por
// inflación, regla #5). Sin React → unit-testeable con `bun test`.
//
// Modelo:
// - Instrumento en ARS (plazo fijo, FCI money market): capitaliza mensualmente a
//   TEM = TNA/12. Valor nominal = capital · (1 + TEM)^meses.
// - Instrumento en USD (comprar dólar MEP y mantener): se asume que el MEP
//   acompaña a la inflación (cobertura clásica), más un rendimiento opcional en
//   USD (0% = sólo holding). Valor nominal ARS = capital · (1+inflM)^meses ·
//   (1+usdTEM)^meses. Con rendimiento USD 0 → preserva el valor real (real 0%).
// - Valor REAL = nominal deflactado por la inflación acumulada del período.

export type SimCurrency = "ARS" | "USD";

export type SimInstrument = {
  id: string;
  label: string;
  annualRatePct: number; // TNA nominal en su moneda
  currency: SimCurrency;
};

export type SimResult = {
  id: string;
  label: string;
  currency: SimCurrency;
  nominalArs: number; // valor final ARS nominal (pesos del futuro)
  realArs: number; // valor final en pesos de HOY (deflactado por inflación)
  nominalGainPct: number; // % de ganancia nominal sobre el capital
  realGainPct: number; // % de ganancia real (puede ser negativa si no le gana a la inflación)
  beatsInflation: boolean;
};

function compound(monthlyRate: number, months: number): number {
  return Math.pow(1 + monthlyRate, months);
}

// Proyecta el capital en cada instrumento y ordena por mayor valor REAL.
export function simulate(
  amountArs: number,
  months: number,
  monthlyInflationPct: number,
  instruments: SimInstrument[],
): SimResult[] {
  const inflM = monthlyInflationPct / 100;
  const inflationFactor = compound(inflM, months); // acumulada del período

  const results = instruments.map((inst): SimResult => {
    const tem = inst.annualRatePct / 12 / 100;
    let nominalArs: number;
    if (inst.currency === "ARS") {
      nominalArs = amountArs * compound(tem, months);
    } else {
      // USD: el MEP acompaña la inflación + rendimiento en USD.
      nominalArs = amountArs * inflationFactor * compound(tem, months);
    }
    const realArs = nominalArs / inflationFactor;
    return {
      id: inst.id,
      label: inst.label,
      currency: inst.currency,
      nominalArs,
      realArs,
      nominalGainPct: amountArs > 0 ? (nominalArs / amountArs - 1) * 100 : 0,
      realGainPct: amountArs > 0 ? (realArs / amountArs - 1) * 100 : 0,
      beatsInflation: realArs > amountArs + 0.0001, // tolerancia de redondeo
    };
  });

  return results.sort((a, b) => b.realArs - a.realArs);
}

// Inflación mensual sugerida: promedio de los últimos `window` meses de IPC.
// Devuelve null si no hay datos (la UI usa entonces un default editable).
export function suggestedMonthlyInflation(
  ipcSeries: { month: string; ipc: number }[],
  window = 3,
): number | null {
  if (ipcSeries.length === 0) return null;
  const last = ipcSeries.slice(-window);
  const sum = last.reduce((s, r) => s + r.ipc, 0);
  return sum / last.length;
}

// TNA real equivalente para una inflación mensual dada (Fisher), informativo.
export function realAnnualRate(annualNominalPct: number, monthlyInflationPct: number): number {
  const nominalAnnualFactor = Math.pow(1 + annualNominalPct / 12 / 100, 12);
  const inflationAnnualFactor = Math.pow(1 + monthlyInflationPct / 100, 12);
  return (nominalAnnualFactor / inflationAnnualFactor - 1) * 100;
}
