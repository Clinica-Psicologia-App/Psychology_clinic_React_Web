import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Camera, Check, Edit2, KeyRound, Loader2, Palette, User2 } from 'lucide-react'
import { PageHeader } from '../components/Ui'
import { Button } from '../components/design-system/Button'
import { Badge } from '../components/design-system/Badge'
import { InlineNotice } from '../components/design-system/InlineNotice'
import { useAuth } from '../context/auth'
import { saveMyAvatar, updateMyProfile } from '../services/supabaseQueries'

const ROLE_LABELS: Record<string, string> = {
  platform_admin: 'Administrador da plataforma',
  admin: 'Administrador da clínica',
  psychologist: 'Psicólogo(a)',
  patient: 'Paciente',
}

const ROLE_TONES: Record<string, 'success' | 'info' | 'warning' | 'neutral'> = {
  platform_admin: 'warning',
  admin: 'info',
  psychologist: 'success',
  patient: 'neutral',
}

const AVATAR_COLORS = [
  { bg: '#2563eb', fg: '#ffffff', name: 'Azul' },
  { bg: '#7c3aed', fg: '#ffffff', name: 'Violeta' },
  { bg: '#059669', fg: '#ffffff', name: 'Verde' },
  { bg: '#dc2626', fg: '#ffffff', name: 'Vermelho' },
  { bg: '#d97706', fg: '#ffffff', name: 'Âmbar' },
  { bg: '#0891b2', fg: '#ffffff', name: 'Ciano' },
  { bg: '#db2777', fg: '#ffffff', name: 'Rosa' },
  { bg: '#374151', fg: '#ffffff', name: 'Cinza escuro' },
]

function getInitials(name: string) {
  return name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase()
}

function AvatarPreview({ name, config }: { name: string; config: { bg: string; fg: string } }) {
  return (
    <div className="profile-avatar-preview" style={{ background: config.bg, color: config.fg }}>
      {getInitials(name)}
    </div>
  )
}

