/**
 * Genograma gráfico — simbologia idêntica ao app Flutter.
 * Quadrado = masculino · Círculo = feminino · Losango = outro/NI
 * Triângulo = perda gestacional · X = falecido · Metade preenchida = adoecimento
 * Paciente focal = símbolo de gênero com stroke teal + halo pulsante
 * Cuidador = anel âmbar · Adoção = linha tracejada descendente
 * Relações: spouse, ex_spouse, separation, close, distant, conflict, close_and_conflict, ruptured
 */
import { useMemo } from 'react'
import type { GenogramPersonRow, GenogramRelationshipRow } from '../../types'

// ── Layout ───────────────────────────────────────────────────────────────────
const ROW_GAP = 130
const COL_GAP = 90
const SYMR = 22
const PATR = 24
const PAD_X = 48
const PAD_Y = 44
const BAR_OFFSET = 26

// ── Cores (espelham o Flutter) ────────────────────────────────────────────────
const C_NAVY   = '#0d1b3d'
const C_TEAL   = '#0f9c90'
const C_TEAL_F = '#eafaf7'
const C_LINE   = '#5b6b86'
const C_LABEL  = '#374151'
const C_SUB    = '#9ca3af'
const C_AMBER  = '#e0a400'
const C_GREEN  = '#2e7d6b'
const C_OCHRE  = '#b5651d'
const C_RED    = '#b03a3a'

const ILLNESS_COLORS: Record<string, string> = {
  physical: '#2a5a8a',
  mental:   '#7a3a8a',
  both:     '#4a4a8a',
}

// ── Tipos ────────────────────────────────────────────────────────────────────
type Sex = 'male' | 'female' | 'other'
type Gen = 0 | 1 | 2 | 3

function inferSex(gender?: string | null, rel?: string | null): Sex {
  const g = (gender ?? '').toLowerCase()
  // Valores do Flutter: 'male', 'female', 'other', 'unknown'
  if (g === 'male'   || /masc/.test(g)) return 'male'
  if (g === 'female' || /fem/.test(g))  return 'female'
  if (g === 'other'  || g === 'unknown') return 'other'
  // Fallback por texto do relacionamento
  const r = (rel ?? '').toLowerCase()
  if (/\b(pai|avô|irmão|primo|tio|padrasto|filho|marido|enteado|neto|bisavô)\b/.test(r)) return 'male'
  if (/\b(mãe|avó|irmã|prima|tia|madrasta|filha|esposa|enteada|neta|bisavó)\b/.test(r)) return 'female'
  return 'other'
}

function inferGen(rel: string): Gen {
  const r = rel.toLowerCase()
  if (/avô|avó|bisavô|bisavó/.test(r))                           return 0
  if (/\b(pai|mãe|padrasto|madrasta|tio|tia)\b/.test(r))         return 1
  if (/\b(filho|filha|enteado|enteada|neto|neta)\b/.test(r))     return 3
  return 2
}

function isSibling(p: GenogramPersonRow) {
  return /\b(irmão|irmã)\b/.test((p.relationship_to_patient ?? '').toLowerCase())
}

function isPartner(p: GenogramPersonRow) {
  return /\b(cônjuge|parceiro|parceira|esposo|esposa|marido|namorado|namorada|companheiro|companheira)\b/.test(
    (p.relationship_to_patient ?? '').toLowerCase(),
  )
}

function personAge(person: GenogramPersonRow): number | null {
  if (!person.birth_year) return null
  const end = person.death_year ?? new Date().getFullYear()
  const a = end - person.birth_year
  return a >= 0 && a < 130 ? a : null
}

// ── Delays de animação ────────────────────────────────────────────────────────
const GEN_BASE: Record<Gen, number> = { 0: 0.1, 1: 0.5, 2: 0.9, 3: 1.3 }
const CONN_DELAY: Record<string, number> = { gp: 0.3, parent: 0.65, sib: 0.85, child: 1.2 }

// ── NodeInfo ──────────────────────────────────────────────────────────────────
type NodeInfo = { person: GenogramPersonRow; sex: Sex; gen: Gen; x: number; y: number; idx: number }
type RowMeta  = { gen: Gen; allNodes: NodeInfo[]; nodesBefore: NodeInfo[]; nodesAfter: NodeInfo[]; hasPatient: boolean; y: number }
type Layout   = { nodes: NodeInfo[]; patientPos: { x: number; y: number }; svgWidth: number; svgHeight: number; rows: RowMeta[] }

