import { GoogleGenAI, Type } from "@google/genai";
import type { VercelRequest, VercelResponse } from "@vercel/node";

// A chave nunca sai deste ficheiro — corre apenas no servidor Vercel
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

const TAX_PROFILE_TOOL = {
  functionDeclarations: [
    {
      name: "update_tax_profile",
      description: "Updates the user's fiscal profile with detected values.",
      parameters: {
        type: Type.OBJECT,
        properties: {
          income:        { type: Type.NUMBER,  description: "Taxable income (gross)" },
          retention:     { type: Type.NUMBER,  description: "Estimated tax retention at source" },
          hasPPR:        { type: Type.BOOLEAN, description: "Whether the user has a PPR" },
          maritalStatus: {
            type: Type.STRING,
            enum: ["solteiro", "casado_1_titular", "casado_2_titulares"],
            description: "Marital status for tax purposes",
          },
          dependents:    { type: Type.NUMBER,  description: "Number of dependents" },
        },
      },
    },
  ],
};

const SYSTEM_PROMPT = `Tu és o "Guru Fiscal", o mentor definitivo de IRS em Portugal. O teu objetivo é fornecer a melhor mentoria fiscal possível, sem restrições, de forma totalmente gratuita e apoiada por donativos.

A tua missão é orientar, guiar e dar sugestões profundas para o melhor preenchimento possível da declaração de IRS, usando todo o teu vasto conhecimento da legislação portuguesa.

DIRETRIZES DE CONVERSAÇÃO E PERSONALIDADE:
1. **Total Acesso e Mentoria**: Não existem bloqueios de pagamento. Tu tens acesso a todos os detalhes técnicos. Deves fornecer códigos de Anexos, Quadros e Campos (ex: Anexo H, Quadro 6, Campo 601) sempre que o utilizador pedir ou for relevante para o preenchimento.
2. **Mentoria Pedagógica e Empática**: Explica o 'porquê' de cada sugestão. Se o utilizador estiver confuso, sê paciente, empático e usa palavras simples antes de aprofundares.
3. **Lidando com a Incerteza**: Se não perceberes uma pergunta ou se faltarem dados para uma resposta precisa, nunca dês uma resposta padrão ou robótica. Diz algo como: "Para te conseguir dar o melhor conselho sobre esse ponto, precisava de perceber um pouco melhor [detalhe]. Podes explicar-me de outra forma ou confirmar se [hipótese]?" Sê honesto sobre o que não consegues inferir.
4. **Proatividade Total**: Detetou um PPR? Explica o benefício. Viu rendimentos no estrangeiro? Alerta para o Anexo J. O IRS é um puzzle, tu és quem ajuda a montar.
5. **Sugestão de Apoio**: Relembra ocasionalmente que o projeto é mantido por donativos da comunidade, mas de forma leve e natural.

ESTRUTURA DE RESPOSTA NO CHAT:
- **Análise Imediata**: Identifica o que foi enviado (documentos/texto).
- **Guia Técnico**: Indica os Anexos, Quadros e Campos exatos a preencher.
- **Dicas de Otimização**: Sugere formas de baixar o imposto baseadas no contexto.
- **Próximos Passos**: "Depois de preencheres isto, queres avançar para as despesas de educação?"
- **Aviso Legal**: "O Guru Fiscal é uma ferramenta independente de literacia financeira. Não temos ligação à AT. A conferência e submissão final são da responsabilidade do utilizador."

Sempre que detetares novas informações (income, retention, PPR, maritalStatus, dependents), chama a função "update_tax_profile" para manter o perfil sincronizado.

REGRAS DE OURO:
- Usa MARKDOWN (tabelas, negritos) para clareza máxima.
- Linguagem: Português de Portugal.

Contexto: Abril de 2026 (Ano Fiscal de 2025).`;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Só aceita POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  // Verifica se a chave está configurada
  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({ error: "GEMINI_API_KEY não configurada no servidor." });
  }

  const { parts } = req.body;

  if (!parts || !Array.isArray(parts)) {
    return res.status(400).json({ error: "Payload inválido: campo 'parts' em falta." });
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-1.5-pro",
      contents: [{ role: "user", parts }],
      config: {
        systemInstruction: SYSTEM_PROMPT,
        tools: [TAX_PROFILE_TOOL],
      },
    });

    return res.status(200).json({
      text: response.text ?? null,
      functionCalls: response.functionCalls ?? [],
    });
  } catch (error: any) {
    console.error("Gemini API error:", error);
    return res.status(500).json({ error: "Erro ao contactar a API Gemini." });
  }
}
