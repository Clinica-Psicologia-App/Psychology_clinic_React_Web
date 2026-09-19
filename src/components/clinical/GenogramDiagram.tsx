/**
 * Genograma gráfico (spec §36–38).
 * Simbologia padrão: quadrado = masculino, círculo = feminino, losango = outro/não informado.
 * Paciente (pessoa focal) = losango com anel externo duplo, fundo verde-água.
 * Falecimento = "X" sobre o símbolo.
 * Layout em 4 gerações: avós, pais/tios, pares (paciente ao centro), filhos.
 * Conectores estruturais inferidos do papel relacional; vínculos emocionais opcionais.
 */
import { useMemo } from 'react'
import type { GenogramPersonRow, GenogramRelationshipRow } from '../../types'

// ── Constantes de layout (espelham os valores Flutter) ───────────────────────
const ROW_GAP = 130
const COL_GAP = 90
const SYMR = 22       // raio do símbolo regular
const PATR = 24       // raio do paciente
const PAD_X = 48
const PAD_Y = 44
const BAR_OFFSET = 26 // distância da barra de irmãos acima do topo do símbolo

// ── Cores ─────────────────────────────────────────────────────────────────────
const C_NAVY = '#0F172A'
const C_TEAL = '#14B8A6'
const C_LINE = '#6B7A90'
const C_PATIENT_FILL = '#EAF3F2'

// ── Tipos de sexo / geração ───────────────────────────────────────────────────
type Sex = 'male' | 'female' | 'other'
type Gen = 0 | 1 | 2 | 3   // 0=avós, 1=pais, 2=pares+paciente, 3=filhos

function inferSex(gender?: string | null, rel?: string | null): Sex {
  const g = (gender ?? '').toLowerCase()
  if (/masc|^m$|^male$/.test(g)) return 'male'
  if (/fem|^f$|^female$/.test(g)) return 'female'
  const r = (rel ?? '').toLowerCase()
  if (/\b(pai|avô|irmão|primo|tio|padrasto|filho|marido|enteado|neto|bisavô)\b/.test(r)) return 'male'
  if (/\b(mãe|avó|irmã|prima|tia|madrasta|filha|esposa|enteada|neta|bisavó)\b/.test(r)) return 'female'
  return 'other'
}

function inferGen(rel: string): Gen {
  const r = rel.toLowerCase()
  if (/avô|avó|bisavô|bisavó/.test(r)) return 0
  if (/\b(pai|mãe|padrasto|madrasta|tio|tia)\b/.test(r)) return 1
  if (/\b(filho|filha|enteado|enteada|neto|neta)\b/.test(r)) return 3
  return 2
}

function isSibling(p: GenogramPersonRow) {
  const r = (p.relationship_to_patient ?? '').toLowerCase()
  return /\b(irmão|irmã)\b/.test(r)
}

function isPartner(p: GenogramPersonRow) {
  const r = (p.relationship_to_patient ?? '').toLowerCase()
  return /\b(cônjuge|parceiro|parceira|esposo|esposa|marido|namorado|namorada|companheiro|companheira)\b/.test(r)
}

// ── Dados de nó posicionado ───────────────────────────────────────────────────
type NodeInfo = {
  person: GenogramPersonRow
  sex: Sex
  gen: Gen
  x: number
  y: number
}

type RowMeta = {
  gen: Gen
  allNodes: NodeInfo[]
  nodesBefore: NodeInfo[]   // somente na gen=2
  nodesAfter: NodeInfo[]    // somente na gen=2
  hasPatient: boolean
  y: number
}

type Layout = {
  nodes: NodeInfo[]
  patientPos: { x: number; y: number }
  svgWidth: number
  svgHeight: number
  rows: RowMeta[]
}