function buildLayout(persons: GenogramPersonRow[]): Layout {
  const byGen: Record<Gen, GenogramPersonRow[]> = { 0: [], 1: [], 2: [], 3: [] }
  for (const p of persons) byGen[inferGen(p.relationship_to_patient ?? '')]!.push(p)

  const activeGens: Gen[] = ([0, 1, 2, 3] as Gen[]).filter((g) => byGen[g].length > 0 || g === 2)
  const maxCount = Math.max(...activeGens.map((g) => byGen[g].length + (g === 2 ? 1 : 0)), 3)
  const svgWidth  = PAD_X * 2 + maxCount * COL_GAP
  const svgHeight = PAD_Y * 2 + PATR + (activeGens.length - 1) * ROW_GAP + 60

  const rows: RowMeta[] = []
  const allNodes: NodeInfo[] = []
  let patientPos = { x: svgWidth / 2, y: PAD_Y + PATR }

  activeGens.forEach((gen, rowIdx) => {
    const rowPersons = byGen[gen]
    const hasPatient = gen === 2
    const count = rowPersons.length + (hasPatient ? 1 : 0)
    const startX = (svgWidth - count * COL_GAP) / 2 + COL_GAP / 2
    const y = PAD_Y + PATR + rowIdx * ROW_GAP
    if (hasPatient) {
      const mid = Math.floor(rowPersons.length / 2)
      const before = rowPersons.slice(0, mid)
      const after  = rowPersons.slice(mid)
      const nodesBefore: NodeInfo[] = before.map((p, i) => ({ person: p, sex: inferSex(p.gender, p.relationship_to_patient), gen, x: startX + i * COL_GAP, y, idx: i }))
      const patientX = startX + mid * COL_GAP
      patientPos = { x: patientX, y }
      const nodesAfter: NodeInfo[] = after.map((p, i) => ({ person: p, sex: inferSex(p.gender, p.relationship_to_patient), gen, x: patientX + (i + 1) * COL_GAP, y, idx: mid + i }))
      const rowAll = [...nodesBefore, ...nodesAfter]
      allNodes.push(...rowAll)
      rows.push({ gen, allNodes: rowAll, nodesBefore, nodesAfter, hasPatient: true, y })
    } else {
      const rowNodes: NodeInfo[] = rowPersons.map((p, i) => ({ person: p, sex: inferSex(p.gender, p.relationship_to_patient), gen, x: startX + i * COL_GAP, y, idx: i }))
      allNodes.push(...rowNodes)
      rows.push({ gen, allNodes: rowNodes, nodesBefore: [], nodesAfter: [], hasPatient: false, y })
    }
  })

  return { nodes: allNodes, patientPos, svgWidth, svgHeight: Math.max(svgHeight, 300), rows }
}

// ── Caminhos SVG ──────────────────────────────────────────────────────────────
function diamondPath(cx: number, cy: number, r: number) {
  return `M${cx},${cy - r} L${cx + r},${cy} L${cx},${cy + r} L${cx - r},${cy}z`
}

function trianglePath(cx: number, cy: number, r: number) {
  // Mesmo que Flutter: aponta para cima
  return `M${cx},${cy - r} L${cx + r},${cy + r * 0.7} L${cx - r},${cy + r * 0.7}z`
}

// ── Metade inferior do símbolo (adoecimento) ──────────────────────────────────
function IllnessHalf({ cx, cy, r, sex, color }: { cx: number; cy: number; r: number; sex: Sex; color: string }) {
  const fill = color
  const op = 0.75
  if (sex === 'female') {
    // Semicírculo inferior: arco de (cx-r,cy) passando por baixo até (cx+r,cy)
    return <path d={`M${cx - r},${cy} A${r},${r} 0 0 1 ${cx + r},${cy}z`} fill={fill} fillOpacity={op} />
  }
  if (sex === 'other') {
    // Metade inferior do losango: (cx-r,cy) → (cx,cy+r) → (cx+r,cy)
    return <path d={`M${cx - r},${cy} L${cx},${cy + r} L${cx + r},${cy}z`} fill={fill} fillOpacity={op} />
  }
  // Quadrado: metade inferior
  return <rect x={cx - r} y={cy} width={r * 2} height={r} fill={fill} fillOpacity={op} />
}

// ── Linha animada ─────────────────────────────────────────────────────────────
function ConnLine({ x1, y1, x2, y2, delay, dashed }: { x1: number; y1: number; x2: number; y2: number; delay: number; dashed?: boolean }) {
  return (
    <line
      x1={x1} y1={y1} x2={x2} y2={y2}
      stroke="#cbd5e1" strokeWidth={1.8} fill="none"
      strokeDasharray={dashed ? '6 4' : '600'}
      strokeDashoffset={dashed ? undefined : 600}
      className={dashed ? undefined : 'geno-conn-line'}
      style={dashed ? undefined : { animationDelay: `${delay}s` }}
    />
  )
}

