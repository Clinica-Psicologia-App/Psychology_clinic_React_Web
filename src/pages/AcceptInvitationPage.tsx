import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CheckCircle2, Loader2, LockKeyhole, UserRoundCheck } from 'lucide-react'
import { Button } from '../components/design-system/Button'
import { acceptPatientInvitation } from '../services/supabaseQueries'
import esquemaCoreIcon from '../assets/esquema-core-icon.png'

type AcceptFormState = {
  full_name: string
  phone: string
  cpf: string
  birth_date: string
  gender: string
  relationship_status: string
  education_level: string
  occupation: string
  country_birth: string
  state_birth: string
  religious_orientation: string
  ethnic_group: string
  sexual_orientation: string
  has_children: string
  password: string
  confirm_password: string
  legalAccepted: boolean
}

const initialForm: AcceptFormState = {
  full_name: '',
  phone: '',
  cpf: '',
  birth_date: '',
  gender: '',
  relationship_status: '',
  education_level: '',
  occupation: '',
  country_birth: '',
  state_birth: '',
  religious_orientation: '',
  ethnic_group: '',
  sexual_orientation: '',
  has_children: '',
  password: '',
  confirm_password: '',
  legalAccepted: false,
}

function hasChildrenValue(value: string) {
  if (value === 'true') return true
  if (value === 'false') return false
  return null
}