// ── Construção do layout ──────────────────────────────────────────────────────
function buildLayout(persons: GenogramPersonRow[]): Layout {
  const byGen: Record<Gen, GenogramPersonRow[]> = { 0: [], 1: [], 2: [], 3: [] }
  for (const p of persons) {
    byGen[inferGen(p.relationship_to_patient ?? '')]!.push(p)
  }

  const activeGens: Gen[] = ([0, 1, 2, 3] as Gen[]).filter(
    (g) => byGen[g].length > 0 || g === 2,
  )

  const maxCount = Math.max(
    ...activeGens.map((g) => byGen[g].length + (g === 2 ? 1 : 0)),
    3,
  )
  const svgWidth = PAD_X * 2 + maxCount * COL_GAP
  const svgHeight = PAD_Y * 2 + PATR + (activeGens.length - 1) * ROW_GAP + 60

  const rows: RowMeta[] = []
  const allNodes: NodeInfo[] = []
  let patientPos = { x: svgWidth / 2, y: PAD_Y + PATR }

  activeGens.forEach((gen, rowIdx) => {
    const rowPersons = byGen[gen]
    const hasPatient = gen === 2
    const count = rowPersons.length + (hasPatient ? 1 : 0)
    const rowWidth = count * COL_GAP
    const startX = (svgWidth - rowWidth) / 2 + COL_GAP / 2
    const y = PAD_Y + PATR + rowIdx * ROW_GAP

    if (hasPatient) {
      const mid = Math.floor(rowPersons.length / 2)
      const before = rowPersons.slice(0, mid)
      const after = rowPersons.slice(mid)
      const nodesBefore: NodeInfo[] = before.map((p, i) => ({
        person: p,
        sex: inferSex(p.gender, p.relationship_to_patient),
        gen,
        x: startX + i * COL_GAP,
        y,
      }))
      const patientX = startX + mid * COL_GAP
      patientPos = { x: patientX, y }
      const nodesAfter: NodeInfo[] = after.map((p, i) => ({
        person: p,
        sex: inferSex(p.gender, p.relationship_to_patient),
        gen,
        x: patientX + (i + 1) * COL_GAP,
        y,
      }))
      const rowAll = [...nodesBefore, ...nodesAfter]
      allNodes.push(...rowAll)
      rows.push({ gen, allNodes: rowAll, nodesBefore, nodesAfter, hasPatient: true, y })
    } else {
      const rowNodes: NodeInfo[] = rowPersons.map((p, i) => ({
        person: p,
        sex: inferSex(p.gender, p.relationship_to_patient),
        gen,
        x: startX + i * COL_GAP,
        y,
      }))
      allNodes.push(...rowNodes)
      rows.push({ gen, allNodes: rowNodes, nodesBefore: [], nodesAfter: [], hasPatient: false, y })
    }
  })

  return { nodes: allNodes, patientPos, svgWidth, svgHeight: Math.max(svgHeight, 300), rows }
}

// ── Caminhos SVG ──────────────────────────────────────────────────────────────
function squarePath(cx: number, cy: number, r: number) {
  return `M${cx - r},${cy - r} h${r * 2} v${r * 2} h${-r * 2}z`
}

function diamondPath(cx: number, cy: number, r: number) {
  return `M${cx},${cy - r} L${cx + r},${cy} L${cx},${cy + r} L${cx - r},${cy}z`
}

