import { useState } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { Loader2, LockKeyhole } from 'lucide-react'
import { Button } from '../components/design-system/Button'
import { useAuth } from '../context/auth'
import { supabaseConfigError } from '../lib/supabase'
import esquemaCoreIcon from '../assets/esquema-core-icon.png'

export function LoginPage() {
  const { session, signIn } = useAuth()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  if (session) return <Navigate to={(location.state as { from?: Location })?.from?.pathname ?? '/'} replace />

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (supabaseConfigError) return
    setLoading(true)
    setError(null)
    try {
      await signIn(email.trim(), password)
    } catch (err) {
      setError((err as Error).message || 'Não foi possível entrar.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="login-page">
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
          <span className="login-eyebrow">Painel administrativo</span>
          <h1>Onde as informações se conectam e a clínica ganha sentido.</h1>
          <p>Gerencie profissionais licenciados, pacientes, questionários e governança clínica em uma central web conectada ao aplicativo EsquemaCore.</p>
        </div>
        <div className="login-positioning">
          <span>Operação da clínica</span>
          <span>Distribuição para psicólogos</span>
          <span>Governança clínica</span>
        </div>
        <div className="clinical-map" aria-hidden="true">
          <div className="map-core">
            <img src={esquemaCoreIcon} alt="" />
          </div>
          <span className="map-node map-node-a" />
          <span className="map-node map-node-b" />
          <span className="map-node map-node-c" />
          <span className="map-path map-path-a" />
          <span className="map-path map-path-b" />
          <span className="map-path map-path-c" />
        </div>
      </section>

      <form className="login-card" onSubmit={handleSubmit}>
        <div className="login-card-header">
          <div className="login-icon"><LockKeyhole size={24} /></div>
          <div>
            <h2>Área administrativa</h2>
            <p>Acesso exclusivo para a equipe gestora da clínica.</p>
          </div>
        </div>

        <label>
          E-mail
          <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="gestao@esquemacore.com" required />
        </label>
        <label>
          Senha
          <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Sua senha" required />
        </label>

        {supabaseConfigError ? <div className="form-error">{supabaseConfigError}</div> : null}
        {error ? <div className="form-error">{error}</div> : null}

        <Button variant="primary" type="submit" fullWidth className="login-submit-btn" disabled={loading || Boolean(supabaseConfigError)}>
          {loading ? <Loader2 className="spin" size={18} aria-hidden="true" /> : null}
          Acessar painel
        </Button>

        <Link to="/forgot-password" className="forgot-password-link">Esqueci minha senha</Link>
      </form>

      <nav className="login-legal-links">
        <Link to="/termos">Termos de uso</Link>
        <span aria-hidden="true">·</span>
        <Link to="/privacidade">Política de privacidade</Link>
      </nav>
    </main>
  )
}