export function AcceptInvitationPage() {
  const [params] = useSearchParams()
  const token = useMemo(() => params.get('token')?.trim() ?? '', [params])
  const [form, setForm] = useState(initialForm)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')

    if (!token) {
      setError('Link de convite inválido ou incompleto.')
      return
    }
    if (!form.full_name.trim()) {
      setError('Informe seu nome completo para ativar o acesso.')
      return
    }
    if (form.password.length < 8) {
      setError('A senha precisa ter pelo menos 8 caracteres.')
      return
    }
    if (form.password !== form.confirm_password) {
      setError('A confirmação de senha não confere.')
      return
    }
    if (!form.legalAccepted) {
      setError('É necessário aceitar os Termos de Uso e a Política de Privacidade.')
      return
    }

    setLoading(true)
    try {
      await acceptPatientInvitation({
        token,
        password: form.password,
        full_name: form.full_name,
        phone: form.phone,
        cpf: form.cpf,
        birth_date: form.birth_date,
        gender: form.gender,
        relationship_status: form.relationship_status,
        education_level: form.education_level,
        occupation: form.occupation,
        country_birth: form.country_birth,
        state_birth: form.state_birth,
        religious_orientation: form.religious_orientation,
        ethnic_group: form.ethnic_group,
        sexual_orientation: form.sexual_orientation,
        has_children: hasChildrenValue(form.has_children),
      })
      setSuccess(true)
    } catch (err) {
      setError((err as Error).message || 'Não foi possível aceitar o convite.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="login-page accept-invitation-page">
      <div className="login-ambient" aria-hidden="true">
        <span className="ambient-line line-one" />
        <span className="ambient-line line-two" />
        <span className="ambient-node node-one" />
        <span className="ambient-node node-two" />
        <span className="ambient-node node-three" />
      </div>

      <section className="login-hero">
        <div className="brand-card floating login-brand-card">
          <img className="brand-image" src={esquemaCoreIcon} alt="" />
          <div>
            <strong><span className="brand-name-prefix">Esquema</span>Core</strong>
            <span>seu raciocínio clínico em mapa</span>
          </div>
        </div>
        <div className="login-hero-copy">
          <span className="login-eyebrow">Primeiro acesso</span>
          <h1>Complete seu convite com segurança.</h1>
          <p>Crie sua senha e confirme seus dados básicos para acessar a jornada terapêutica indicada pela clínica.</p>
        </div>
        <div className="login-positioning">
          <span>Convite verificado</span>
          <span>Dados protegidos</span>
          <span>Acesso do paciente</span>
        </div>
      </section>

      {success ? (
        <section className="login-card accept-card">
          <div className="login-card-header">
            <div className="login-icon"><CheckCircle2 size={24} /></div>
            <div>
              <h2>Acesso criado</h2>
              <p>Seu cadastro foi ativado com sucesso.</p>
            </div>
          </div>
          <div className="form-success">
            Agora você pode entrar no aplicativo EsquemaCore usando seu e-mail e a senha criada aqui.
          </div>
          <Link to="/login">
            <Button variant="secondary" fullWidth>Ir para login administrativo</Button>
          </Link>
        </section>
      ) : (
        <form className="login-card accept-card" onSubmit={submit}>
          <div className="login-card-header">
            <div className="login-icon"><UserRoundCheck size={24} /></div>
            <div>
              <h2>Ativar convite</h2>
              <p>Preencha os dados essenciais para concluir seu acesso.</p>
            </div>
          </div>

          {!token ? <div className="form-error">Link de convite inválido ou sem token.</div> : null}

          <label>
            Nome completo
            <input value={form.full_name} onChange={(event) => setForm({ ...form, full_name: event.target.value })} placeholder="Seu nome completo" required />
          </label>

          <div className="form-grid two accept-form-grid">
            <label>Telefone<input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} placeholder="(00) 00000-0000" /></label>
            <label>CPF<input value={form.cpf} onChange={(event) => setForm({ ...form, cpf: event.target.value })} /></label>
            <label>Data de nascimento<input type="date" value={form.birth_date} onChange={(event) => setForm({ ...form, birth_date: event.target.value })} /></label>
            <label>Gênero<select value={form.gender} onChange={(event) => setForm({ ...form, gender: event.target.value })}><option value="">Não informado</option><option value="female">Feminino</option><option value="male">Masculino</option><option value="non_binary">Não binário</option><option value="other">Outro</option></select></label>
            <label>Estado civil<select value={form.relationship_status} onChange={(event) => setForm({ ...form, relationship_status: event.target.value })}><option value="">Não informado</option><option value="single">Solteiro(a)</option><option value="married">Casado(a)</option><option value="divorced">Divorciado(a)</option><option value="widowed">Viúvo(a)</option><option value="stable_union">União estável</option></select></label>
            <label>Escolaridade<select value={form.education_level} onChange={(event) => setForm({ ...form, education_level: event.target.value })}><option value="">Não informado</option><option value="elementary">Ensino fundamental</option><option value="high_school">Ensino médio</option><option value="undergraduate">Ensino superior</option><option value="graduate">Pós-graduação</option></select></label>
            <label>Ocupação<input value={form.occupation} onChange={(event) => setForm({ ...form, occupation: event.target.value })} /></label>
            <label>Tem filhos?<select value={form.has_children} onChange={(event) => setForm({ ...form, has_children: event.target.value })}><option value="">Não informado</option><option value="true">Sim</option><option value="false">Não</option></select></label>
            <label>País de nascimento<input value={form.country_birth} onChange={(event) => setForm({ ...form, country_birth: event.target.value })} /></label>
            <label>Estado de nascimento<input value={form.state_birth} onChange={(event) => setForm({ ...form, state_birth: event.target.value })} /></label>
            <label>Orientação religiosa<input value={form.religious_orientation} onChange={(event) => setForm({ ...form, religious_orientation: event.target.value })} /></label>
            <label>Grupo étnico<input value={form.ethnic_group} onChange={(event) => setForm({ ...form, ethnic_group: event.target.value })} /></label>
            <label className="span-two">Orientação sexual<select value={form.sexual_orientation} onChange={(event) => setForm({ ...form, sexual_orientation: event.target.value })}><option value="">Não informado</option><option value="heterosexual">Heterossexual</option><option value="homosexual">Homossexual</option><option value="bisexual">Bissexual</option><option value="asexual">Assexual</option><option value="pansexual">Pansexual</option><option value="other">Outra</option></select></label>
          </div>

          <div className="form-grid two accept-form-grid">
            <label>Senha<input type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} minLength={8} required /></label>
            <label>Confirmar senha<input type="password" value={form.confirm_password} onChange={(event) => setForm({ ...form, confirm_password: event.target.value })} minLength={8} required /></label>
          </div>

          <label className="check-row accept-legal-check">
            <input type="checkbox" checked={form.legalAccepted} onChange={(event) => setForm({ ...form, legalAccepted: event.target.checked })} />
            Li e aceito os Termos de Uso e a Política de Privacidade.
          </label>

          {error ? <div className="form-error">{error}</div> : null}

          <Button variant="primary" type="submit" fullWidth className="login-submit-btn" disabled={loading || !token}>
            {loading ? <Loader2 className="spin" size={18} aria-hidden="true" /> : <LockKeyhole size={18} aria-hidden="true" />}
            Ativar acesso
          </Button>
        </form>
      )}
    </main>
  )
}