function zigzagPath(x1: number, y1: number, x2: number, y2: number): string {
  const dx = x2 - x1, dy = y2 - y1
  const len = Math.hypot(dx, dy)
  if (len < 1) return ''
  const ux = dx / len, uy = dy / len
  const nx = -uy, ny = ux
  const step = 10, amp = 5
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

// ── Símbolo de uma pessoa ─────────────────────────────────────────────────────
function PersonSymbol({
  cx, cy, r, sex, fill, stroke, strokeWidth,
}: { cx: number; cy: number; r: number; sex: Sex; fill: string; stroke: string; strokeWidth: number }) {
  if (sex === 'male')
    return <path d={squarePath(cx, cy, r)} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
  if (sex === 'female')
    return <circle cx={cx} cy={cy} r={r} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
  return <path d={diamondPath(cx, cy, r)} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
}

// ── Conectores estruturais ─────────────────────────────────────────────────────
function StructuralConnectors({ rows, patientPos }: { rows: RowMeta[]; patientPos: { x: number; y: number } }) {
  const lp = { stroke: C_LINE, strokeWidth: 1.6, fill: 'none' as const }
  const elems: React.ReactNode[] = []

  const gpRow  = rows.find((r) => r.gen === 0)
  const parRow = rows.find((r) => r.gen === 1)
  const peerRow = rows.find((r) => r.gen === 2)
  const childRow = rows.find((r) => r.gen === 3)

  // Avós: linha de união + descida até a geração dos pais
  if (gpRow && gpRow.allNodes.length >= 2) {
    const gf = gpRow.allNodes.find((n) => n.sex === 'male')
    const gm = gpRow.allNodes.find((n) => n.sex === 'female')
    if (gf && gm) {
      const [lx, rx] = [Math.min(gf.x, gm.x), Math.max(gf.x, gm.x)]
      const y = gpRow.y
      elems.push(<line key="gp-union" x1={lx + SYMR} y1={y} x2={rx - SYMR} y2={y} {...lp} />)
      const midX = (gf.x + gm.x) / 2
      const targetY = parRow ? parRow.y - SYMR - BAR_OFFSET : y + ROW_GAP - SYMR
      elems.push(<line key="gp-desc" x1={midX} y1={y} x2={midX} y2={targetY} {...lp} />)
    }
  }

  // Pais: linha de união + descida para barra de irmãos
  let unionMid: { x: number; y: number } | null = null
  if (parRow && parRow.allNodes.length > 0) {
    const father = parRow.allNodes.find((n) => n.sex === 'male')
    const mother = parRow.allNodes.find((n) => n.sex === 'female')
    if (father && mother) {
      const [lx, rx] = [Math.min(father.x, mother.x), Math.max(father.x, mother.x)]
      const y = parRow.y
      elems.push(<line key="par-union" x1={lx + SYMR} y1={y} x2={rx - SYMR} y2={y} {...lp} />)
      unionMid = { x: (father.x + mother.x) / 2, y }
    } else {
      const only = father ?? mother
      if (only) unionMid = { x: only.x, y: only.y }
    }
  }

  // Barra de irmãos (paciente + irmãos)
  if (peerRow) {
    // Sempre inclui o paciente na barra
    const barMembers = [
      ...peerRow.nodesBefore.filter((n) => isSibling(n.person)).map((n) => ({ x: n.x, r: SYMR })),
      { x: patientPos.x, r: PATR },
      ...peerRow.nodesAfter.filter((n) => isSibling(n.person)).map((n) => ({ x: n.x, r: SYMR })),
    ]

    if (barMembers.length > 0) {
      const barY = patientPos.y - PATR - BAR_OFFSET
      const leftX = Math.min(...barMembers.map((m) => m.x))
      const rightX = Math.max(...barMembers.map((m) => m.x))

      if (barMembers.length > 1) {
        elems.push(<line key="sib-bar" x1={leftX} y1={barY} x2={rightX} y2={barY} {...lp} />)
      }
      for (const m of barMembers) {
        elems.push(<line key={`sib-drop-${m.x}`} x1={m.x} y1={barY} x2={m.x} y2={m.x === patientPos.x ? patientPos.y - m.r : peerRow.y - m.r} {...lp} />)
      }

      if (unionMid) {
        const barCenterX = (leftX + rightX) / 2
        elems.push(<line key="par-to-bar" x1={unionMid.x} y1={unionMid.y} x2={unionMid.x} y2={barY} {...lp} />)
        if (Math.abs(unionMid.x - barCenterX) > 3) {
          elems.push(<line key="bar-horiz" x1={unionMid.x} y1={barY} x2={barCenterX} y2={barY} {...lp} />)
        }
      }
    } else if (unionMid) {
      // Sem irmãos: descida direta do unionMid ao topo do símbolo do paciente
      elems.push(
        <line key="par-to-patient" x1={unionMid.x} y1={unionMid.y} x2={patientPos.x} y2={patientPos.y - PATR} {...lp} />,
      )
    }
  }

  // Cônjuge/parceiro do paciente
  if (peerRow) {
    const partner = [...peerRow.nodesBefore, ...peerRow.nodesAfter].find((n) => isPartner(n.person))
    if (partner) {
      const lx = Math.min(patientPos.x, partner.x)
      const rx = Math.max(patientPos.x, partner.x)
      const isPatientLeft = patientPos.x < partner.x
      elems.push(
        <line
          key="couple-line"
          x1={lx + (isPatientLeft ? PATR : SYMR)}
          y1={patientPos.y}
          x2={rx - (isPatientLeft ? SYMR : PATR)}
          y2={partner.y}
          {...lp}
        />,
      )
    }
  }

  // Filhos: barra + descidas a partir do paciente (ou casal)
  if (childRow && childRow.allNodes.length > 0) {
    let coupleMidX = patientPos.x
    if (peerRow) {
      const partner = [...peerRow.nodesBefore, ...peerRow.nodesAfter].find((n) => isPartner(n.person))
      if (partner) coupleMidX = (patientPos.x + partner.x) / 2
    }

    const barY = childRow.allNodes[0].y - SYMR - BAR_OFFSET
    const leftX = Math.min(...childRow.allNodes.map((n) => n.x))
    const rightX = Math.max(...childRow.allNodes.map((n) => n.x))
    const barCenterX = (leftX + rightX) / 2

    if (childRow.allNodes.length > 1) {
      elems.push(<line key="child-bar" x1={leftX} y1={barY} x2={rightX} y2={barY} {...lp} />)
    }
    for (const c of childRow.allNodes) {
      elems.push(<line key={`child-drop-${c.x}`} x1={c.x} y1={barY} x2={c.x} y2={c.y - SYMR} {...lp} />)
    }
    elems.push(<line key="couple-to-childbar" x1={coupleMidX} y1={patientPos.y + PATR} x2={coupleMidX} y2={barY} {...lp} />)
    if (Math.abs(coupleMidX - barCenterX) > 3) {
      elems.push(<line key="child-bar-center" x1={coupleMidX} y1={barY} x2={barCenterX} y2={barY} {...lp} />)
    }
  }

  return <>{elems}</>
}

// ── Vínculo emocional ─────────────────────────────────────────────────────────
function EmotionalBond({
  x1, y1, x2, y2, type,
}: { x1: number; y1: number; x2: number; y2: number; type: string }) {
  const dx = x2 - x1, dy = y2 - y1
  const len = Math.hypot(dx, dy)
  if (len < 1) return null

  // Encolhe as pontas para não invadir os símbolos
  const sx = SYMR + 6
  const ux = dx / len, uy = dy / len
  const ax = x1 + ux * sx, ay = y1 + uy * sx
  const bx = x2 - ux * sx, by = y2 - uy * sx

  const t = type.toLowerCase()

  if (t.includes('prox') || t === 'close') {
    // Duas linhas paralelas verdes
    const nx = -uy * 2.5, ny = ux * 2.5
    return <>
      <line x1={ax + nx} y1={ay + ny} x2={bx + nx} y2={by + ny} stroke="#2E7D6B" strokeWidth={1.6} />
      <line x1={ax - nx} y1={ay - ny} x2={bx - nx} y2={by - ny} stroke="#2E7D6B" strokeWidth={1.6} />
    </>
  }
  if (t.includes('dist') || t === 'distant') {
    return <line x1={ax} y1={ay} x2={bx} y2={by} stroke={C_LINE} strokeWidth={1.6} strokeDasharray="6 4" />
  }
  if (t.includes('conf') || t === 'conflict') {
    return <path d={zigzagPath(ax, ay, bx, by)} stroke="#B5651D" strokeWidth={1.6} fill="none" />
  }
  if (t.includes('romp') || t.includes('broken') || t.includes('ruptur')) {
    const mx = (ax + bx) / 2, my = (ay + by) / 2
    const perpX = -uy * 6, perpY = ux * 6
    return <>
      <line x1={ax} y1={ay} x2={bx} y2={by} stroke="#B03A3A" strokeWidth={1.6} />
      <line x1={mx - ux * 4 + perpX} y1={my - uy * 4 + perpY} x2={mx - ux * 4 - perpX} y2={my - uy * 4 - perpY} stroke="#B03A3A" strokeWidth={1.6} />
      <line x1={mx + ux * 4 + perpX} y1={my + uy * 4 + perpY} x2={mx + ux * 4 - perpX} y2={my + uy * 4 - perpY} stroke="#B03A3A" strokeWidth={1.6} />
    </>
  }
  // Plain
  return <line x1={ax} y1={ay} x2={bx} y2={by} stroke={C_LINE} strokeWidth={1.6} />
}

// ── Nó de pessoa ──────────────────────────────────────────────────────────────
function PersonNode({
  node, onClick,
}: { node: NodeInfo; onClick?: () => void }) {
  const { person, sex, x, y } = node
  const r = SYMR
  const name = person.nickname || person.full_name
  const firstName = name.split(' ')[0]
  const isCaregiver =
    person.caregiver_role === 'important' || person.caregiver_role === 'partial'

  return (
    <g
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : undefined }}
      className="genogram-svg-node"
    >
      {/* Destaque cuidador */}
      {isCaregiver && (
        <circle cx={x} cy={y} r={r + 8} fill={C_TEAL} fillOpacity={0.18} />
      )}

      {/* Símbolo (forma por gênero) */}
      <PersonSymbol
        cx={x} cy={y} r={r} sex={sex}
        fill="white"
        stroke={C_NAVY}
        strokeWidth={1.8}
      />

      {/* Falecido: X sobre o símbolo */}
      {person.is_deceased && (
        <>
          <line x1={x - r * 0.75} y1={y - r * 0.75} x2={x + r * 0.75} y2={y + r * 0.75} stroke={C_NAVY} strokeWidth={1.8} />
          <line x1={x + r * 0.75} y1={y - r * 0.75} x2={x - r * 0.75} y2={y + r * 0.75} stroke={C_NAVY} strokeWidth={1.8} />
        </>
      )}

      {/* Labels */}
      <text x={x} y={y + r + 13} textAnchor="middle" fontSize={11} fontWeight="700" fill={C_NAVY}>
        {firstName}
      </text>
      {person.relationship_to_patient && (
        <text x={x} y={y + r + 24} textAnchor="middle" fontSize={9.5} fill={C_LINE}>
          {person.relationship_to_patient}
        </text>
      )}
      {person.birth_year && (
        <text x={x} y={y + r + (person.relationship_to_patient ? 35 : 24)} textAnchor="middle" fontSize={9} fill={C_LINE} opacity={0.75}>
          {person.birth_year}{person.death_year ? `–${person.death_year}` : ''}
        </text>
      )}
    </g>
  )
}

