import { parseBulletinTimestamp } from "../src/lib/data-quality";
const cases: Array<[string, string, string, "accepted" | "rejected"]> = [
  ["27/07 17:27","2026-07-30","nominal sans annee","accepted"],
  ["13/05/26 21:18","2026-05-14","annee 2 chiffres","accepted"],
  ["10/06/206 17:12","2026-06-11","annee tronquee OCR","accepted"],
  ["01/11/20222:30","2025-11-02","annee corrompue + heure collee","accepted"],
  ["06/02/202619:30","2026-02-07","annee + heure collees","accepted"],
  ["10/1005:00","2025-10-11","espace manquant","accepted"],
  ["28/12/2025 15/24","2025-12-29","slash dans heure","accepted"],
  ["11/10/2025 AM-TBC","2025-10-12","demi-journee AM","accepted"],
  ["20/01/2026 PM","2026-01-21","demi-journee PM","accepted"],
  ["01/06/2026 22:54/TBC","2026-06-02","heure + TBC","accepted"],
  ["TBC","2026-06-02","aucune info","rejected"],
  ["587","2026-06-02","colonne decalee","rejected"],
  ["","2026-06-02","vide","rejected"],
  ["28/12 22:00","2026-01-03","PASSAGE ANNEE: dec lu sur bulletin janvier","accepted"],
  ["02/01 04:00","2025-12-31","PASSAGE ANNEE: janv lu sur bulletin decembre","accepted"],
  ["31/02 10:00","2026-03-01","date inexistante","rejected"],
  ["15/11 08:00","2026-01-20","escale trop ancienne (>45j)","rejected"],
];
let passed = 0;
for (const [raw, ref, label, expected] of cases) {
  const r = parseBulletinTimestamp(raw, ref, "past");
  const matchesExpectation = expected === "rejected" ? r.status === "rejected" : r.status !== "rejected";
  if (matchesExpectation) passed += 1;
  const out = r.status === "rejected" ? `REJET — ${r.reason}` :
    `${r.value.toISOString().slice(0,16).replace("T"," ")}  [${r.status}]${r.status==="suspect"?" — "+r.reason:""}`;
  console.log(`${matchesExpectation ? "OK" : "ECHEC"} | ${label.padEnd(42)} | ${(raw||"(vide)").padEnd(22)} | bull ${ref} -> ${out}`);
}
console.log(`\n${passed}/${cases.length}`);
if (passed !== cases.length) process.exitCode = 1;