// ── Conectores estruturais ─────────────────────────────────────────────────────
function StructuralConnectors({ rows, patientPos }: { rows: RowMeta[]; patientPos: { x: number; y: number } }) {
  const elems: React.ReactNode[] = []
  const gpRow    = rows.find((r) => r.gen === 0)
  const parRow   = rows.find((r) => r.gen === 1)
  const peerRow  = rows.find((r) => r.gen === 2)
  const childRow = rows.find((r) => r.gen === 3)

  if (gpRow && gpRow.allNodes.length >= 2) {
    const gf = gpRow.allNodes.find((n) => n.sex === 'male')
    const gm = gpRow.allNodes.find((n) => n.sex === 'female')
    if (gf && gm) {
      const [lx, rx] = [Math.min(gf.x, gm.x), Math.max(gf.x, gm.x)]
      const y = gpRow.y
      const midX = (gf.x + gm.x) / 2
      const targetY = parRow ? parRow.y - SYMR - BAR_OFFSET : y + ROW_GAP - SYMR
      elems.push(<ConnLine key="gp-union" x1={lx + SYMR} y1={y} x2={rx - SYMR} y2={y} delay={CONN_DELAY.gp} />)
      elems.push(<ConnLine key="gp-desc" x1={midX} y1={y} x2={midX} y2={targetY} delay={CONN_DELAY.gp + 0.05} />)
    }
  }

  let unionMid: { x: number; y: number } | null = null
  if (parRow && parRow.allNodes.length > 0) {
    const father = parRow.allNodes.find((n) => n.sex === 'male')
    const mother = parRow.allNodes.find((n) => n.sex === 'female')
    if (father && mother) {
      const [lx, rx] = [Math.min(father.x, mother.x), Math.max(father.x, mother.x)]
      const y = parRow.y
      elems.push(<ConnLine key="par-union" x1={lx + SYMR} y1={y} x2={rx - SYMR} y2={y} delay={CONN_DELAY.parent} />)
      unionMid = { x: (father.x + mother.x) / 2, y }
    } else {
      const only = father ?? mother
      if (only) unionMid = { x: only.x, y: only.y }
    }
  }

  if (peerRow) {
    const barMembers = [
      ...peerRow.nodesBefore.filter((n) => isSibling(n.person)).map((n) => ({ x: n.x, r: SYMR })),
      { x: patientPos.x, r: PATR },
      ...peerRow.nodesAfter.filter((n) => isSibling(n.person)).map((n) => ({ x: n.x, r: SYMR })),
    ]
    if (barMembers.length > 0) {
      const barY  = patientPos.y - PATR - BAR_OFFSET
      const leftX = Math.min(...barMembers.map((m) => m.x))
      const rightX = Math.max(...barMembers.map((m) => m.x))
      if (barMembers.length > 1) elems.push(<ConnLine key="sib-bar" x1={leftX} y1={barY} x2={rightX} y2={barY} delay={CONN_DELAY.sib} />)
      for (const m of barMembers) elems.push(<ConnLine key={`sib-drop-${m.x}`} x1={m.x} y1={barY} x2={m.x} y2={m.x === patientPos.x ? patientPos.y - m.r : peerRow.y - m.r} delay={CONN_DELAY.sib + 0.05} />)
      if (unionMid) {
        const barCenterX = (leftX + rightX) / 2
        elems.push(<ConnLine key="par-to-bar" x1={unionMid.x} y1={unionMid.y} x2={unionMid.x} y2={barY} delay={CONN_DELAY.sib - 0.05} />)
        if (Math.abs(unionMid.x - barCenterX) > 3) elems.push(<ConnLine key="bar-horiz" x1={unionMid.x} y1={barY} x2={barCenterX} y2={barY} delay={CONN_DELAY.sib} />)
      }
    } else if (unionMid) {
      elems.push(<ConnLine key="par-to-patient" x1={unionMid.x} y1={unionMid.y} x2={patientPos.x} y2={patientPos.y - PATR} delay={CONN_DELAY.sib - 0.05} />)
    }
    const partner = [...peerRow.nodesBefore, ...peerRow.nodesAfter].find((n) => isPartner(n.person))
    if (partner) {
      const lx = Math.min(patientPos.x, partner.x)
      const rx = Math.max(patientPos.x, partner.x)
      const isPatLeft = patientPos.x < partner.x
      elems.push(<ConnLine key="couple-line" x1={lx + (isPatLeft ? PATR : SYMR)} y1={patientPos.y} x2={rx - (isPatLeft ? SYMR : PATR)} y2={partner.y} delay={CONN_DELAY.sib + 0.1} />)
    }
  }

  if (childRow && childRow.allNodes.length > 0) {
    let coupleMidX = patientPos.x
    if (peerRow) {
      const partner = [...peerRow.nodesBefore, ...peerRow.nodesAfter].find((n) => isPartner(n.person))
      if (partner) coupleMidX = (patientPos.x + partner.x) / 2
    }
    const barY      = childRow.allNodes[0].y - SYMR - BAR_OFFSET
    const leftX     = Math.min(...childRow.allNodes.map((n) => n.x))
    const rightX    = Math.max(...childRow.allNodes.map((n) => n.x))
    const barCenterX = (leftX + rightX) / 2
    if (childRow.allNodes.length > 1) elems.push(<ConnLine key="child-bar" x1={leftX} y1={barY} x2={rightX} y2={barY} delay={CONN_DELAY.child} />)
    for (const c of childRow.allNodes) elems.push(<ConnLine key={`child-drop-${c.x}`} x1={c.x} y1={barY} x2={c.x} y2={c.y - SYMR} delay={CONN_DELAY.child + 0.05} />)
    elems.push(<ConnLine key="couple-to-childbar" x1={coupleMidX} y1={patientPos.y + PATR} x2={coupleMidX} y2={barY} delay={CONN_DELAY.child - 0.05} />)
    if (Math.abs(coupleMidX - barCenterX) > 3) elems.push(<ConnLine key="child-bar-center" x1={coupleMidX} y1={barY} x2={barCenterX} y2={barY} delay={CONN_DELAY.child} />)
  }

  return <>{elems}</>
}

