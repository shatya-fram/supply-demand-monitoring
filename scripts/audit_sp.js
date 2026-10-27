#!/usr/bin/env node
/* audit_sp.js · SP definitions (owner, 27 Oct 2026; docs/assessments/sp_sellin_definition_assessment.md)
   Checks the SP feeds against each other: classes add up, brand split adds up, SP Injection de-duplication is consistent. */
const fs = require('fs');
const J = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));
const K = J('data/processed/dse_kpi_feed.json'), P = J('data/processed/penjualan_feed.json'), D = J('data/processed/demand_feed.json');
let ok = 0, bad = 0;
const chk = (name, cond, extra) => { if (cond) ok++; else { bad++; console.log('✗ ' + name + (extra ? ' · ' + extra : '')); } };
const sum = (a, f) => a.reduce((s, r) => s + (f(r) || 0), 0);
const R = K.dses;

chk('KPI: sp_pcs = sp3 + sp0 + spx', Math.abs(sum(R, r => r.sp_pcs) - sum(R, r => r.sp3_pcs + r.sp0_pcs + r.spx_pcs)) <= R.length, sum(R, r => r.sp_pcs) + ' vs ' + sum(R, r => r.sp3_pcs + r.sp0_pcs + r.spx_pcs));
chk('KPI: every row has spb', R.every(r => r.spb && r.spb.IM3 && r.spb['3ID'] && r.spb.NB));
['IM3', '3ID', 'NB'].forEach(b => chk('KPI: spb ' + b + ' arrays of 6', R.every(r => r.spb[b].length === 6)));
const spbSp3 = sum(R, r => ['IM3', '3ID', 'NB'].reduce((s, b) => s + r.spb[b][0], 0)), spbSpi = sum(R, r => ['IM3', '3ID', 'NB'].reduce((s, b) => s + r.spb[b][3], 0));
chk('KPI: brand split of SP Data = sp3_pcs', Math.abs(spbSp3 - sum(R, r => r.sp3_pcs)) <= R.length, spbSp3 + ' vs ' + sum(R, r => r.sp3_pcs));
chk('KPI: brand split of SP Injection = spi_pcs', Math.abs(spbSpi - sum(R, r => r.spi_pcs)) <= R.length, spbSpi + ' vs ' + sum(R, r => r.spi_pcs));
chk('KPI: spi_pcs <= penjualan SPI MTD', sum(R, r => r.spi_pcs) <= P.metadata.spi.pcs);
// de-dup: penjualan SPI = demand SPI total after the de-dup, the de-dup is recorded
const dd = D.metadata.spi_dedup;
chk('Demand: spi_dedup recorded', !!dd && typeof dd.mtd_pcs === 'number');
if (dd) {
  chk('Demand: every de-duplicated row is a distinct id/product/day', new Set(dd.mtd_rows.map(r => r.slice(0, 3).join('|'))).size === dd.mtd_rows.length);
  chk('Demand: de-dup MTD pcs = sum of its rows', dd.mtd_pcs === dd.mtd_rows.reduce((s, r) => s + r[3], 0));
  chk('Demand: de-dup stays small (< 15% of MTD SP Injection)', dd.mtd_pcs < 0.15 * (P.metadata.spi.pcs + dd.mtd_pcs), dd.mtd_pcs + ' of ' + (P.metadata.spi.pcs + dd.mtd_pcs));
}
chk('Penjualan SPI MTD = demand SPI MTD', Math.abs(P.metadata.spi.pcs - (D.totals && D.totals.SPI ? D.totals.SPI[0] : P.metadata.spi.pcs)) <= 1);
// per brand rows of mc_daily add up to the SPI total
let mcm = 0; P.mc_daily.filter(r => r.cat === 'SPI').forEach(r => r.m.forEach(x => mcm += x[0]));
chk('Penjualan mc_daily SPI = metadata.spi.pcs', Math.abs(mcm - P.metadata.spi.pcs) <= 1, mcm + ' vs ' + P.metadata.spi.pcs);
// daily series for the heat map
const sk = P.outlets.reduce((s, o) => s + (o.sk || []).reduce((t, d) => t + d[1], 0), 0);
chk('Penjualan sk (daily SP Data) present', sk > 0);
chk('Penjualan sk >= KPI SP Data (sk also holds non-DSE outlets)', sk >= sum(R, r => r.sp3_pcs) - R.length, sk + ' vs ' + sum(R, r => r.sp3_pcs));
console.log(bad ? ('✗ ' + bad + ' pemeriksaan gagal, ' + ok + ' sesuai') : ('Semua ' + ok + ' pemeriksaan sesuai'));
process.exit(bad ? 1 : 0);
