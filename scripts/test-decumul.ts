import { decumulateMonthlyVolumes, analyzeCoverage } from "../src/lib/data-quality";
const rows = [
  ["2025-11-20",35836],["2025-11-21",35836],["2025-11-22",41086],["2025-11-23",45477],
  ["2025-11-26",48290],["2025-11-27",48953],["2025-11-28",53280],["2025-11-29",56231],
  ["2025-12-03",1378],["2025-12-04",7949],["2025-12-05",7949],["2025-12-07",10638],
].map(([d,v])=>({date_rapport:d as string,total_teu:v as number}));

const out = decumulateMonthlyVolumes(rows, ["total_teu"]);
console.log("date        cumul     -> volume du jour   fiable");
for(const r of out){
  console.log(`${r.date_rapport}  ${String(r.total_teu).padStart(6)}    ->  ${String(r.total_teu_jour).padStart(6)}          ${r.volume_decumule_fiable}`);
}
const nov = out.filter(r=>String(r.date_rapport).startsWith("2025-11") && r.volume_decumule_fiable);
const moyAvant = rows.filter(r=>r.date_rapport.startsWith("2025-11")).reduce((s,r)=>s+r.total_teu,0)/8;
const moyApres = nov.reduce((s,r)=>s+Number(r.total_teu_jour),0)/nov.length;
console.log(`\nMoyenne "journaliere" AVANT correction (sur le cumul) : ${Math.round(moyAvant).toLocaleString("fr-FR")} TEU  <-- absurde`);
console.log(`Moyenne journaliere APRES correction (decumulee)     : ${Math.round(moyApres).toLocaleString("fr-FR")} TEU`);
console.log(`Cumul novembre atteint                               : ${Math.max(...rows.filter(r=>r.date_rapport.startsWith("2025-11")).map(r=>r.total_teu)).toLocaleString("fr-FR")} TEU`);
const cov = analyzeCoverage(rows);
console.log(`\nCouverture : ${cov?.reportedDays}/${cov?.calendarDays} jours (${Math.round(cov?.coveragePct??0)}%) — ${cov?.gaps.length} interruption(s)`);
cov?.gaps.forEach(g=>console.log(`   trou ${g.from} -> ${g.to} : ${g.days} jour(s)`));
