import { useMemo } from 'react'
import type { GenogramPersonRow, GenogramRelationshipRow } from '../../types'

const PATIENT_NODE = { x: 400, y: 300, r: 28 }
const NODE_R = 22
const SVG_W = 800
const SVG_H = 560

const GROUP_POSITIONS: Record<string, { dx: number; dy: number }> = {
  'Mãe': { dx: -220, dy: -180 },
  'Pai': { dx: 80, dy: -180 },
  'Avó materna': { dx: -370, dy: -340 },
  'Avô materno': { dx: -200, dy: -340 },
  'Avó paterna': { dx: 50, dy: -340 },
  'Avô paterno': { dx: 200, dy: -340 },
  'Irmão': { dx: -140, dy: 60 },
  'Irmã': { dx: 60, dy: 60 },
  'Filho': { dx: -160, dy: 180 },
  'Filha': { dx: 40, dy: 180 },
  'Cônjuge': { dx: 220, dy: 0 },
  'Parceiro(a)': { dx: 220, dy: 0 },
  'Parceiro': { dx: 220, dy: 0 },
}

const REL_STYLES: Record<string, { strokeDasharray?: string; stroke: string }> = {
  parental: { stroke: 'var(--text-muted)' },
  conjugal: { stroke: 'var(--color-brand-blue)', strokeDasharray: '4 3' },
  sibling: { stroke: 'var(--text-muted)', strokeDasharray: '2 2' },
  conflict: { stroke: 'var(--red)' },
  close: { stroke: 'var(--green)' },
  distant: { stroke: 'var(--text-muted)', strokeDasharray: '6 4' },
}

function genderSymbol(gender?: string | null) {
  const g = (gender ?? '').toLowerCase()
  if (g.includes('fem') || g === 'f') return '♀'
  if (g.includes('masc') || g === 'm') return '♂'
  return '⬡'
}

function initials(name: string) {
  return name.split(' ').slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('')
}

type NodePos = { x: number; y: number; person: GenogramPersonRow }

function placeNodes(persons: GenogramPersonRow[]): NodePos[] {
  const placed: NodePos[] = []
  const occupied = new Set<string>()

  function key(x: number, y: number) { return `${Math.round(x / 10) * 10},${Math.round(y / 10) * 10}` }

  function findFreePos(base: { x: number; y: number }, attempt = 0): { x: number; y: number } {
    const angle = (attempt * 60) % 360
    const r = attempt === 0 ? 0 : Math.ceil(attempt / 6) * 90
    const x = base.x + r * Math.cos((angle * Math.PI) / 180)
    const y = base.y + r * Math.sin((angle * Math.PI) / 180)
    const k = key(x, y)
    if (!occupied.has(k)) { occupied.add(k); return { x, y } }
    return findFreePos(base, attempt + 1)
  }

  for (const person of persons) {
    const rel = (person.relationship_to_patient ?? '').trim()
    const hint = Object.entries(GROUP_POSITIONS).find(([k]) =>
      rel.toLowerCase().includes(k.toLowerCase()),
    )?.[1]
    const base = hint
      ? { x: PATIENT_NODE.x + hint.dx, y: PATIENT_NODE.y + hint.dy }
      : { x: PATIENT_NODE.x + 200, y: PATIENT_NODE.y }
    const pos = findFreePos(base)
    placed.push({ x: pos.x, y: pos.y, person })
  }

  return placed
}

