#!/usr/bin/env node
/* Audit of the KPI November 2026 policy (docs/assessments/kpi_playbook_nov_2026_assessment.md §6):
   reproduces the use cases of the slides (DSE simulator 1 and 2, GA Achiever 1-3, Subs 1st Recharge 1-3) and checks the feed against its sources. */
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..'), D = path.join(root, 'website', 'data');
global.window = global;
require(path.join(D, 'kpi_nov_feed.js')); require(path.join(D, 'dse_kpi_feed.js'));
const K = require(path.join(root, 'website', 'kpi_nov.js')), P = window.KPI_NOV_FEED.policy;
let fail = 0;
function eq(name, got, want) { const ok = Math.abs(got - want) < 0.5; console.log((ok ? 'ok   ' : 'FAIL ') + name + ': ' + got + (ok ? '' : ' (expected ' + want + ')')); if (!ok) fail++; }
const f1 = { s: 1, g: 1 };
function dse(osa, osaT, sp, spT, ga, gaT, cls, sp5, ecU, mapN) {
  const r = { osa_all: osa, osa_amt: osa, osa_tgt: osaT, osa_tgt_src: 'official', sp3_pcs: sp, spi_pcs: 0, sp_tgt: spT, cls: cls, sp_uar5: sp5, prod: ecU, actual: mapN };
  const n = { ga: [ga, 0], ga_t: [0, 0, gaT], map_n: mapN, ec_u: ecU, vis_u: mapN, gslab: [0, 0, 0], gelig: 0, hy: 1 };
  return K.scoreDse(r, n, P, f1, { osa: 'all', spi: true });
}
let o = dse(200e6, 200e6, 500, 500, 500, 500, 'U', 30, 35, 50);
eq('use case 1 OSA', o.osaInc, 750000); eq('use case 1 SP', o.spInc, 500000); eq('use case 1 GA + double', o.gaInc + o.gaDbl, 2000000); eq('use case 1 total', o.total, 3250000); eq('use case 1 index', o.idx * 100, 100); eq('use case 1 final', o.final, 3250000);
o = dse(130e6, 130e6, 250, 250, 400, 400, 'U', 30, 35, 50);
eq('use case 2 OSA', o.osaInc, 520000); eq('use case 2 SP', o.spInc, 250000); eq('use case 2 GA + double', o.gaInc + o.gaDbl, 1600000); eq('use case 2 total', o.total, 2370000);
o = dse(130e6, 130e6, 250, 250, 400, 500, 'U', 30, 35, 50);   // GA 80%: Rp 1.000 per GA, no double
eq('GA 80% slab', o.gaInc, 400000); eq('GA 80% no double', o.gaDbl, 0);
const idx = (c) => K.indexOf(P.dse.compliance.index, c) * 100;
eq('index 100%', idx(1), 100); eq('index 95%', idx(0.95), 97); eq('index 85%', idx(0.85), 95); eq('index 79%', idx(0.79), 0);
// GA Achiever use cases (hybrid): counts per slab
function ga(slab, nPjp, elig) { const arr = []; for (let i = 0; i < slab[0]; i++) arr.push(8); for (let i = 0; i < slab[1]; i++) arr.push(15); for (let i = 0; i < slab[2]; i++) arr.push(25);
  let e = elig - arr.length; for (let i = 0; i < Math.max(e, 0); i++) arr.push(3); while (arr.length < nPjp) arr.push(0); return K.gaAchieverCalc(P, arr, true); }
let g = ga([8, 12, 8], 38, 32); eq('GA Achiever UC1 raw', g.raw, 320000); eq('GA Achiever UC1 paid', g.paid, 300000);
g = ga([9, 8, 4], 38, 27); eq('GA Achiever UC2 raw', g.raw, 205000); eq('GA Achiever UC2 paid', g.paid, 205000);
g = ga([6, 4, 5], 40, 20); eq('GA Achiever UC3 raw', g.raw, 170000); eq('GA Achiever UC3 paid (syarat tidak terpenuhi)', g.paid, 0);
// Subs 1st Recharge
const act = (a) => { const out = []; a.forEach(([c0, c1, n]) => { for (let i = 0; i < n; i++) out.push({ m0: c0, m1: c1 }); }); return out; };
let r = K.rechargeCalc(P, act([[7, 0, 5], [0, 7, 6], [12, 0, 2], [0, 12, 3], [25, 0, 1], [0, 25, 2]])); eq('Recharge UC1 M0', r.m0, 65000); eq('Recharge UC1 M1', r.m1, 140000); eq('Recharge UC1 paid', r.paid, 200000);
// feed checks
const kf = window.KPI_NOV_FEED, df = window.DSE_KPI_FEED;
eq('DSE count feed = DSE_KPI_FEED', Object.keys(kf.dses).length, df.dses.length);
const gaSrc = fs.readFileSync(path.join(D, 'ga_feed.js'), 'utf8'), ga_ = JSON.parse(gaSrc.slice(gaSrc.indexOf('{'), gaSrc.lastIndexOf('}') + 1));
let pjp = 0; ga_.outlets.forEach(x => { if (x.sg === 'PJP' && x.dse && x.dse !== 'UNASSIGNED') (x.o || []).forEach((v, i) => { if (i % 2 === 1) pjp += v; }); });
let feedGa = 0; Object.values(kf.dses).forEach(d => { if (d.ga) feedGa += d.ga[0] + d.ga[1]; });
console.log('GA at PJP outlets of a DSE in ga_feed: ' + pjp + ' · in kpi_nov_feed: ' + feedGa + ' (difference = GA of a DSE name shared by two people, not attributed)');
if (feedGa > pjp || pjp - feedGa > 0.01 * pjp) { console.log('FAIL GA total differs by more than 1%'); fail++; }
let ecBad = 0; Object.values(kf.dses).forEach(d => { if (d.map_n != null && (d.ec_u > d.map_n || d.vis_u > d.map_n)) ecBad++; });
eq('DSE with unique effective / visited outlets above mapped outlets', ecBad, 0);
console.log(fail ? 'AUDIT FAILED (' + fail + ')' : 'AUDIT OK');
process.exit(fail ? 1 : 0);
