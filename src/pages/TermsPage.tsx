import { Link } from 'react-router-dom'
import { ArrowLeft, ScrollText } from 'lucide-react'
import { Button } from '../components/design-system/Button'

export function TermsPage() {
  return (
    <main className="legal-page">
      <div className="legal-header">
        <Link to="/login"><Button variant="ghost" size="sm"><ArrowLeft size={14} aria-hidden="true" /> Voltar</Button></Link>
        <div className="legal-title-row">
          <ScrollText size={22} aria-hidden="true" />
          <h1>Termos de Uso</h1>
        </div>
        <p className="legal-updated">Última atualização: setembro de 2026</p>
      </div>

      <article className="legal-body">
        <section>
          <h2>1. Aceitação dos termos</h2>
          <p>Ao acessar e utilizar a plataforma EsquemaCore, você concorda com estes Termos de Uso. Caso não concorde com qualquer disposição, não utilize a plataforma.</p>
        </section>

        <section>
          <h2>2. Descrição do serviço</h2>
          <p>O EsquemaCore é uma plataforma clínica digital destinada a clínicas de psicologia, psicólogos e seus pacientes. A plataforma oferece ferramentas de gestão clínica, acompanhamento terapêutico, aplicação de instrumentos psicométricos e comunicação entre profissional e paciente, em conformidade com as diretrizes do Conselho Federal de Psicologia (CFP).</p>
        </section>

        <section>
          <h2>3. Elegibilidade</h2>
          <p>O acesso ao painel administrativo é restrito a:</p>
          <ul>
            <li>Clínicas de psicologia com contrato ativo na plataforma;</li>
            <li>Psicólogos devidamente registrados no Conselho Regional de Psicologia (CRP) e vinculados a uma clínica cadastrada;</li>
            <li>Pacientes cadastrados e vinculados a um psicólogo ativo.</li>
          </ul>
        </section>

        <section>
          <h2>4. Uso adequado</h2>
          <p>O usuário compromete-se a:</p>
          <ul>
            <li>Utilizar a plataforma exclusivamente para fins clínicos e terapêuticos legítimos;</li>
            <li>Manter a confidencialidade de suas credenciais de acesso;</li>
            <li>Não compartilhar dados de pacientes fora do contexto clínico autorizado;</li>
            <li>Cumprir as obrigações previstas no Código de Ética Profissional do Psicólogo e na legislação vigente.</li>
          </ul>
        </section>

        <section>
          <h2>5. Dados e confidencialidade clínica</h2>
          <p>Todos os dados clínicos inseridos na plataforma são de responsabilidade da clínica e do profissional de psicologia responsável. O EsquemaCore atua como operador de dados nos termos da Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018) e adota medidas técnicas e organizacionais para proteger as informações dos pacientes.</p>
          <p>O acesso a dados de pacientes é restrito por controles de acesso baseados em função (RBAC), e registros de auditoria são mantidos para todas as operações relevantes.</p>
        </section>

        <section>
          <h2>6. Limitação de responsabilidade</h2>
          <p>O EsquemaCore é uma ferramenta de suporte clínico e não substitui o julgamento profissional do psicólogo. A plataforma não é responsável por decisões clínicas tomadas com base nas informações registradas, nem por interpretações equivocadas dos instrumentos psicométricos disponíveis.</p>
        </section>

        <section>
          <h2>7. Modificações</h2>
          <p>Estes termos podem ser atualizados periodicamente. Alterações substanciais serão comunicadas com antecedência mínima de 15 dias por e-mail ou notificação na plataforma. O uso continuado após as alterações implica aceitação dos novos termos.</p>
        </section>

        <section>
          <h2>8. Contato</h2>
          <p>Em caso de dúvidas sobre estes termos, entre em contato pelo e-mail <a href="mailto:juridico@esquemacore.com.br">juridico@esquemacore.com.br</a>.</p>
        </section>
      </article>
    </main>
  )
}