// ── Zigzag helper ──────────────────────────────────────────────────────────────
function zigzagD(x1: number, y1: number, x2: number, y2: number): string {
  const dx = x2 - x1, dy = y2 - y1
  const len = Math.hypot(dx, dy)
  if (len < 1) return ''
  const ux = dx / len, uy = dy / len
  const nx = -uy, ny = ux
  const step = 9, amp = 4
  let d = `M${x1},${y1}`, pos = 0, sign = 1
  while (pos < len) {
    const next = Math.min(pos + step, len)
    const midD = (pos + next) / 2
    d += ` L${x1 + ux * midD + nx * amp * sign},${y1 + uy * midD + ny * amp * sign}`
    d += ` L${x1 + ux * next},${y1 + uy * next}`
    sign = -sign; pos = next
  }
  return d
}

// ── Vínculo emocional — tipos espelham Flutter ────────────────────────────────
function EmotionalBond({ x1, y1, x2, y2, type }: { x1: number; y1: number; x2: number; y2: number; type: string }) {
  const dx = x2 - x1, dy = y2 - y1
  const len = Math.hypot(dx, dy)
  if (len < 1) return null
  const ux = dx / len, uy = dy / len
  const sx = SYMR + 6
  const ax = x1 + ux * sx, ay = y1 + uy * sx
  const bx = x2 - ux * sx, by = y2 - uy * sx
  const nx = -uy * 2.4, ny = ux * 2.4
  const t = type.toLowerCase()

  // Tipos estruturais: não renderizar como vínculo emocional
  if (['parent_child', 'sibling', 'twin', 'parental', 'sibling'].includes(t)) return null

  // spouse → linha sólida (conjugal)
  if (t === 'spouse' || t === 'conjugal') {
    return <line x1={ax} y1={ay} x2={bx} y2={by} stroke={C_LINE} strokeWidth={1.8} />
  }
  // ex_spouse → linha + 2 barras vermelhas
  if (t === 'ex_spouse') {
    const mx = (ax + bx) / 2, my = (ay + by) / 2
    const slashNx = -uy * 6, slashNy = ux * 6
    return (
      <>
        <line x1={ax} y1={ay} x2={bx} y2={by} stroke={C_LINE} strokeWidth={1.8} />
        {[-4, 4].map((off) => (
          <line key={off}
            x1={mx + ux * off + slashNx} y1={my + uy * off + slashNy}
            x2={mx + ux * off - slashNx} y2={my + uy * off - slashNy}
            stroke={C_RED} strokeWidth={2} />
        ))}
      </>
    )
  }
  // separation → linha + 1 barra vermelha
  if (t === 'separation') {
    const mx = (ax + bx) / 2, my = (ay + by) / 2
    const slashNx = -uy * 6, slashNy = ux * 6
    return (
      <>
        <line x1={ax} y1={ay} x2={bx} y2={by} stroke={C_LINE} strokeWidth={1.8} />
        <line x1={mx - ux * 4 + slashNx} y1={my - uy * 4 + slashNy}
              x2={mx + ux * 4 - slashNx} y2={my + uy * 4 - slashNy}
              stroke={C_RED} strokeWidth={2} />
      </>
    )
  }
  // close → linha dupla verde
  if (t === 'close' || t.includes('prox')) {
    return (
      <>
        <line x1={ax + nx} y1={ay + ny} x2={bx + nx} y2={by + ny} stroke={C_GREEN} strokeWidth={1.8} />
        <line x1={ax - nx} y1={ay - ny} x2={bx - nx} y2={by - ny} stroke={C_GREEN} strokeWidth={1.8} />
      </>
    )
  }
  // distant → tracejado cinza
  if (t === 'distant' || t.includes('dist')) {
    return <line x1={ax} y1={ay} x2={bx} y2={by} stroke={C_LINE} strokeWidth={1.8} strokeDasharray="6 4" />
  }
  // conflict → zigzag ocre
  if (t === 'conflict' || t.includes('conf')) {
    return <path d={zigzagD(ax, ay, bx, by)} stroke={C_OCHRE} strokeWidth={1.8} fill="none" />
  }
  // close_and_conflict → dupla verde + zigzag ocre por cima
  if (t === 'close_and_conflict') {
    return (
      <>
        <line x1={ax + nx} y1={ay + ny} x2={bx + nx} y2={by + ny} stroke={C_GREEN} strokeWidth={1.8} />
        <line x1={ax - nx} y1={ay - ny} x2={bx - nx} y2={by - ny} stroke={C_GREEN} strokeWidth={1.8} />
        <path d={zigzagD(ax, ay, bx, by)} stroke={C_OCHRE} strokeWidth={1.8} fill="none" />
      </>
    )
  }
  // ruptured → vermelho + 2 barras paralelas
  if (t === 'ruptured' || t.includes('romp') || t.includes('ruptur')) {
    const mx = (ax + bx) / 2, my = (ay + by) / 2
    const perpX = -uy * 5, perpY = ux * 5
    return (
      <>
        <line x1={ax} y1={ay} x2={bx} y2={by} stroke={C_RED} strokeWidth={1.8} />
        {[-3, 3].map((off) => {
          const c = { x: mx + ux * off, y: my + uy * off }
          return <line key={off} x1={c.x + perpX} y1={c.y + perpY} x2={c.x - perpX} y2={c.y - perpY} stroke={C_RED} strokeWidth={1.8} />
        })}
      </>
    )
  }
  // neutral / other / unknown → linha simples
  return <line x1={ax} y1={ay} x2={bx} y2={by} stroke={C_LINE} strokeWidth={1.6} />
}

