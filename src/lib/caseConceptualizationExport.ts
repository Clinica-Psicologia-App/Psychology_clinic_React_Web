import type { CaseConceptualizationRow } from '../types'

const CORE_NEEDS: Record<string, string> = {
  conexao: 'Conexão (afeto, aceitação, amor)',
  expressao: 'Expressão de emoções e necessidades',
  seguranca: 'Segurança e previsibilidade',
  limites: 'Limites realistas e autocontrole',
  espontaneidade: 'Espontaneidade e brincadeira',
  competencia: 'Afirmação de competência (autonomia)',
  autonomia_respeito: 'Respeito à autonomia',
  valor: 'Valor intrínseco',
  modelo: 'Modelo saudável (cuidador competente)',
}

const RATING_LABELS = ['Não afetada', 'Muito leve', 'Leve', 'Moderada', 'Intensa', 'Muito intensa']

function esc(value?: string | number | null) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/\n/g, '<br>')
}

function ratingLabel(rating?: string | null) {
  if (!rating) return ''
  if (rating === 'X') return 'Informação insuficiente'
  const n = parseInt(rating, 10)
  return Number.isNaN(n) ? rating : `${rating} — ${RATING_LABELS[n] ?? ''}`
}

function block(label: string, value?: string | null) {
  return value ? `<p><strong>${esc(label)}:</strong> ${esc(value)}</p>` : ''
}

function plain(value?: string | null) {
  return value ? `<p>${esc(value)}</p>` : ''
}

function section(title: string, body: string) {
  return body.trim() ? `<h2>${esc(title)}</h2>${body}` : ''
}

export function buildCaseConceptualizationHtml(cc: CaseConceptualizationRow, patientName: string): string {
  const needs = (cc.unmet_needs ?? [])
    .filter((n) => n.rating && n.rating !== '0')
    .map((n) => `<li><strong>${esc(CORE_NEEDS[n.need_key] ?? n.need_key)}</strong> — ${esc(ratingLabel(n.rating))}${n.schemas ? `<br>Esquemas: ${esc(n.schemas)}` : ''}${n.origin ? `<br>Origem: ${esc(n.origin)}` : ''}</li>`)
    .join('')

  const modes = (cc.mode_sequences ?? [])
    .filter((s) => s.trigger || s.activated_modes || s.coping_mode || s.sequence || s.effect)
    .map((s, i) => `<div class="card"><strong>Sequência ${i + 1}</strong>${block('Gatilho', s.trigger)}${block('Modos ativados', s.activated_modes)}${block('Modo de coping', s.coping_mode)}${block('Sequência', s.sequence)}${block('Efeito', s.effect)}${block('Perpetuação', s.perpetuation)}</div>`)
    .join('')

  const rel = cc.therapeutic_relationship
  const relationship = rel
    ? `${rel.collaboration_rating != null ? block('Colaboração', `${rel.collaboration_rating}/5${rel.collaboration_notes ? ` — ${rel.collaboration_notes}` : ''}`) : ''}${rel.bond_rating != null ? block('Vínculo', `${rel.bond_rating}/5${rel.bond_notes ? ` — ${rel.bond_notes}` : ''}`) : ''}${block('Reações do terapeuta', rel.therapist_reactions)}`
    : ''

  const impressions = `${block('Apresentação inicial', cc.general_impressions?.initial)}${block('Apresentação atual', cc.general_impressions?.current)}`
  const diagnosis = `${block('Sistema', cc.diagnosis?.system)}${(cc.diagnosis?.items ?? []).filter((d) => d.name).map((d) => `<p>${esc(d.name)}${d.code ? ` (${esc(d.code)})` : ''}</p>`).join('')}`
  const origins = `${block('História inicial', cc.origins?.early_history)}${block('Fatores temperamentais / biológicos', cc.origins?.temperament)}${block('Fatores culturais, étnicos e religiosos', cc.origins?.cultural)}`

  const body = [
    section('Motivo / queixa (terapeuta)', plain(cc.motivo_notes)),
    section('Impressões gerais', impressions),
    section('Diagnóstico', diagnosis),
    section('Necessidades não atendidas', needs ? `<ul>${needs}</ul>` : ''),
    section('Sequências de modos', modes),
    section('Origens', origins),
    section('Relação terapêutica', relationship),
    section('Comentários adicionais', plain(cc.additional_comments)),
  ].join('')

  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Conceitualização de caso — ${esc(patientName)}</title>
<style>
body{font-family:Calibri,Arial,sans-serif;color:#1a2540;margin:32px;line-height:1.5}
h1{font-size:22px;margin:0 0 4px}h2{font-size:15px;margin:22px 0 8px;border-bottom:1px solid #d5dbe8;padding-bottom:4px;color:#17306b}
.sub{color:#5b6684;font-size:12px;margin-bottom:18px}p{margin:4px 0;font-size:13px}li{font-size:13px;margin-bottom:6px}
.card{border:1px solid #d5dbe8;border-radius:6px;padding:8px 12px;margin-bottom:8px}
</style></head><body>
<h1>Conceitualização de caso</h1>
<div class="sub">Paciente: ${esc(patientName)} · Gerado em ${esc(new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' }).format(new Date()))} · EsquemaCore</div>
${body || '<p>Conceitualização sem conteúdo preenchido.</p>'}
</body></html>`
}

function fileSafe(name: string) {
  return name.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_|_$/g, '') || 'paciente'
}

export function exportCaseConceptualizationWord(cc: CaseConceptualizationRow, patientName: string) {
  const html = buildCaseConceptualizationHtml(cc, patientName)
  const blob = new Blob(['﻿', html], { type: 'application/msword' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `conceitualizacao_${fileSafe(patientName)}.doc`
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export function exportCaseConceptualizationPdf(cc: CaseConceptualizationRow, patientName: string): boolean {
  const win = window.open('', '_blank')
  if (!win) return false
  win.document.open()
  win.document.write(buildCaseConceptualizationHtml(cc, patientName))
  win.document.close()
  win.focus()
  win.onload = () => win.print()
  setTimeout(() => win.print(), 400)
  return true
}
