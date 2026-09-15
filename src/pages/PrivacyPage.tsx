import { Link } from 'react-router-dom'
import { ArrowLeft, ShieldCheck } from 'lucide-react'
import { Button } from '../components/design-system/Button'

export function PrivacyPage() {
  return (
    <main className="legal-page">
      <div className="legal-header">
        <Link to="/login"><Button variant="ghost" size="sm"><ArrowLeft size={14} aria-hidden="true" /> Voltar</Button></Link>
        <div className="legal-title-row">
          <ShieldCheck size={22} aria-hidden="true" />
          <h1>Política de Privacidade</h1>
        </div>
        <p className="legal-updated">Última atualização: setembro de 2026</p>
      </div>

      <article className="legal-body">
        <section>
          <h2>1. Responsável pelo tratamento</h2>
          <p>A EsquemaCore Tecnologia Ltda., CNPJ em registro, é a controladora dos dados pessoais tratados no âmbito desta plataforma, nos termos da Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018). Clínicas parceiras atuam como cocontroladoras em relação aos dados de seus próprios pacientes e profissionais.</p>
        </section>

        <section>
          <h2>2. Dados que coletamos</h2>
          <p>Coletamos e tratamos as seguintes categorias de dados:</p>
          <ul>
            <li><strong>Dados de identificação:</strong> nome completo, CPF, data de nascimento, e-mail, telefone;</li>
            <li><strong>Dados sociodemográficos:</strong> gênero, estado civil, escolaridade, ocupação, orientação religiosa, grupo étnico (coletados para fins clínicos);</li>
            <li><strong>Dados clínicos sensíveis:</strong> respostas a instrumentos psicométricos, registros de check-in, objetivos terapêuticos, genograma familiar, conceituação de caso e demais informações inseridas durante o processo terapêutico;</li>
            <li><strong>Dados de uso:</strong> logs de acesso, endereço IP, ações realizadas na plataforma (para fins de auditoria e segurança).</li>
          </ul>
          <p>Os dados clínicos sensíveis são tratados com base no art. 11, II, "b" da LGPD (exercício regular de direitos em processo terapêutico) e com fundamento no consentimento específico do titular.</p>
        </section>

        <section>
          <h2>3. Finalidade do tratamento</h2>
          <ul>
            <li>Prestação dos serviços clínicos e terapêuticos contratados;</li>
            <li>Comunicação entre psicólogo e paciente dentro da plataforma;</li>
            <li>Geração de relatórios clínicos e de gestão para a clínica;</li>
            <li>Cumprimento de obrigações legais e regulatórias;</li>
            <li>Melhoria contínua da plataforma, com base em dados anonimizados ou pseudonimizados.</li>
          </ul>
        </section>

        <section>
          <h2>4. Compartilhamento de dados</h2>
          <p>Os dados são compartilhados apenas com:</p>
          <ul>
            <li>A clínica contratante e seus psicólogos vinculados, no limite do necessário para a prestação dos serviços;</li>
            <li>Fornecedores de infraestrutura tecnológica (como Supabase, para armazenamento seguro em nuvem), sob acordos de processamento de dados com garantias equivalentes às da LGPD;</li>
            <li>Autoridades públicas, quando exigido por lei.</li>
          </ul>
          <p>Não vendemos, alugamos nem cedemos dados pessoais a terceiros para fins comerciais.</p>
        </section>

        <section>
          <h2>5. Retenção de dados</h2>
          <p>Os dados clínicos são retidos pelo período necessário à prestação dos serviços e por até 5 anos após o encerramento do contrato ou do vínculo terapêutico, salvo obrigação legal que exija prazo superior. Após esse período, os dados são anonimizados ou excluídos de forma segura.</p>
        </section>

        <section>
          <h2>6. Segurança</h2>
          <p>Adotamos medidas técnicas e administrativas para proteger seus dados, incluindo: criptografia em trânsito (TLS 1.2+) e em repouso, controle de acesso baseado em função (RBAC), autenticação segura via Supabase Auth, e registro de auditoria de todas as operações sensíveis.</p>
        </section>

        <section>
          <h2>7. Direitos do titular</h2>
          <p>Você tem direito a: confirmar a existência de tratamento; acessar seus dados; corrigir dados incompletos ou desatualizados; solicitar anonimização ou exclusão de dados desnecessários; revogar o consentimento; e obter informações sobre o compartilhamento de dados. Para exercer esses direitos, envie solicitação para <a href="mailto:privacidade@esquemacore.com.br">privacidade@esquemacore.com.br</a>.</p>
        </section>

        <section>
          <h2>8. Cookies</h2>
          <p>A plataforma utiliza cookies de sessão estritamente necessários para o funcionamento da autenticação. Não utilizamos cookies de rastreamento ou publicidade.</p>
        </section>

        <section>
          <h2>9. Contato com o Encarregado (DPO)</h2>
          <p>Para questões relacionadas à privacidade e proteção de dados, entre em contato com nosso Encarregado de Dados pelo e-mail <a href="mailto:privacidade@esquemacore.com.br">privacidade@esquemacore.com.br</a>.</p>
        </section>
      </article>
    </main>
  )
}