// ── Símbolo de perda gestacional (triângulo) ──────────────────────────────────
function PregnancyLossSymbol({ x, y, type }: { x: number; y: number; type: string }) {
  const tr = 14
  const d = trianglePath(x, y + 2, tr)
  const isFilled = type === 'stillbirth' || type === 'voluntary'
  return (
    <>
      {isFilled && <path d={d} fill={C_NAVY} />}
      <path d={d} fill={isFilled ? 'none' : 'white'} stroke={C_NAVY} strokeWidth={1.8} />
      {type === 'voluntary' && (
        <>
          <line x1={x - 4} y1={y - 2} x2={x + 4} y2={y + 6} stroke="white" strokeWidth={1.4} />
          <line x1={x + 4} y1={y - 2} x2={x - 4} y2={y + 6} stroke="white" strokeWidth={1.4} />
        </>
      )}
    </>
  )
}

// ── Símbolo de pessoa (card style) ───────────────────────────────────────────
function SymbolCard({
  cx, cy, r, sex,
  isPatient = false,
  illness, deceased,
}: {
  cx: number; cy: number; r: number; sex: Sex
  isPatient?: boolean
  illness?: string | null
  deceased?: boolean | null
}) {
  const fill   = isPatient ? C_TEAL_F : '#fafafa'
  const stroke = isPatient ? C_TEAL   : '#e2e8f0'
  const sw     = isPatient ? 2.6 : 1.5
  const filter = isPatient ? 'url(#geno-shadow-teal)' : 'url(#geno-shadow)'
  const illColor = illness ? ILLNESS_COLORS[illness] ?? '#2a5a8a' : null

  if (sex === 'male') {
    return (
      <>
        <rect x={cx - r - 3} y={cy - r - 3} width={(r + 3) * 2} height={(r + 3) * 2} rx={9} fill="white" filter={filter} />
        <rect x={cx - r} y={cy - r} width={r * 2} height={r * 2} rx={6} fill={fill} />
        {illColor && <rect x={cx - r} y={cy} width={r * 2} height={r} rx={0} fill={illColor} fillOpacity={0.75} />}
        <rect x={cx - r} y={cy - r} width={r * 2} height={r * 2} rx={6} fill="none" stroke={stroke} strokeWidth={sw} />
        {deceased && <><line x1={cx - r} y1={cy - r} x2={cx + r} y2={cy + r} stroke={C_NAVY} strokeWidth={1.8} /><line x1={cx + r} y1={cy - r} x2={cx - r} y2={cy + r} stroke={C_NAVY} strokeWidth={1.8} /></>}
      </>
    )
  }
  if (sex === 'female') {
    return (
      <>
        <circle cx={cx} cy={cy} r={r + 3} fill="white" filter={filter} />
        <circle cx={cx} cy={cy} r={r} fill={fill} />
        {illColor && <path d={`M${cx - r},${cy} A${r},${r} 0 0 1 ${cx + r},${cy}z`} fill={illColor} fillOpacity={0.75} />}
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={stroke} strokeWidth={sw} />
        {deceased && <><line x1={cx - r} y1={cy - r} x2={cx + r} y2={cy + r} stroke={C_NAVY} strokeWidth={1.8} /><line x1={cx + r} y1={cy - r} x2={cx - r} y2={cy + r} stroke={C_NAVY} strokeWidth={1.8} /></>}
      </>
    )
  }
  // other / unknown → losango
  return (
    <>
      <path d={diamondPath(cx, cy, r + 4)} fill="white" filter={filter} />
      <path d={diamondPath(cx, cy, r)} fill={fill} />
      {illColor && <IllnessHalf cx={cx} cy={cy} r={r} sex="other" color={illColor} />}
      <path d={diamondPath(cx, cy, r)} fill="none" stroke={stroke} strokeWidth={sw} />
      {deceased && <><line x1={cx - r} y1={cy - r} x2={cx + r} y2={cy + r} stroke={C_NAVY} strokeWidth={1.8} /><line x1={cx + r} y1={cy - r} x2={cx - r} y2={cy + r} stroke={C_NAVY} strokeWidth={1.8} /></>}
    </>
  )
}

