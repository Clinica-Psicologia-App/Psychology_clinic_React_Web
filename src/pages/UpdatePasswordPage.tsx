import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { KeyRound, Loader2 } from 'lucide-react'
import { Button } from '../components/design-system/Button'
import { useAuth } from '../context/auth'
import esquemaCoreIcon from '../assets/esquema-core-icon.png'

export function UpdatePasswordPage() {
  const { updatePassword } = useAuth()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (password !== confirm) {
      setError('As senhas não coincidem.')
      return
    }
    if (password.length < 8) {
      setError('A senha deve ter pelo menos 8 caracteres.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      await updatePassword(password)
      navigate('/', { replace: true })
    } catch (err) {
      setError((err as Error).message || 'Não foi possível atualizar a senha.')
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
          <h1>A clínica no controle da aplicação dos psicólogos.</h1>
          <p>Gerencie profissionais licenciados, pacientes, questionários e governança clínica em uma central web conectada ao aplicativo EsquemaCore.</p>
        </div>
      </section>

      <form className="login-card" onSubmit={handleSubmit}>
        <div className="login-card-header">
          <div className="login-icon"><KeyRound size={24} /></div>
          <div>
            <h2>Nova senha</h2>
            <p>Defina uma senha forte para proteger sua conta.</p>
          </div>
        </div>

        <label>
          Nova senha
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Mínimo 8 caracteres"
            required
            autoFocus
            minLength={8}
          />
        </label>
        <label>
          Confirmar senha
          <input
            type="password"
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
            placeholder="Repita a senha"
            required
            minLength={8}
          />
        </label>

        {error ? <div className="form-error">{error}</div> : null}

        <Button variant="primary" type="submit" fullWidth disabled={loading}>
          {loading ? <Loader2 className="spin" size={18} aria-hidden="true" /> : null}
          Salvar nova senha
        </Button>
      </form>
    </main>
  )
}
