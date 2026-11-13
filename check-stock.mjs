// Checks OVHcloud VPS stock through the public order API (no account needed).
// Exit code 1 when a watched plan is orderable in a watched datacenter:
// the failed GitHub Actions run triggers GitHub's e-mail notification.
// Exit code 2 when the API cannot be read after several attempts.
import { appendFileSync } from "node:fs";

const list = (value, fallback) =>
  (value || fallback)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

const PLANS = list(process.env.PLANS, "vps-2027-model4,vps-2027-model3");
const DATACENTERS = list(process.env.DATACENTERS, "GRA,SBG,EU-WEST-RBX");
// STOCK_OS, not OS: Windows already defines OS=Windows_NT.
const OS = (process.env.STOCK_OS || "linux").toLowerCase();
if (!["linux", "windows"].includes(OS)) {
  console.error(`::error::STOCK_OS doit valoir linux ou windows (reçu : ${OS})`);
  process.exit(2);
}
const SUBSIDIARY = process.env.OVH_SUBSIDIARY || "FR";

const LABELS = {
  "vps-2027-model1": "VPS-1",
  "vps-2027-model2": "VPS-2",
  "vps-2027-model3": "VPS-3",
  "vps-2027-model4": "VPS-4",
};

async function fetchPlan(planCode) {
  const url = `https://eu.api.ovh.com/v1/vps/order/rule/datacenter?ovhSubsidiary=${SUBSIDIARY}&planCode=${planCode}`;
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(20_000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = await res.json();
      if (!Array.isArray(body.datacenters)) throw new Error("réponse inattendue");
      return body.datacenters;
    } catch (error) {
      lastError = error;
      await new Promise((r) => setTimeout(r, 5_000 * attempt));
    }
  }
  throw new Error(`${planCode} : ${lastError?.message ?? lastError}`);
}

const rows = [];
const available = [];
let apiError = null;

for (const plan of PLANS) {
  let datacenters;
  try {
    datacenters = await fetchPlan(plan);
  } catch (error) {
    apiError = error;
    console.error(`::error::API OVH illisible pour ${error.message}`);
    continue;
  }
  for (const dcName of DATACENTERS) {
    const dc = datacenters.find((d) => d.datacenter === dcName);
    const status = dc ? (dc[`${OS}Status`] ?? "inconnu") : "absent";
    rows.push({ plan: LABELS[plan] ?? plan, dc: dcName, status });
    if (status === "available") available.push(`${LABELS[plan] ?? plan} à ${dcName}`);
  }
}

const table = [
  `| Offre | Datacenter | Stock (${OS}) |`,
  "|---|---|---|",
  ...rows.map((r) => `| ${r.plan} | ${r.dc} | ${r.status === "available" ? "**disponible**" : r.status} |`),
].join("\n");

console.log(table);
if (process.env.GITHUB_STEP_SUMMARY) {
  appendFileSync(
    process.env.GITHUB_STEP_SUMMARY,
    `## Stock VPS OVHcloud (${new Date().toISOString()})\n\n${table}\n\n` +
      (available.length
        ? `**Disponible : ${available.join(", ")}.** Commander : https://www.ovhcloud.com/fr/vps/configurator/\n`
        : "Rien de disponible.\n"),
  );
}

if (available.length) {
  console.error(`::error::VPS disponible : ${available.join(", ")}`);
  process.exit(1);
}
if (apiError) process.exit(2);
console.log("Rien de disponible.");