// ── Nó de pessoa ──────────────────────────────────────────────────────────────
function PersonNode({ node, onClick, delay = 0 }: { node: NodeInfo; onClick?: () => void; delay?: number }) {
  const { person, sex, x, y } = node
  const r = SYMR
  const firstName = (person.nickname || person.full_name).split(' ')[0]
  const caregiver  = person.caregiver_role
  const age = personAge(person)

  if (person.pregnancy_loss_type) {
    return (
      <g
        onClick={onClick}
        className="geno-card-node genogram-svg-node"
        style={{ animationDelay: `${delay}s`, cursor: onClick ? 'pointer' : undefined }}
      >
        <PregnancyLossSymbol x={x} y={y} type={person.pregnancy_loss_type} />
        <text x={x} y={y + 22} textAnchor="middle" fontSize={9.5} fontWeight="700" fill={C_LABEL}>{firstName}</text>
        {person.relationship_to_patient && <text x={x} y={y + 33} textAnchor="middle" fontSize={8.5} fill={C_SUB}>{person.relationship_to_patient}</text>}
      </g>
    )
  }

  return (
    <g
      onClick={onClick}
      className="geno-card-node genogram-svg-node"
      style={{ animationDelay: `${delay}s`, cursor: onClick ? 'pointer' : undefined }}
    >
      {/* Halo de cuidador */}
      {caregiver === 'important' && sex === 'female' && <circle cx={x} cy={y} r={r + 9} fill={C_AMBER} fillOpacity={0.12} />}
      {caregiver === 'important' && sex !== 'female' && <rect x={x - r - 9} y={y - r - 9} width={(r + 9) * 2} height={(r + 9) * 2} rx={6} fill={C_AMBER} fillOpacity={0.12} />}

      {/* Símbolo com card shadow */}
      <SymbolCard cx={x} cy={y} r={r} sex={sex} illness={person.illness_type} deceased={person.is_deceased} />

      {/* Anel de cuidador principal */}
      {caregiver === 'important' && sex === 'female' && <circle cx={x} cy={y} r={r + 6} fill="none" stroke={C_AMBER} strokeWidth={2.2} />}
      {caregiver === 'important' && sex !== 'female' && <rect x={x - r - 6} y={y - r - 6} width={(r + 6) * 2} height={(r + 6) * 2} rx={5} fill="none" stroke={C_AMBER} strokeWidth={2.2} />}
      {caregiver === 'partial'   && sex === 'female' && <circle cx={x} cy={y} r={r + 6} fill="none" stroke={C_AMBER} strokeWidth={1.4} strokeOpacity={0.55} />}
      {caregiver === 'partial'   && sex !== 'female' && <rect x={x - r - 6} y={y - r - 6} width={(r + 6) * 2} height={(r + 6) * 2} rx={5} fill="none" stroke={C_AMBER} strokeWidth={1.4} strokeOpacity={0.55} />}

      {/* Idade dentro do símbolo */}
      {age !== null && (
        <text x={x} y={y + 4} textAnchor="middle" fontSize={10} fontWeight="700" fill={C_NAVY}>{age}</text>
      )}

      {/* Labels */}
      <text x={x} y={y + r + 14} textAnchor="middle" fontSize={10.5} fontWeight="700" fill={C_LABEL}>{firstName}</text>
      {person.relationship_to_patient && (
        <text x={x} y={y + r + 25} textAnchor="middle" fontSize={9} fill={C_SUB}>{person.relationship_to_patient}</text>
      )}
      {person.birth_year && (
        <text x={x} y={y + r + (person.relationship_to_patient ? 36 : 25)} textAnchor="middle" fontSize={8.5} fill={C_SUB} opacity={0.7}>
          {person.birth_year}{person.death_year ? `–${person.death_year}` : ''}
        </text>
      )}
    </g>
  )
}

// ── Nó do paciente (símbolo por gênero + teal) ────────────────────────────────
function PatientNode({ pos, name, gender, delay = 1.05 }: { pos: { x: number; y: number }; name: string; gender?: string | null; delay?: number }) {
  const { x, y } = pos
  const r = PATR
  const firstName = name.split(' ')[0]
  const sex = inferSex(gender, null)

  return (
    <g className="geno-card-node genogram-svg-patient" style={{ animationDelay: `${delay}s` }}>
      {/* Halo pulsante */}
      <g className="geno-patient-halo">
        {sex === 'female'
          ? <circle cx={x} cy={y} r={r + 10} fill={C_TEAL} fillOpacity={0.12} />
          : sex === 'other'
          ? <path d={diamondPath(x, y, r + 10)} fill={C_TEAL} fillOpacity={0.12} />
          : <rect x={x - r - 10} y={y - r - 10} width={(r + 10) * 2} height={(r + 10) * 2} rx={7} fill={C_TEAL} fillOpacity={0.12} />
        }
      </g>
      <SymbolCard cx={x} cy={y} r={r} sex={sex} isPatient />
      <text x={x} y={y + r + 14} textAnchor="middle" fontSize={11} fontWeight="800" fill={C_TEAL}>{firstName}</text>
      <text x={x} y={y + r + 26} textAnchor="middle" fontSize={9} fill={C_TEAL} opacity={0.85}>Paciente</text>
    </g>
  )
}

