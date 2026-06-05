#!/usr/bin/env node
/**
 * Fix bloated blog posts by replacing corrupted table lines with clean ones.
 * - Spain file: Lines 107 and 182 have corrupted table cells (~540KB total)
 * - 183-Day Myth file: Line 132 has a corrupted table cell (~335KB)
 */
import { readFileSync, writeFileSync } from 'fs';

// --- Fix 1: Spain's Beckham Law vs Portugal's NHR ---
const spainFile = 'src/blog/spain-s-beckham-law-vs-portugal-s-nhr-which-tax-hack-saves-you-more-in-2026.md';
const spainContent = readFileSync(spainFile, 'utf-8');
const spainLines = spainContent.split('\n');
const origSpainSize = Buffer.byteLength(spainContent);
console.log(`Spain file: ${spainLines.length} lines, ${origSpainSize} bytes`);

const cleanTable1 = [
  '| Feature                 | Portugal NHR (2026)                                                              | Spain Beckham Law (2026)                                                          |',
  '|-------------------------|----------------------------------------------------------------------------------|-----------------------------------------------------------------------------------|',
  '| **Duration**            | 10 years                                                                         | 6 years                                                                           |',
  '| **Foreign Income Tax**  | Potentially 0% on most foreign-sourced income (dividends, interest, royalties)   | Most foreign-sourced income exempt from Spanish tax                                |',
  '| **Local Income Tax**    | Flat 20% on qualifying Portuguese-sourced income                                 | Flat 24% on Spanish-sourced employment income up to €600k; 47% above              |',
  '| **Wealth Tax**          | Generally not imposed on foreign assets                                          | Exempt from Spanish wealth tax and Modelo 720                                     |',
  '| **Social Security**     | Required; can be substantial for self-employed                                   | Required; standard Spanish contributions apply                                    |',
  '| **Eligibility**         | Not tax resident in Portugal for prior 5 years                                   | Not tax resident in Spain for prior 5 years; must relocate for work               |',
];

const cleanTable2 = [
  '| Feature                 | Portugal NHR (2026)                                                              | Spain Beckham Law (2026)                                                          |',
  '|-------------------------|----------------------------------------------------------------------------------|-----------------------------------------------------------------------------------|',
  '| **Duration**            | 10 years                                                                         | 6 years                                                                           |',
  '| **Foreign Income Tax**  | Potentially 0% on most foreign-sourced income                                    | Most foreign-sourced income exempt                                                |',
  '| **Local Income Tax**    | Flat 20% on qualifying Portuguese-sourced income                                 | Flat 24% up to €600k; 47% above                                                  |',
  '| **Wealth Tax**          | Generally not imposed on foreign assets                                          | Exempt from wealth tax and Modelo 720                                             |',
  '| **Social Security**     | Required for self-employed                                                       | Standard Spanish contributions                                                    |',
  '| **Best For**            | Long-term nomads, retirees, diverse foreign income                               | High-earning employees, entrepreneurs, wealth tax avoidance                       |',
];

const fixedSpainLines = [];
let tableCount = 0;
for (let i = 0; i < spainLines.length; i++) {
  const line = spainLines[i];
  if (line.length > 5000) {
    tableCount++;
    if (tableCount === 1) {
      console.log(`  Replacing corrupted line ${i + 1} (${line.length} chars) with clean table 1`);
      fixedSpainLines.push(...cleanTable1);
    } else {
      console.log(`  Replacing corrupted line ${i + 1} (${line.length} chars) with clean table 2`);
      fixedSpainLines.push(...cleanTable2);
    }
  } else {
    fixedSpainLines.push(line);
  }
}

const newSpainContent = fixedSpainLines.join('\n');
writeFileSync(spainFile, newSpainContent);
const newSpainSize = Buffer.byteLength(newSpainContent);
console.log(`✅ Spain file fixed: ${newSpainSize} bytes (was ${origSpainSize}, saved ${((origSpainSize - newSpainSize) / 1024).toFixed(0)}KB)\n`);

// --- Fix 2: The 183-Day Myth ---
const mythFile = 'src/blog/the-183-day-myth-why-nomad-tax-residency-is-not-just-about-days-spent.md';
const mythContent = readFileSync(mythFile, 'utf-8');
const mythLines = mythContent.split('\n');
const origMythSize = Buffer.byteLength(mythContent);
console.log(`183-Day file: ${mythLines.length} lines, ${origMythSize} bytes`);

const cleanMythTable = [
  '| Country          | Tax System/Program           | Key Residency/Tax Condition                                                                 | Nomad Budgeter Link |',
  '|------------------|------------------------------|---------------------------------------------------------------------------------------------|---------------------|',
  '| **UAE (Dubai)**  | Jurisdictional Zero (0% PIT) | Visa + 183 days presence; no income tax                                                     | [Dubai](/cities/dubai/) |',
  '| **Portugal**     | NHR (0-20% for 10 yrs)      | Not resident for prior 5 yrs; 0% on most foreign income                                    | [Lisbon](/cities/lisbon/) |',
  '| **Spain**        | Beckham Law (24% flat)       | Not resident for prior 5 yrs; 24% on local income, foreign income exempt                   | [Madrid](/cities/madrid/) |',
  '| **Panama**       | Territorial                  | Only taxes Panama-sourced income; foreign income exempt                                     | [Panama City](/cities/panama-city/) |',
  '| **Costa Rica**   | Territorial + Nomad Visa     | Foreign income not taxed; streamlined "Ventanilla Única" process                            | — |',
  '| **Malaysia**     | Territorial                  | Foreign-sourced income generally exempt; MM2H visa program                                  | [Kuala Lumpur](/cities/kuala-lumpur/) |',
  '| **Thailand**     | Territorial (evolving)       | Foreign income not remitted = not taxed; rules tightening in 2026                           | [Bangkok](/cities/bangkok/) |',
  '| **Croatia**      | Digital Nomad Visa           | 12-month tax holiday on foreign income; must apply before arrival                           | — |',
  '| **Bali (Indonesia)** | E33G Digital Nomad Visa  | Tax-free on foreign income for visa duration; strict compliance                             | [Bali](/cities/bali/) |',
  '| **Georgia**      | Territorial                  | Foreign income exempt; easy residency; flat 1% for small businesses                        | [Tbilisi](/cities/tbilisi/) |',
];

const fixedMythLines = [];
for (let i = 0; i < mythLines.length; i++) {
  const line = mythLines[i];
  if (line.length > 10000) {
    console.log(`  Replacing corrupted line ${i + 1} (${line.length} chars) with clean destination table`);
    fixedMythLines.push(...cleanMythTable);
  } else {
    fixedMythLines.push(line);
  }
}

const newMythContent = fixedMythLines.join('\n');
writeFileSync(mythFile, newMythContent);
const newMythSize = Buffer.byteLength(newMythContent);
console.log(`✅ 183-Day file fixed: ${newMythSize} bytes (was ${origMythSize}, saved ${((origMythSize - newMythSize) / 1024).toFixed(0)}KB)`);

console.log('\n✅ Both bloated posts fixed!');