// ── Nó do paciente ─────────────────────────────────────────────────────────────
function PatientNode({
  pos, name,
}: { pos: { x: number; y: number }; name: string }) {
  const { x, y } = pos
  const r = PATR
  const firstName = name.split(' ')[0]

  return (
    <g className="genogram-svg-patient">
      {/* Losango externo (anel duplo — pessoa focal) */}
      <path d={diamondPath(x, y, r + 5)} fill="none" stroke={C_NAVY} strokeWidth={1.6} />
      {/* Losando interno com fundo verde-água */}
      <path d={diamondPath(x, y, r)} fill={C_PATIENT_FILL} stroke={C_NAVY} strokeWidth={2.6} />

      {/* Label "Paciente" */}
      <text x={x} y={y + r + 13} textAnchor="middle" fontSize={11} fontWeight="700" fill={C_TEAL}>
        {firstName}
      </text>
      <text x={x} y={y + r + 25} textAnchor="middle" fontSize={9.5} fill={C_TEAL} opacity={0.85}>
        Paciente
      </text>
    </g>
  )
}

// ── Legenda ────────────────────────────────────────────────────────────────────
function GenogramLegend({ showBonds }: { showBonds: boolean }) {
  return (
    <div className="genogram-svg-legend">
      <span className="genogram-legend-item">
        <svg width={18} height={18} viewBox="-9 -9 18 18"><rect x={-7} y={-7} width={14} height={14} fill="white" stroke={C_NAVY} strokeWidth={1.5} /></svg>
        Masculino
      </span>
      <span className="genogram-legend-item">
        <svg width={18} height={18} viewBox="-9 -9 18 18"><circle cx={0} cy={0} r={7} fill="white" stroke={C_NAVY} strokeWidth={1.5} /></svg>
        Feminino
      </span>
      <span className="genogram-legend-item">
        <svg width={18} height={18} viewBox="-9 -9 18 18"><path d="M0,-7 L7,0 L0,7 L-7,0z" fill="white" stroke={C_NAVY} strokeWidth={1.5} /></svg>
        Outro/N.I.
      </span>
      <span className="genogram-legend-item">
        <svg width={18} height={18} viewBox="-9 -9 18 18">
          <path d="M0,-8 L8,0 L0,8 L-8,0z" fill="none" stroke={C_NAVY} strokeWidth={1.4} />
          <path d="M0,-6 L6,0 L0,6 L-6,0z" fill={C_PATIENT_FILL} stroke={C_NAVY} strokeWidth={2} />
        </svg>
        Paciente
      </span>
      <span className="genogram-legend-item">
        <svg width={18} height={18} viewBox="-9 -9 18 18">
          <circle cx={0} cy={0} r={7} fill="white" stroke={C_NAVY} strokeWidth={1.5} />
          <line x1={-5} y1={-5} x2={5} y2={5} stroke={C_NAVY} strokeWidth={1.5} />
          <line x1={5} y1={-5} x2={-5} y2={5} stroke={C_NAVY} strokeWidth={1.5} />
        </svg>
        Falecido
      </span>
      {showBonds && <>
        <span className="genogram-legend-item">
          <svg width={24} height={14} viewBox="0 0 24 14">
            <line x1={0} y1={5} x2={24} y2={5} stroke="#2E7D6B" strokeWidth={1.5} />
            <line x1={0} y1={9} x2={24} y2={9} stroke="#2E7D6B" strokeWidth={1.5} />
          </svg>
          Próxima
        </span>
        <span className="genogram-legend-item">
          <svg width={24} height={14} viewBox="0 0 24 14"><line x1={0} y1={7} x2={24} y2={7} stroke={C_LINE} strokeWidth={1.5} strokeDasharray="5 3" /></svg>
          Distante
        </span>
        <span className="genogram-legend-item">
          <svg width={24} height={14} viewBox="0 0 24 14"><path d="M0,7 L4,2 L8,12 L12,2 L16,12 L20,2 L24,7" stroke="#B5651D" strokeWidth={1.5} fill="none" /></svg>
          Conflito
        </span>
        <span className="genogram-legend-item">
          <svg width={24} height={14} viewBox="0 0 24 14">
            <line x1={0} y1={7} x2={24} y2={7} stroke="#B03A3A" strokeWidth={1.5} />
            <line x1={8} y1={2} x2={11} y2={12} stroke="#B03A3A" strokeWidth={1.5} />
            <line x1={13} y1={2} x2={16} y2={12} stroke="#B03A3A" strokeWidth={1.5} />
          </svg>
          Rompida
        </span>
      </>}
    </div>
  )
}