export function UserProfilePage() {
  const { profile, refreshProfile } = useAuth()
  const [notice, setNotice] = useState<{ tone: 'success' | 'error'; text: string } | null>(null)

  // Name edit
  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput] = useState(profile?.full_name ?? '')

  // Avatar editor
  const [avatarOpen, setAvatarOpen] = useState(false)
  const [avatarType, setAvatarType] = useState<'initials' | 'photo'>(
    (profile?.avatar_type as 'initials' | 'photo') ?? 'initials',
  )
  const [selectedColor, setSelectedColor] = useState(() => {
    const saved = profile?.avatar_config?.bg as string | undefined
    return AVATAR_COLORS.find((c) => c.bg === saved) ?? AVATAR_COLORS[0]
  })
  const [photoUrl, setPhotoUrl] = useState(profile?.avatar_url ?? '')

  const profileMutation = useMutation({
    mutationFn: (name: string) => updateMyProfile({ full_name: name }),
    onSuccess: async () => {
      setEditingName(false)
      setNotice({ tone: 'success', text: 'Nome atualizado com sucesso.' })
      await refreshProfile()
    },
    onError: (err) => setNotice({ tone: 'error', text: (err as Error).message }),
  })

  const avatarMutation = useMutation({
    mutationFn: () => saveMyAvatar({
      avatar_type: avatarType,
      avatar_url: avatarType === 'photo' ? photoUrl || null : null,
      avatar_config: avatarType === 'initials' ? { bg: selectedColor.bg, fg: selectedColor.fg } : null,
    }),
    onSuccess: async () => {
      setAvatarOpen(false)
      setNotice({ tone: 'success', text: 'Avatar atualizado com sucesso.' })
      await refreshProfile()
    },
    onError: (err) => setNotice({ tone: 'error', text: (err as Error).message }),
  })

  if (!profile) return null

  const avatarConfig = {
    bg: (profile.avatar_config?.bg as string) ?? AVATAR_COLORS[0].bg,
    fg: (profile.avatar_config?.fg as string) ?? AVATAR_COLORS[0].fg,
  }

  const displayAvatar = profile.avatar_type === 'photo' && profile.avatar_url
    ? { type: 'photo' as const, url: profile.avatar_url }
    : { type: 'initials' as const, config: avatarConfig }

  return (
    <div className="page-stack">
      <PageHeader eyebrow="Configurações" title="Meu perfil" description="Gerencie seus dados, avatar e preferências de conta." />

      {notice ? (
        <InlineNotice tone={notice.tone} message={notice.text} onDismiss={() => setNotice(null)} autoDismissMs={notice.tone === 'success' ? 5000 : undefined} />
      ) : null}

      <div className="profile-page-layout">
        {/* ── Avatar card ── */}
        <section className="panel profile-avatar-card">
          <div className="profile-avatar-wrap">
            {displayAvatar.type === 'photo' ? (
              <img src={displayAvatar.url} alt={profile.full_name} className="profile-avatar-img" />
            ) : (
              <div className="profile-avatar-preview large" style={{ background: displayAvatar.config.bg, color: displayAvatar.config.fg }}>
                {getInitials(profile.full_name)}
              </div>
            )}
            <button type="button" className="profile-avatar-edit-btn" onClick={() => setAvatarOpen(true)} title="Editar avatar">
              <Palette size={15} aria-hidden="true" />
            </button>
          </div>
          <h2>{profile.full_name}</h2>
          <Badge tone={ROLE_TONES[profile.role] ?? 'neutral'}>{ROLE_LABELS[profile.role] ?? profile.role}</Badge>
        </section>

        {/* ── Info card ── */}
        <section className="panel profile-info-card">
          <div className="panel-header">
            <div><h3>Informações pessoais</h3><p>Seus dados de acesso e identificação.</p></div>
            <User2 size={20} aria-hidden="true" />
          </div>

          <div className="profile-field-list">
            <div className="profile-field">
              <span>Nome</span>
              {editingName ? (
                <form className="profile-name-edit" onSubmit={(e) => { e.preventDefault(); profileMutation.mutate(nameInput) }}>
                  <input autoFocus value={nameInput} onChange={(e) => setNameInput(e.target.value)} required />
                  <Button type="submit" variant="primary" size="sm" disabled={profileMutation.isPending}>
                    {profileMutation.isPending ? <Loader2 size={14} className="spin" aria-hidden="true" /> : <Check size={14} aria-hidden="true" />}
                  </Button>
                  <Button type="button" variant="ghost" size="sm" onClick={() => { setEditingName(false); setNameInput(profile.full_name) }}>Cancelar</Button>
                </form>
              ) : (
                <div className="profile-field-value">
                  <strong>{profile.full_name}</strong>
                  <button type="button" className="profile-edit-icon" onClick={() => { setEditingName(true); setNameInput(profile.full_name) }} title="Editar nome">
                    <Edit2 size={14} aria-hidden="true" />
                  </button>
                </div>
              )}
            </div>

            <div className="profile-field">
              <span>E-mail</span>
              <div className="profile-field-value">
                <strong>{profile.email}</strong>
              </div>
            </div>

            <div className="profile-field">
              <span>Função</span>
              <div className="profile-field-value">
                <Badge tone={ROLE_TONES[profile.role] ?? 'neutral'}>{ROLE_LABELS[profile.role] ?? profile.role}</Badge>
              </div>
            </div>

            {profile.clinic_id ? (
              <div className="profile-field">
                <span>Clínica</span>
                <div className="profile-field-value">
                  <strong>{profile.clinic?.name ?? 'Clínica vinculada'}</strong>
                </div>
              </div>
            ) : null}
          </div>
        </section>

        {/* ── Security card ── */}
        <section className="panel profile-security-card">
          <div className="panel-header">
            <div><h3>Segurança</h3><p>Gerencie sua senha e acesso.</p></div>
            <KeyRound size={20} aria-hidden="true" />
          </div>
          <p className="profile-security-hint">
            Para alterar sua senha, clique no link "Esqueceu sua senha?" na tela de login. Um e-mail de redefinição será enviado para <strong>{profile.email}</strong>.
          </p>
        </section>
      </div>

      {/* ── Avatar editor modal ── */}
      {avatarOpen ? (
        <div className="modal-backdrop" role="presentation" onClick={() => setAvatarOpen(false)}>
          <div className="modal-card avatar-editor" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <header>
              <h2>Editar avatar</h2>
              <p>Escolha um estilo e personalize sua identidade visual.</p>
            </header>

            <div className="avatar-type-tabs">
              <button
                type="button"
                className={`avatar-type-tab${avatarType === 'initials' ? ' active' : ''}`}
                onClick={() => setAvatarType('initials')}
              >
                <Palette size={15} aria-hidden="true" /> Iniciais
              </button>
              <button
                type="button"
                className={`avatar-type-tab${avatarType === 'photo' ? ' active' : ''}`}
                onClick={() => setAvatarType('photo')}
              >
                <Camera size={15} aria-hidden="true" /> URL de foto
              </button>
            </div>

            {avatarType === 'initials' ? (
              <div className="avatar-editor-body">
                <div className="avatar-editor-preview">
                  <AvatarPreview name={profile.full_name} config={selectedColor} />
                  <span>{getInitials(profile.full_name)}</span>
                </div>
                <p className="avatar-editor-label">Cor de fundo</p>
                <div className="avatar-color-grid">
                  {AVATAR_COLORS.map((color) => (
                    <button
                      key={color.bg}
                      type="button"
                      className={`avatar-color-swatch${selectedColor.bg === color.bg ? ' selected' : ''}`}
                      style={{ background: color.bg }}
                      title={color.name}
                      onClick={() => setSelectedColor(color)}
                      aria-label={color.name}
                    >
                      {selectedColor.bg === color.bg ? <Check size={14} color={color.fg} aria-hidden="true" /> : null}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="avatar-editor-body">
                {photoUrl ? (
                  <div className="avatar-editor-preview">
                    <img src={photoUrl} alt="Preview" className="profile-avatar-img medium" onError={() => setPhotoUrl('')} />
                  </div>
                ) : null}
                <label>
                  URL da foto
                  <input
                    type="url"
                    autoFocus
                    value={photoUrl}
                    onChange={(e) => setPhotoUrl(e.target.value)}
                    placeholder="https://..."
                  />
                </label>
              </div>
            )}

            <footer>
              <Button variant="ghost" type="button" onClick={() => setAvatarOpen(false)}>Cancelar</Button>
              <Button variant="primary" type="button" disabled={avatarMutation.isPending} onClick={() => avatarMutation.mutate()}>
                {avatarMutation.isPending ? <><Loader2 size={15} className="spin" aria-hidden="true" /> Salvando...</> : 'Salvar avatar'}
              </Button>
            </footer>
          </div>
        </div>
      ) : null}
    </div>
  )
}