// ── Legenda ────────────────────────────────────────────────────────────────────
function GenogramLegend({ showBonds }: { showBonds: boolean }) {
  const sw = 1.5
  return (
    <div className="genogram-svg-legend">
      <span className="genogram-legend-item">
        <svg width={20} height={20} viewBox="-11 -11 22 22"><rect x={-8} y={-8} width={16} height={16} rx={3} fill="white" stroke="#e2e8f0" strokeWidth={sw} filter="drop-shadow(0 1px 3px rgba(0,0,0,0.1))" /></svg>Masculino
      </span>
      <span className="genogram-legend-item">
        <svg width={20} height={20} viewBox="-11 -11 22 22"><circle cx={0} cy={0} r={8} fill="white" stroke="#e2e8f0" strokeWidth={sw} filter="drop-shadow(0 1px 3px rgba(0,0,0,0.1))" /></svg>Feminino
      </span>
      <span className="genogram-legend-item">
        <svg width={20} height={20} viewBox="-11 -11 22 22"><path d="M0,-8 L8,0 L0,8 L-8,0z" fill="white" stroke="#e2e8f0" strokeWidth={sw} filter="drop-shadow(0 1px 3px rgba(0,0,0,0.1))" /></svg>Outro/N.I.
      </span>
      <span className="genogram-legend-item">
        <svg width={20} height={20} viewBox="-11 -11 22 22"><rect x={-8} y={-8} width={16} height={16} rx={3} fill={C_TEAL_F} stroke={C_TEAL} strokeWidth={2} /></svg>Paciente
      </span>
      <span className="genogram-legend-item">
        <svg width={20} height={20} viewBox="-11 -11 22 22"><circle cx={0} cy={0} r={8} fill="white" stroke="#e2e8f0" strokeWidth={sw} /><line x1={-6} y1={-6} x2={6} y2={6} stroke={C_NAVY} strokeWidth={1.8} /><line x1={6} y1={-6} x2={-6} y2={6} stroke={C_NAVY} strokeWidth={1.8} /></svg>Falecido
      </span>
      <span className="genogram-legend-item">
        <svg width={20} height={20} viewBox="-11 -11 22 22"><rect x={-8} y={-8} width={16} height={16} rx={3} fill="white" stroke="#e2e8f0" strokeWidth={sw} /><rect x={-8} y={0} width={16} height={8} rx={0} fill="#2a5a8a" fillOpacity={0.75} /></svg>Adoecimento
      </span>
      <span className="genogram-legend-item">
        <svg width={20} height={20} viewBox="-11 -11 22 22"><path d="M0,-8 L8,5 L-8,5z" fill="white" stroke={C_NAVY} strokeWidth={1.8} /></svg>Perda gest.
      </span>
      <span className="genogram-legend-item">
        <svg width={20} height={20} viewBox="-11 -11 22 22"><circle cx={0} cy={0} r={8} fill="white" stroke="#e2e8f0" strokeWidth={sw} /><circle cx={0} cy={0} r={11} fill="none" stroke={C_AMBER} strokeWidth={2} /></svg>Cuidador
      </span>
      {showBonds && (
        <>
          <span className="genogram-legend-item">
            <svg width={26} height={14} viewBox="0 0 26 14"><line x1={1} y1={5} x2={25} y2={5} stroke={C_GREEN} strokeWidth={1.5} /><line x1={1} y1={9} x2={25} y2={9} stroke={C_GREEN} strokeWidth={1.5} /></svg>Próxima
          </span>
          <span className="genogram-legend-item">
            <svg width={26} height={14} viewBox="0 0 26 14"><line x1={1} y1={7} x2={25} y2={7} stroke={C_LINE} strokeWidth={1.5} strokeDasharray="5 3" /></svg>Distante
          </span>
          <span className="genogram-legend-item">
            <svg width={26} height={14} viewBox="0 0 26 14"><path d="M1,7 L4,3 L8,11 L12,3 L16,11 L20,3 L25,7" stroke={C_OCHRE} strokeWidth={1.5} fill="none" /></svg>Conflito
          </span>
          <span className="genogram-legend-item">
            <svg width={26} height={14} viewBox="0 0 26 14">
              <line x1={1} y1={5} x2={25} y2={5} stroke={C_GREEN} strokeWidth={1.5} />
              <line x1={1} y1={9} x2={25} y2={9} stroke={C_GREEN} strokeWidth={1.5} />
              <path d="M1,7 L4,4 L8,10 L12,4 L16,10 L20,4 L25,7" stroke={C_OCHRE} strokeWidth={1.3} fill="none" />
            </svg>Próx+Conf.
          </span>
          <span className="genogram-legend-item">
            <svg width={26} height={14} viewBox="0 0 26 14">
              <line x1={1} y1={7} x2={25} y2={7} stroke={C_RED} strokeWidth={1.5} />
              <line x1={8} y1={2} x2={11} y2={12} stroke={C_RED} strokeWidth={1.5} />
              <line x1={14} y1={2} x2={17} y2={12} stroke={C_RED} strokeWidth={1.5} />
            </svg>Rompida
          </span>
          <span className="genogram-legend-item">
            <svg width={26} height={14} viewBox="0 0 26 14">
              <line x1={1} y1={7} x2={25} y2={7} stroke={C_LINE} strokeWidth={1.5} />
              <line x1={11} y1={2} x2={15} y2={12} stroke={C_RED} strokeWidth={1.8} />
            </svg>Separados
          </span>
          <span className="genogram-legend-item">
            <svg width={26} height={14} viewBox="0 0 26 14">
              <line x1={1} y1={7} x2={25} y2={7} stroke={C_LINE} strokeWidth={1.5} />
              <line x1={8} y1={2} x2={12} y2={12} stroke={C_RED} strokeWidth={1.8} />
              <line x1={14} y1={2} x2={18} y2={12} stroke={C_RED} strokeWidth={1.8} />
            </svg>Divorciados
          </span>
        </>
      )}
    </div>
  )
}

