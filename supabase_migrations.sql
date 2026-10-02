-- =============================================================================
-- MIGRAÇÕES DE REFERÊNCIA — Painel Web (React)
-- =============================================================================
-- Este arquivo NÃO é aplicado automaticamente pelo painel.
-- Ele documenta as tabelas que o app Flutter precisa criar para que os
-- componentes PatientLifeChaptersPanel e PatientTimelineBeliefsPanel
-- funcionem corretamente no painel.
--
-- Após criar as tabelas no Supabase (via Flutter migration ou dashboard),
-- o painel já está pronto para exibir os dados — sem necessidade de
-- alterar o código React.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- patient_life_chapters
-- Períodos / capítulos significativos da trajetória de vida do paciente.
-- Preenchido pelo paciente no app Flutter (ou pelo terapeuta).
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS patient_life_chapters (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id   UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,

  title            TEXT    NOT NULL,           -- ex: "Infância em São Paulo", "Adolescência"
  start_year       INTEGER,                    -- ano de início (opcional)
  end_year         INTEGER,                    -- ano de fim (nulo = presente)
  description      TEXT,                       -- narrativa livre sobre o período
  dominant_emotion TEXT,                       -- tom emocional dominante (livre ou enum)
  order_index      INTEGER NOT NULL DEFAULT 0, -- ordenação manual

  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_life_chapters_patient
  ON patient_life_chapters(patient_id, order_index);


-- -----------------------------------------------------------------------------
-- patient_timeline_beliefs
-- Crenças nucleares identificadas pelo paciente a partir dos eventos da
-- linha do tempo. Correspondem ao campo self_meaning / others_meaning /
-- world_meaning de patient_timeline_events, mas estruturadas como
-- afirmações independentes que podem estar ligadas a um evento específico
-- ou surgir de forma agregada.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS patient_timeline_beliefs (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,

  timeline_event_id  UUID REFERENCES patient_timeline_events(id) ON DELETE SET NULL,
  belief_text        TEXT    NOT NULL,      -- ex: "Sou um fracasso", "Ninguém me aceita"
  belief_domain      TEXT,                 -- 'self' | 'others' | 'world'
  schema_code        TEXT,                 -- código YSQ associado (ex: YSQ_SCHEMA_FAILURE)
  intensity          INTEGER,              -- 0–10: quanto o paciente acredita nisso hoje
  is_core_belief     BOOLEAN NOT NULL DEFAULT FALSE, -- crença nuclear marcada pelo terapeuta
  therapist_note     TEXT,                 -- observação clínica do terapeuta

  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_timeline_beliefs_patient
  ON patient_timeline_beliefs(patient_id, is_core_belief DESC);


-- -----------------------------------------------------------------------------
-- RLS sugerida para as tabelas novas (adaptar conforme política existente)
-- -----------------------------------------------------------------------------
-- ALTER TABLE patient_life_chapters    ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE patient_timeline_beliefs ENABLE ROW LEVEL SECURITY;
-- Aplicar as mesmas políticas de leitura/escrita dos demais patient_* tables.
-- -----------------------------------------------------------------------------


-- =============================================================================
-- CORREÇÃO URGENTE — RLS em questionnaire_answers
-- =============================================================================
-- O painel web apresenta "permission denied for table questionnaire_answers"
-- ao abrir pacientes que possuem questionários respondidos.
-- Isso indica que a tabela tem RLS habilitada mas não existe política SELECT
-- para o role do terapeuta autenticado.
--
-- Execute o bloco abaixo no SQL Editor do Supabase Dashboard para corrigir:
-- =============================================================================

-- 1. Confirma que RLS está ativo (normalmente já está)
ALTER TABLE questionnaire_answers ENABLE ROW LEVEL SECURITY;

-- 2. Política de leitura: terapeuta vê apenas respostas dos seus pacientes
CREATE POLICY "Therapist can read answers for own patients"
  ON questionnaire_answers
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM questionnaire_responses qr
      JOIN patients p ON p.id = qr.patient_id
      WHERE qr.id = questionnaire_answers.response_id
        AND p.responsible_psychologist_id = auth.uid()
    )
  );

-- 3. (Opcional) Se clínicas têm múltiplos psicólogos com acesso compartilhado,
--    adicione também uma política baseada em clinic_id:
-- CREATE POLICY "Clinic members can read answers"
--   ON questionnaire_answers
--   FOR SELECT
--   USING (
--     EXISTS (
--       SELECT 1
--       FROM questionnaire_responses qr
--       JOIN patients p ON p.id = qr.patient_id
--       JOIN clinic_members cm ON cm.clinic_id = p.clinic_id
--       WHERE qr.id = questionnaire_answers.response_id
--         AND cm.user_id = auth.uid()
--     )
--   );
-- =============================================================================
