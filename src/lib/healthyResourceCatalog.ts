export type HealthyResourceCategory = { label: string; items: Array<{ id: string; label: string }> }

export const HEALTHY_RESOURCE_CATALOG: HealthyResourceCategory[] = [
  {
    label: 'Pessoais e cognitivos',
    items: [
      { id: 'pc_creativity', label: 'Criatividade' },
      { id: 'pc_reflective', label: 'Capacidade reflexiva' },
      { id: 'pc_autonomy', label: 'Autonomia' },
      { id: 'pc_flexibility', label: 'Flexibilidade cognitiva' },
      { id: 'pc_learning', label: 'Capacidade de aprendizagem' },
      { id: 'pc_resilience', label: 'Resiliência' },
      { id: 'pc_selfawareness', label: 'Autoconhecimento' },
      { id: 'pc_humor', label: 'Senso de humor' },
    ],
  },
  {
    label: 'Emocionais',
    items: [
      { id: 'em_selfregulation', label: 'Autorregulação emocional' },
      { id: 'em_selfcompassion', label: 'Autocompaixão' },
      { id: 'em_hope', label: 'Esperança' },
      { id: 'em_frustration', label: 'Tolerância à frustração' },
      { id: 'em_askhelp', label: 'Capacidade de pedir ajuda' },
      { id: 'em_expression', label: 'Expressão emocional' },
    ],
  },
  {
    label: 'Relacionais',
    items: [
      { id: 'rel_social', label: 'Apoio social' },
      { id: 'rel_bonds', label: 'Vínculos satisfatórios' },
      { id: 'rel_skills', label: 'Habilidades sociais' },
      { id: 'rel_family', label: 'Rede familiar de apoio' },
      { id: 'rel_capacity', label: 'Capacidade de estabelecer vínculos' },
      { id: 'rel_affective', label: 'Relacionamento afetivo seguro' },
    ],
  },
  {
    label: 'Propósito e realização',
    items: [
      { id: 'pr_purpose', label: 'Propósito de vida' },
      { id: 'pr_values', label: 'Valores pessoais' },
      { id: 'pr_professional', label: 'Competências profissionais' },
      { id: 'pr_hobbies', label: 'Interesses e hobbies' },
      { id: 'pr_persistence', label: 'Persistência' },
      { id: 'pr_spirituality', label: 'Espiritualidade' },
    ],
  },
]
