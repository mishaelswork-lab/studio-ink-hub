#!/usr/bin/env node
/**
 * Tart performance check
 * - Reports built bundle sizes (run `bun run build` first)
 * - Measures API latency to key Supabase endpoints
 * - Measures cold render time for key public pages via headless fetch
 *
 * Usage:
 *   node scripts/perf-check.mjs                        # uses preview URL below
 *   BASE_URL=https://your-app.lovable.app node scripts/perf-check.mjs
 */
import { readdirSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";

const BASE_URL = process.env.BASE_URL || "https://id-preview--14974305-742c-46c1-884a-ecc456ee5259.lovable.app";
const SUPABASE_URL = "https://ccfbfcbgljivdkqsayes.supabase.co";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNjZmJmY2JnbGppdmRrcXNheWVzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0NjAwNTYsImV4cCI6MjA5MTAzNjA1Nn0.9itK_QsH4fPTWazEmyaA2SRe-h4hBzKo_6hNlBMDB_k";

const fmt = (b) => b > 1024 * 1024 ? `${(b/1024/1024).toFixed(2)} MB` : `${(b/1024).toFixed(1)} KB`;
const c = { g: "\x1b[32m", y: "\x1b[33m", r: "\x1b[31m", d: "\x1b[2m", b: "\x1b[1m", x: "\x1b[0m" };

function walk(dir, files = []) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    const s = statSync(p);
    if (s.isDirectory()) walk(p, files);
    else files.push({ path: p, size: s.size });
  }
  return files;
}

function bundleReport() {
  console.log(`\n${c.b}📦 Bundle sizes${c.x}`);
  if (!existsSync("dist")) {
    console.log(`${c.y}  No dist/ folder. Run \`bun run build\` first.${c.x}`);
    return;
  }
  const files = walk("dist").filter(f => /\.(js|css)$/.test(f.path));
  const total = files.reduce((s, f) => s + f.size, 0);
  files.sort((a, b) => b.size - a.size).slice(0, 10).forEach(f => {
    const rel = f.path.replace("dist/", "");
    const color = f.size > 500_000 ? c.r : f.size > 200_000 ? c.y : c.g;
    console.log(`  ${color}${fmt(f.size).padStart(10)}${c.x}  ${rel}`);
  });
  console.log(`  ${c.b}${fmt(total).padStart(10)}  TOTAL${c.x}`);
  if (total > 2_000_000) console.log(`  ${c.r}⚠ Total bundle > 2 MB. Consider code-splitting.${c.x}`);
}

async function timeIt(label, fn) {
  const t0 = performance.now();
  try {
    const result = await fn();
    const ms = performance.now() - t0;
    const color = ms < 200 ? c.g : ms < 600 ? c.y : c.r;
    console.log(`  ${color}${ms.toFixed(0).padStart(5)} ms${c.x}  ${label}${result?.note ? c.d + " " + result.note + c.x : ""}`);
    return ms;
  } catch (e) {
    console.log(`  ${c.r}  ERR ${c.x}  ${label}  ${c.d}${e.message}${c.x}`);
    return -1;
  }
}

async function apiLatency() {
  console.log(`\n${c.b}🌐 Supabase REST latency${c.x}`);
  const headers = { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` };
  await timeIt("artists list", async () => {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/artists?select=id,name&limit=20`, { headers });
    const d = await r.json(); return { note: `${d.length} rows` };
  });
  await timeIt("reels list", async () => {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/reels?select=id&moderation_status=eq.approved&limit=20`, { headers });
    const d = await r.json(); return { note: `${d.length} rows` };
  });
  await timeIt("daily designs", async () => {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/daily_designs?select=id&limit=20`, { headers });
    const d = await r.json(); return { note: `${d.length} rows` };
  });
}

async function pageRender() {
  console.log(`\n${c.b}📄 Page TTFB / HTML fetch (${BASE_URL})${c.x}`);
  for (const path of ["/", "/discover", "/studios", "/login"]) {
    await timeIt(path, async () => {
      const r = await fetch(`${BASE_URL}${path}`);
      const text = await r.text();
      return { note: `${(text.length/1024).toFixed(0)} KB HTML` };
    });
  }
}

(async () => {
  console.log(`${c.b}Tart performance check${c.x}  ${c.d}${new Date().toISOString()}${c.x}`);
  bundleReport();
  await apiLatency();
  await pageRender();
  console.log(`\n${c.d}Tip: thresholds — green <200ms (api) / <600ms (page), yellow <600/1500, red above.${c.x}\n`);
})();