// ── Componente principal ───────────────────────────────────────────────────────
export function GenogramDiagram({
  patientName,
  persons,
  relationships,
  onNodeClick,
  showBonds = false,
}: {
  patientName: string
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
    m.set('patient', patientPos)
    return m
  }, [nodes, patientPos])

  return (
    <div className="genogram-svg-wrap">
      <svg
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        className="genogram-svg"
        aria-label="Diagrama do genograma familiar"
      >
        {/* Camada 1: conectores estruturais */}
        <StructuralConnectors rows={rows} patientPos={patientPos} />

        {/* Camada 2: vínculos emocionais (quando showBonds=true) */}
        {showBonds &&
          relationships.map((rel) => {
            const a = posById.get(rel.person_a_id)
            const b = posById.get(rel.person_b_id)
            if (!a || !b) return null
            return (
              <EmotionalBond
                key={rel.id}
                x1={a.x} y1={a.y}
                x2={b.x} y2={b.y}
                type={rel.relationship_type}
              />
            )
          })}

        {/* Camada 3: nós das pessoas */}
        {nodes.map((n) => (
          <PersonNode
            key={n.person.id}
            node={n}
            onClick={onNodeClick ? () => onNodeClick(n.person) : undefined}
          />
        ))}

        {/* Paciente (sempre por cima) */}
        <PatientNode pos={patientPos} name={patientName} />
      </svg>

      <GenogramLegend showBonds={showBonds} />
    </div>
  )
}