export function GenogramDiagram({
  patientName,
  persons,
  relationships,
  onNodeClick,
}: {
  patientName: string
  persons: GenogramPersonRow[]
  relationships: GenogramRelationshipRow[]
  onNodeClick?: (person: GenogramPersonRow) => void
}) {
  const nodes = useMemo(() => placeNodes(persons), [persons])
  const posById = useMemo(() => new Map(nodes.map((n) => [n.person.id, n])), [nodes])

  const vx = Math.min(...nodes.map((n) => n.x), PATIENT_NODE.x) - 60
  const vy = Math.min(...nodes.map((n) => n.y), PATIENT_NODE.y) - 60
  const vw = Math.max(...nodes.map((n) => n.x), PATIENT_NODE.x) + 60 - vx
  const vh = Math.max(...nodes.map((n) => n.y), PATIENT_NODE.y) + 60 - vy
  const viewBox = `${vx} ${vy} ${Math.max(vw, SVG_W)} ${Math.max(vh, SVG_H)}`

  return (
    <div className="genogram-svg-wrap">
      <svg viewBox={viewBox} className="genogram-svg" aria-label="Diagrama do genograma">
        <defs>
          <marker id="arrow" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
            <path d="M0,0 L0,6 L6,3 z" fill="var(--text-muted)" />
          </marker>
        </defs>

        {/* Relationship lines */}
        {relationships.map((rel) => {
          const a = posById.get(rel.person_a_id) ?? (rel.person_a_id === 'patient' ? PATIENT_NODE : null)
          const b = posById.get(rel.person_b_id) ?? (rel.person_b_id === 'patient' ? PATIENT_NODE : null)
          if (!a || !b) return null
          const style = REL_STYLES[rel.relationship_type] ?? REL_STYLES.parental
          return (
            <line
              key={rel.id}
              x1={a.x} y1={a.y}
              x2={b.x} y2={b.y}
              stroke={style.stroke}
              strokeWidth={1.5}
              strokeDasharray={style.strokeDasharray}
              opacity={0.6}
            />
          )
        })}

        {/* Lines from patient to everyone with a relationship */}
        {nodes.map((node) => (
          <line
            key={`patient-${node.person.id}`}
            x1={PATIENT_NODE.x} y1={PATIENT_NODE.y}
            x2={node.x} y2={node.y}
            stroke="var(--border-default)"
            strokeWidth={1}
            opacity={0.4}
            strokeDasharray="3 3"
          />
        ))}

        {/* Person nodes */}
        {nodes.map(({ x, y, person }) => (
          <g key={person.id} className="genogram-svg-node" onClick={() => onNodeClick?.(person)} style={{ cursor: onNodeClick ? 'pointer' : undefined }}>
            <circle
              cx={x} cy={y} r={NODE_R}
              fill={person.is_deceased ? 'var(--bg-subtle)' : 'var(--surface-secondary)'}
              stroke={person.is_sensitive ? 'var(--yellow)' : 'var(--border-default)'}
              strokeWidth={person.is_sensitive ? 2 : 1.5}
            />
            {person.is_deceased ? (
              <>
                <line x1={x - NODE_R * 0.6} y1={y - NODE_R * 0.6} x2={x + NODE_R * 0.6} y2={y + NODE_R * 0.6} stroke="var(--text-muted)" strokeWidth={1.5} />
                <line x1={x + NODE_R * 0.6} y1={y - NODE_R * 0.6} x2={x - NODE_R * 0.6} y2={y + NODE_R * 0.6} stroke="var(--text-muted)" strokeWidth={1.5} />
              </>
            ) : null}
            <text x={x} y={y + 1} textAnchor="middle" dominantBaseline="middle" fontSize={11} fontWeight="600" fill="var(--text-primary)">
              {initials(person.nickname || person.full_name)}
            </text>
            <text x={x} y={y + NODE_R + 12} textAnchor="middle" fontSize={9} fill="var(--text-secondary)">
              {person.nickname || person.full_name.split(' ')[0]}
            </text>
            <text x={x} y={y + NODE_R + 22} textAnchor="middle" fontSize={8} fill="var(--text-muted)">
              {genderSymbol(person.gender)}{person.birth_year ? ` ${person.birth_year}` : ''}
            </text>
          </g>
        ))}

        {/* Patient node (center) */}
        <g className="genogram-svg-patient">
          <circle cx={PATIENT_NODE.x} cy={PATIENT_NODE.y} r={PATIENT_NODE.r} fill="var(--color-brand-blue)" opacity={0.15} />
          <circle cx={PATIENT_NODE.x} cy={PATIENT_NODE.y} r={PATIENT_NODE.r} fill="none" stroke="var(--color-brand-blue)" strokeWidth={2} />
          <text x={PATIENT_NODE.x} y={PATIENT_NODE.y + 1} textAnchor="middle" dominantBaseline="middle" fontSize={12} fontWeight="700" fill="var(--color-brand-blue)">
            {initials(patientName)}
          </text>
          <text x={PATIENT_NODE.x} y={PATIENT_NODE.y + PATIENT_NODE.r + 14} textAnchor="middle" fontSize={10} fontWeight="600" fill="var(--color-brand-blue)">
            {patientName.split(' ')[0]}
          </text>
          <text x={PATIENT_NODE.x} y={PATIENT_NODE.y + PATIENT_NODE.r + 25} textAnchor="middle" fontSize={8} fill="var(--color-brand-blue)" opacity={0.7}>
            Paciente
          </text>
        </g>
      </svg>

      <div className="genogram-svg-legend">
        <span className="genogram-legend-item"><span className="genogram-legend-line" style={{ background: 'var(--text-muted)' }} /> Parental</span>
        <span className="genogram-legend-item"><span className="genogram-legend-line" style={{ background: 'var(--color-brand-blue)', opacity: 0.6 }} /> Conjugal</span>
        <span className="genogram-legend-item"><span className="genogram-legend-line" style={{ background: 'var(--green)' }} /> Próximo</span>
        <span className="genogram-legend-item"><span className="genogram-legend-line" style={{ background: 'var(--red)' }} /> Conflito</span>
        <span className="genogram-legend-item"><span className="genogram-legend-circle" style={{ background: 'var(--bg-subtle)', border: '1.5px solid var(--border-default)' }} /> Falecido</span>
      </div>
    </div>
  )
}