// ── Componente principal ───────────────────────────────────────────────────────
export function GenogramDiagram({
  patientName,
  patientGender,
  persons,
  relationships,
  onNodeClick,
  showBonds = false,
}: {
  patientName: string
  patientGender?: string | null
  persons: GenogramPersonRow[]
  relationships: GenogramRelationshipRow[]
  onNodeClick?: (person: GenogramPersonRow) => void
  showBonds?: boolean
}) {
  const layout = useMemo(() => buildLayout(persons), [persons])
  const { nodes, patientPos, svgWidth, svgHeight, rows } = layout

  const posById = useMemo(() => {
    const m = new Map<string, { x: number; y: number }>()
    nodes.forEach((n) => m.set(n.person.id, { x: n.x, y: n.y }))
    return m
  }, [nodes])

  return (
    <div className="genogram-svg-wrap">
      <style>{`
        @keyframes geno-pop {
          from { opacity: 0; transform: scale(0.55); }
          to   { opacity: 1; transform: scale(1); }
        }
        @keyframes geno-draw {
          from { stroke-dashoffset: 600; }
          to   { stroke-dashoffset: 0; }
        }
        @keyframes geno-halo-pulse {
          0%, 100% { opacity: 0.12; transform: scale(1); }
          50%       { opacity: 0.22; transform: scale(1.08); }
        }
        .geno-card-node {
          transform-box: fill-box;
          transform-origin: center;
          animation: geno-pop 0.4s cubic-bezier(.34,1.56,.64,1) both;
        }
        .geno-conn-line {
          animation: geno-draw 0.45s ease both;
        }
        .geno-patient-halo {
          transform-box: fill-box;
          transform-origin: center;
          animation: geno-halo-pulse 2.6s ease-in-out infinite;
        }
        .genogram-svg-node { cursor: pointer; }
      `}</style>

      <svg
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        className="genogram-svg"
        aria-label="Diagrama do genograma familiar"
      >
        <defs>
          <filter id="geno-shadow" x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor="#000" floodOpacity="0.08" />
          </filter>
          <filter id="geno-shadow-teal" x="-40%" y="-40%" width="180%" height="180%">
            <feDropShadow dx="0" dy="3" stdDeviation="7" floodColor={C_TEAL} floodOpacity="0.22" />
          </filter>
        </defs>

        {/* Conectores estruturais */}
        <StructuralConnectors rows={rows} patientPos={patientPos} />

        {/* Vínculos emocionais */}
        {showBonds && relationships.map((rel) => {
          const a = posById.get(rel.person_a_id)
          const b = posById.get(rel.person_b_id)
          if (!a || !b) return null
          return <EmotionalBond key={rel.id} x1={a.x} y1={a.y} x2={b.x} y2={b.y} type={rel.relationship_type} />
        })}

        {/* Pessoas */}
        {nodes.map((n) => (
          <PersonNode
            key={n.person.id}
            node={n}
            delay={GEN_BASE[n.gen] + n.idx * 0.08}
            onClick={onNodeClick ? () => onNodeClick(n.person) : undefined}
          />
        ))}

        {/* Paciente (sempre por cima) */}
        <PatientNode pos={patientPos} name={patientName} gender={patientGender} />
      </svg>

      <GenogramLegend showBonds={showBonds} />
    </div>
  )
}
