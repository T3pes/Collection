import { pad } from './cards';
import type { CardView } from './types';

function download(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function fileBaseName(label: string): string {
  return (
    label
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[\\/:*?"<>|·]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim() || 'collezione'
  );
}

export const statusLabel = (c: Pick<CardView, 'status'>) => (c.status === 'owned' ? 'Posseduta' : c.status === 'pending' ? 'In arrivo' : 'Mancante');

const HEADERS = ['#', 'Nome', 'Sottotitolo', 'Rarità', 'Versione', 'Tipo', 'Stato', 'Copie', 'Prezzo €'];
const row = (c: CardView, rarity: (r: string | null) => string) => [
  pad(c.number),
  c.name,
  c.subtitle ?? '',
  rarity(c.rarity),
  c.version,
  c.type ?? '',
  statusLabel(c),
  c.status === 'owned' ? String(c.quantity) : '0',
  c.price != null ? c.price.toFixed(2).replace('.', ',') : '',
];

export function exportCsv(cards: CardView[], base: string, rarity: (r: string | null) => string) {
  const q = (v: string) => (/[";\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  const lines = [HEADERS.join(';'), ...cards.map((c) => row(c, rarity).map(q).join(';'))];
  download(new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8' }), `${base}.csv`);
}

export function exportExcel(cards: CardView[], base: string, rarity: (r: string | null) => string) {
  const esc = (v: string) => v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const body = cards.map((c) => `<tr>${row(c, rarity).map((v) => `<td>${esc(v)}</td>`).join('')}</tr>`).join('');
  const html = `<html xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="utf-8"/></head><body><table><thead><tr>${HEADERS.map((h) => `<th>${h}</th>`).join('')}</tr></thead><tbody>${body}</tbody></table></body></html>`;
  download(new Blob(['﻿' + html], { type: 'application/vnd.ms-excel;charset=utf-8' }), `${base}.xls`);
}

/** Elenco compatto "Rarità | Versione: 1,4,12" — comodo da incollare in chat o negli annunci */
export function numericList(cards: CardView[], title: string, rarity: (r: string | null) => string): string {
  const groups = new Map<string, Set<number>>();
  for (const c of cards) {
    const k = `${rarity(c.rarity)} | ${c.version}`;
    if (!groups.has(k)) groups.set(k, new Set());
    groups.get(k)!.add(c.number);
  }
  const lines = [...groups.entries()]
    .sort((a, b) => a[0].localeCompare(b[0], 'it'))
    .map(([k, nums]) => `${k}: ${[...nums].sort((a, b) => a - b).join(',')}`);
  return [title, ...lines].join('\n');
}

export function exportNumericList(cards: CardView[], title: string, base: string, rarity: (r: string | null) => string) {
  download(new Blob([numericList(cards, title, rarity)], { type: 'text/plain;charset=utf-8' }), `${base}_lista_numerica.txt`);
}
