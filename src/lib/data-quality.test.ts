import { describe, expect, it } from "vitest";
import {
  decumulateMonthlyVolumes,
  dedupeByReportDate,
  parseBulletinTimestamp,
  safePercent,
  safeRatio,
} from "./data-quality";

describe("parseBulletinTimestamp", () => {
  const validCases: Array<[string, string, string, string]> = [
    ["27/07 17:27", "2026-07-30", "nominal sans année", "2026-07-27T17:27"],
    ["13/05/26 21:18", "2026-05-14", "année sur 2 chiffres", "2026-05-13T21:18"],
    ["10/06/206 17:12", "2026-06-11", "année tronquée OCR", "2026-06-10T17:12"],
    ["01/11/20222:30", "2025-11-02", "année corrompue et heure collée", "2025-11-01T02:30"],
    ["06/02/202619:30", "2026-02-07", "année et heure collées", "2026-02-06T19:30"],
    ["10/1005:00", "2025-10-11", "espace manquant", "2025-10-10T05:00"],
    ["28/12/2025 15/24", "2025-12-29", "slash dans l'heure", "2025-12-28T15:24"],
    ["11/10/2025 AM-TBC", "2025-10-12", "demi-journée AM", "2025-10-11T10:00"],
    ["20/01/2026 PM", "2026-01-21", "demi-journée PM", "2026-01-20T18:00"],
    ["01/06/2026 22:54/TBC", "2026-06-02", "heure avec suffixe TBC", "2026-06-01T22:54"],
    ["28/12 22:00", "2026-01-03", "passage d'année décembre", "2025-12-28T22:00"],
    ["02/01 04:00", "2025-12-31", "passage d'année janvier", "2026-01-02T04:00"],
  ];

  it.each(validCases)("%s — %s", (raw, reportDate, _label, expected) => {
    const result = parseBulletinTimestamp(raw, reportDate, "past");
    expect(result.status).not.toBe("rejected");
    if (result.status !== "rejected") {
      expect(result.value.toISOString().slice(0, 16)).toBe(expected);
    }
  });

  it.each([
    ["TBC", "2026-06-02"],
    ["587", "2026-06-02"],
    ["", "2026-06-02"],
    ["31/02 10:00", "2026-03-01"],
    ["15/11 08:00", "2026-01-20"],
  ])("rejette %s", (raw, reportDate) => {
    expect(parseBulletinTimestamp(raw, reportDate, "past").status).toBe("rejected");
  });
});

describe("decumulateMonthlyVolumes", () => {
  it("calcule les écarts et repart du cumul au changement de mois", () => {
    const rows = [
      { date_rapport: "2025-11-29", total_teu: 56_231 },
      { date_rapport: "2025-11-30", total_teu: 59_145 },
      { date_rapport: "2025-12-01", total_teu: 1_378 },
      { date_rapport: "2025-12-02", total_teu: 4_292 },
    ];

    const result = decumulateMonthlyVolumes(rows, ["total_teu"]);

    expect(result.map((row) => row.total_teu_jour)).toEqual([56_231, 2_914, 1_378, 2_914]);
    expect(result.map((row) => row.volume_decumule_fiable)).toEqual([false, true, false, true]);
  });

  it("ne propage jamais un delta négatif après une correction", () => {
    const result = decumulateMonthlyVolumes(
      [
        { date_rapport: "2026-07-10", total_teu: 20_000 },
        { date_rapport: "2026-07-11", total_teu: 19_500 },
      ],
      ["total_teu"],
    );
    expect(result[1].total_teu_jour).toBe(0);
  });
});

describe("dedupeByReportDate", () => {
  it("retient un seul bulletin déterministe parmi cinq", () => {
    const rows = Array.from({ length: 5 }, (_, index) => ({
      date_rapport: "2026-07-30",
      created_at: `2026-07-30T1${index}:00:00Z`,
      bulletin: index + 1,
      valeur: index === 1 ? 999 : null,
    }));

    const result = dedupeByReportDate(rows);

    expect(result).toHaveLength(1);
    expect(result[0].bulletin).toBe(5);
  });
});

describe("agrégats protégés", () => {
  it("renvoie null lorsque le dénominateur est nul", () => {
    expect(safeRatio(42, 0)).toBeNull();
    expect(safePercent(42, 0)).toBeNull();
  });

  it("calcule ratio et pourcentage quand le dénominateur est valide", () => {
    expect(safeRatio(1, 4)).toBe(0.25);
    expect(safePercent(1, 4)).toBe(25);
  });
});
