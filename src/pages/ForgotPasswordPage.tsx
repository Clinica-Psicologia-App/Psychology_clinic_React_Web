import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Loader2, Mail } from 'lucide-react'
import { Button } from '../components/design-system/Button'
import { useAuth } from '../context/auth'
import esquemaCoreIcon from '../assets/esquema-core-icon.png'

export function ForgotPasswordPage() {
  const { resetPassword } = useAuth()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await resetPassword(email.trim())
      setSent(true)
    } catch (err) {
      setError((err as Error).message || 'Não foi possível enviar o e-mail de recuperação.')
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
      </section>

      <div className="login-card">
        <div className="login-card-header">
          <div className="login-icon"><Mail size={24} /></div>
          <div>
            <h2>Recuperar acesso</h2>
            <p>Enviaremos um link para redefinir sua senha.</p>
          </div>
        </div>

        {sent ? (
          <div className="form-success-block">
            <p>E-mail enviado para <strong>{email}</strong>. Verifique sua caixa de entrada e clique no link de recuperação.</p>
            <p>O link expira em 24 horas. Se não encontrar o e-mail, verifique a pasta de spam.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <label>
              E-mail cadastrado
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="gestao@esquemacore.com"
                required
                autoFocus
              />
            </label>

            {error ? <div className="form-error">{error}</div> : null}

            <Button variant="primary" type="submit" fullWidth disabled={loading}>
              {loading ? <Loader2 className="spin" size={18} aria-hidden="true" /> : null}
              Enviar link de recuperação
            </Button>
          </form>
        )}

        <Link to="/login" className="forgot-password-back">
          <ArrowLeft size={14} aria-hidden="true" /> Voltar ao login
        </Link>
      </div>
    </main>
  )
}
