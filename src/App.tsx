import React, { useState, useEffect, useRef } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie
} from 'recharts';
import Markdown from 'react-markdown';
import { 
  Search, MessageSquare, PieChart as ChartIcon, Sparkles, TrendingUp, 
  Settings, User, ChevronRight, Calculator, AlertCircle, CheckCircle2,
  BrainCircuit, ArrowRight, Download, Share2, PanelLeftClose, Menu,
  Paperclip, FileText, Lock, Unlock, Zap, X, Copy, Check, ArrowUpRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { callGemini } from './lib/gemini';
import { cn, formatCurrency } from './lib/utils';
import { TaxProfile, ChatMessage, OptimizationTip, AnalyzedDocument } from './types';

// Mock Data for Portugal IRS 2026 Context
const INITIAL_PROFILE: TaxProfile = {
  income: 0,
  retention: 0,
  expenses: {
    health: 0,
    education: 0,
    housing: 0,
    general: 0,
    restaurants: 0,
    veterinary: 0,
    car_maintenance: 0,
  },
  hasPPR: false,
  maritalStatus: 'solteiro',
  dependents: 0,
  isPaid: false,
};

const DEDUCTION_LIMITS = {
  health: 1000,
  education: 800,
  housing: 600,
  general: 250,
  others: 250, // Simplified for restaurants, vet, etc.
};

export default function App() {
  const [profile, setProfile] = useState<TaxProfile>(INITIAL_PROFILE);
  const [activeTab, setActiveTab] = useState<'assistant' | 'tips' | 'docs'>('assistant');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showDisclaimer, setShowDisclaimer] = useState(true);
  const [analyzedDocs, setAnalyzedDocs] = useState<AnalyzedDocument[]>([]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Close mobile menu when tab changes
    setIsMobileMenuOpen(false);
  }, [activeTab]);

  useEffect(() => {
    // Add initial legal disclaimer to chat
    if (messages.length === 0) {
      setMessages([{
        role: 'assistant',
        content: "Benvindo ao Guru Fiscal. \n\n\"O Guru Fiscal é uma ferramenta independente de literacia financeira. Não temos ligação à AT. A conferência e submissão final são da responsabilidade do utilizador.\""
      }]);
    }
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleDonate = () => {
    const email = "guru.fiscal.apoiocliente@gmail.com";
    const subject = "Contributo para o Guru Fiscal";
    const body = "Olá! Gostaria de apoiar o projeto Guru Fiscal com um donativo.";
    window.location.href = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const updateProfileNumeric = (field: 'income' | 'retention' | 'dependents', value: number) => {
    const safeValue = Math.max(0, value);
    setProfile(prev => ({ ...prev, [field]: safeValue }));
  };

  const handleSendMessage = async (attachment?: { name: string, type: string, data: string }) => {
    const displayInput = input.trim() || (attachment ? "Analisa este documento financeiro." : "");
    if (!displayInput && !attachment) return;
    
    const userMsg: ChatMessage = { role: 'user', content: displayInput, attachment };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    try {
      const history = messages.slice(-8).map(m => `${m.role === 'user' ? 'Utilizador' : 'Assistente'}: ${m.content}`).join('\n');
      const profileContext = `[PERFIL DO UTILIZADOR] Rendimento Bruto: ${formatCurrency(profile.income)}, Retenção na Fonte: ${formatCurrency(profile.retention)}, PPR: ${profile.hasPPR ? 'Sim' : 'Não'}.`;
      
      const parts = [];
      if (attachment) {
        parts.push({ inlineData: { data: attachment.data, mimeType: attachment.type } });
        parts.push({ text: `MEMÓRIA RECENTE:\n${history}\n\n${profileContext}\nUtilizador enviou anexo. Analisa detalhadamente e guia o utilizador: ${displayInput}` });
      } else {
        parts.push({ text: `MEMÓRIA RECENTE:\n${history}\n\n${profileContext}\nUtilizador: ${displayInput}` });
      }

      const response = await callGemini(parts);

      // Handle automatic profile updates via tool calls
      if (response.functionCalls && response.functionCalls.length > 0) {
        for (const call of response.functionCalls) {
          if (call.name === 'update_tax_profile') {
            const args = call.args as any;
            setProfile(prev => ({
              ...prev,
              ...args
            }));
            console.log("Profile updated via AI tool call:", args);
          }
        }
      }

      const assistantMsg: ChatMessage = { 
        role: 'assistant', 
        content: response.text || "Fiquei com uma dúvida na interpretação desta última parte. Podes explicar-me de outra forma ou dar-me mais algum detalhe para te conseguir ajudar melhor com o teu IRS?" 
      };
      setMessages(prev => [...prev, assistantMsg]);

      if (attachment) {
        setAnalyzedDocs(prev => [...prev, {
          name: attachment.name,
          type: attachment.type,
          status: 'completed',
          detectedIncome: ['Dados Extraídos via IA'],
          summary: response.text ? response.text.substring(0, 100) + "..." : 'Documento interpretado pelo Guru Fiscal.'
        }]);
      }
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { role: 'assistant', content: "Ocorreu um erro ao processar. Por favor, tente novamente." }]);
    } finally {
      setIsTyping(false);
    }
  };

  const onFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64Data = (event.target?.result as string).split(',')[1];
      handleSendMessage({
        name: file.name,
        type: file.type,
        data: base64Data
      });
    };
    reader.readAsDataURL(file);
  };

  const getDeductionData = () => [
    { name: 'Saúde', actual: profile.expenses.health * 0.15, limit: DEDUCTION_LIMITS.health },
    { name: 'Educação', actual: profile.expenses.education * 0.30, limit: DEDUCTION_LIMITS.education },
    { name: 'Habitação', actual: Math.min(profile.expenses.housing * 0.15, DEDUCTION_LIMITS.housing), limit: DEDUCTION_LIMITS.housing },
    { name: 'Gerais', actual: Math.min(profile.expenses.general * 0.35, DEDUCTION_LIMITS.general), limit: DEDUCTION_LIMITS.general },
    { name: 'IVA (Rest/Outros)', actual: profile.expenses.restaurants * 0.15, limit: DEDUCTION_LIMITS.others },
  ];

  const getOptimizationTips = (): OptimizationTip[] => {
    const tips: OptimizationTip[] = [
      {
        id: 'efatura-val',
        title: 'Validar faturas no e-Fatura',
        description: 'Muitas faturas ficam pendentes por falta de categoria. Verifique mensalmente as faturas de saúde, educação e restauração para não perder benefícios.',
        impact: 'Até +250€ IVA',
        category: 'deductions'
      },
      {
        id: 'beneficio-jovem',
        title: 'IRS Jovem (Isenção)',
        description: 'Se tem entre 18 e 26 anos (ou 30 com doutoramento) e terminou os estudos, pode ter direito a isenção parcial de IRS nos primeiros 5 anos de trabalho.',
        impact: 'Poupança de Milhares de Euros',
        category: 'deductions'
      },
      {
        id: 'consignacao',
        title: 'Consignação de 0,5% do IRS',
        description: 'Pode doar 0,5% do seu imposto liquidado a uma instituição sem qualquer custo para si. O Estado abdica dessa parte do imposto em seu favor.',
        impact: 'Custo Zero para o Utilizador',
        category: 'investments'
      },
      {
        id: 'erros-comuns',
        title: 'Evitar erro de Englobamento',
        description: 'Nem sempre o englobamento de rendas ou dividendos compensa. Se a sua taxa de IRS for superior a 28%, a retenção liberatória costuma ser melhor.',
        impact: 'Proteção de Rendimento',
        category: 'deductions'
      }
    ];
    if (!profile.hasPPR) {
      tips.push({
        id: 'ppr',
        title: 'Subscrever um PPR (Plano Poupança Reforma)',
        description: 'Benefício fiscal imediato à entrada: dedução de 20% do valor aplicado, até ao limite de 400€ (idade < 35), 350€ (35-50 anos) ou 300€ (idade > 50).',
        impact: 'Até +400€ Reembolso',
        category: 'investments'
      });
    }
    return tips;
  };

  return (
    <div className="flex h-screen bg-[#F5F5F5] font-sans overflow-hidden text-[#1A1A1A]">
      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMobileMenuOpen(false)}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside 
        initial={false}
        animate={{ 
          width: isSidebarOpen ? 260 : 80,
          x: isMobileMenuOpen ? 0 : (typeof window !== 'undefined' && window.innerWidth < 1024 ? -260 : 0)
        }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className={cn(
          "bg-white border-r border-[#E5E5E5] flex flex-col transition-all duration-300 z-[70]",
          "fixed inset-y-0 left-0 lg:relative"
        )}
      >
        <div className="p-6 flex items-center justify-between">
          {isSidebarOpen ? (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-[#1A1A1A] rounded-lg flex items-center justify-center">
                <BrainCircuit className="text-white w-5 h-5" />
              </div>
              <span className="font-bold text-lg tracking-tight">Guru Fiscal</span>
            </div>
          ) : (
            <div className="w-8 h-8 bg-[#1A1A1A] rounded-lg flex items-center justify-center mx-auto">
              <BrainCircuit className="text-white w-5 h-5" />
            </div>
          )}
        </div>

        <nav className="flex-1 px-3 space-y-1">
          <NavItem 
            active={activeTab === 'assistant'} 
            onClick={() => setActiveTab('assistant')} 
            icon={<MessageSquare size={20} />} 
            label="Assistente Pessoal" 
            collapsed={!isSidebarOpen}
          />
          <NavItem 
            active={activeTab === 'docs'} 
            onClick={() => setActiveTab('docs')} 
            icon={<FileText size={20} />} 
            label="Documentos" 
            collapsed={!isSidebarOpen}
          />
          <NavItem 
            active={activeTab === 'tips'} 
            onClick={() => setActiveTab('tips')} 
            icon={<Sparkles size={20} />} 
            label="Otimizações" 
            collapsed={!isSidebarOpen}
          />
        </nav>

        <div className="p-4 border-t border-[#E5E5E5] space-y-2">
          <button 
            onClick={handleDonate}
            className="w-full flex items-center gap-2 p-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl hover:from-amber-600 hover:to-orange-600 transition-all text-xs font-bold shadow-md transform hover:scale-[1.02] active:scale-[0.98]"
          >
            <Zap size={14} fill="currentColor" />
            {(isSidebarOpen || isMobileMenuOpen) ? "Apoiar o Guru ☕" : ""}
          </button>
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="w-full hidden lg:flex items-center gap-3 p-2 hover:bg-[#F5F5F5] rounded-xl transition-colors"
          >
            {isSidebarOpen ? <PanelLeftClose size={20} /> : <Menu size={20} className="mx-auto" />}
            {isSidebarOpen && <span className="text-sm font-medium">Recolher</span>}
          </button>
          {isMobileMenuOpen && (
            <button 
              onClick={() => setIsMobileMenuOpen(false)}
              className="w-full lg:hidden flex items-center gap-3 p-2 hover:bg-[#F5F5F5] rounded-xl transition-colors text-slate-500"
            >
              <X size={20} />
              <span className="text-sm font-medium">Fechar Menu</span>
            </button>
          )}
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden relative w-full">
        {/* Header */}
        <header className="h-16 bg-white border-bottom border-[#E5E5E5] flex items-center justify-between px-4 lg:px-8 shrink-0 shadow-sm z-0">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden p-2 hover:bg-slate-50 rounded-lg text-slate-500"
            >
              <Menu size={20} />
            </button>
            <div className="flex items-center gap-2 text-xs md:text-sm text-[#666]">
              <span className="hidden sm:inline">Início</span>
              <ChevronRight size={14} className="hidden sm:inline" />
              <span className="text-[#1A1A1A] font-medium capitalize">{activeTab === 'tips' ? 'Otimizações' : activeTab === 'assistant' ? 'Assistente Pessoal' : activeTab}</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
             <button className="p-2 hover:bg-[#F5F5F5] rounded-full transition-colors text-[#666]">
              <Share2 size={20} />
            </button>
            <div className="w-8 h-8 bg-[#F0F0F0] rounded-full flex items-center justify-center border border-[#E5E5E5]">
              <User size={18} />
            </div>
          </div>
        </header>

        {/* Dynamic View */}
        <div className="flex-1 overflow-y-auto px-4 py-6 md:p-8 custom-scrollbar">
          <AnimatePresence mode="wait">
            {activeTab === 'assistant' && (
              <motion.div 
                key="assistant"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="max-w-4xl mx-auto h-full flex flex-col"
              >
                <div className="flex-1 space-y-6 pb-40">
                  <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 flex items-center gap-3 shadow-sm border-l-4 border-l-amber-400">
                    <Sparkles className="text-amber-500 shrink-0" size={18} />
                    <p className="text-[11px] md:text-xs text-amber-900 leading-relaxed">
                      <span className="font-bold uppercase tracking-tight">Dica do Guru:</span> Está com dificuldades em encontrar os seus documentos? Pergunte-me como obter os extratos da <span className="font-bold">Revolut, Degiro</span> ou do seu banco nacional!
                    </p>
                  </div>

                  {messages.length === 0 && (
                    <div className="h-full flex flex-col items-center md:items-start text-center md:text-left space-y-4 pt-6 md:pt-12">
                      <div className="w-14 h-14 md:w-16 md:h-16 bg-[#1A1A1A] rounded-2xl flex items-center justify-center shadow-lg">
                        <BrainCircuit className="text-white w-7 h-7 md:w-8 md:h-8" />
                      </div>
                      <h2 className="text-xl md:text-2xl font-bold">Olá, eu sou o Assistente Pessoal.</h2>
                      <p className="text-[#666] max-w-sm text-sm">
                        Posso ajudar a preencher o IRS, tirar dúvidas sobre taxas e sugerir como poupar no seu imposto.
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-8 max-w-2xl w-full">
                        <SuggestBtn onClick={setInput} text="Como obter o extrato anual da Revolut?" />
                        <SuggestBtn onClick={setInput} text="Onde encontrar o relatório de custos da Degiro?" />
                        <SuggestBtn onClick={setInput} text="Como exportar dados da corretora?" />
                        <SuggestBtn onClick={setInput} text="Quais documentos preciso para o IRS?" />
                        <SuggestBtn onClick={setInput} text="O que é o englobamento de rendas?" />
                        <SuggestBtn onClick={setInput} text="Calcula os meus dividendos" />
                      </div>
                    </div>
                  )}

                  {messages.map((m, i) => (
                    <motion.div 
                      key={i} 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={cn(
                        "flex gap-3 md:gap-4 p-4 md:p-5 rounded-3xl transition-all shadow-sm",
                        m.role === 'user' 
                          ? "bg-white border border-[#E5E5E5] ml-auto max-w-[92%] md:max-w-[85%]" 
                          : "bg-[#F8FAFC] border border-[#F1F5F9] mr-auto max-w-[92%] md:max-w-[85%]"
                      )}
                    >
                      <div className={cn(
                        "w-8 h-8 md:w-10 md:h-10 rounded-[12px] md:rounded-2xl flex items-center justify-center shrink-0 shadow-sm",
                        m.role === 'user' ? "bg-slate-100 text-slate-600" : "bg-[#1A1A1A] text-white"
                      )}>
                        {m.role === 'user' ? <User size={16} /> : <BrainCircuit size={16} />}
                      </div>
                      <div className="flex-1 space-y-2 overflow-hidden">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[9px] md:text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            {m.role === 'user' ? 'Tu' : 'Assistente Pessoal'}
                          </span>
                          {m.role === 'assistant' && (
                            <button 
                              onClick={() => {
                                navigator.clipboard.writeText(m.content);
                              }}
                              className="text-slate-300 hover:text-slate-600 transition-colors p-1 rounded-md hover:bg-slate-100"
                            >
                              <Copy size={12} />
                            </button>
                          )}
                        </div>
                        <div className={cn(
                          "text-[13px] md:text-sm leading-6 md:leading-7 font-sans tracking-tight",
                          m.role === 'user' ? "text-slate-700" : "text-slate-800"
                        )}>
                          {m.role === 'user' ? (
                            <div className="whitespace-pre-wrap">{m.content}</div>
                          ) : (
                            <div className="prose prose-sm max-w-none prose-slate prose-headings:font-bold prose-headings:text-slate-900 prose-p:text-slate-700 prose-strong:text-slate-900 prose-ul:list-disc prose-li:marker:text-[#1A1A1A]">
                              <Markdown>{m.content}</Markdown>
                            </div>
                          )}
                        </div>
                        {m.attachment && (
                          <div className="mt-4 p-3 bg-white border border-slate-100 rounded-xl flex items-center gap-3 shadow-sm">
                            <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">
                              <FileText size={16} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold text-slate-900 truncate">{m.attachment.name}</p>
                              <p className="text-[10px] text-slate-500 uppercase font-bold tracking-tight">Anexo Carregado</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                  {isTyping && (
                    <div className="flex gap-4 p-4 md:p-5 rounded-3xl bg-[#F8FAFC] border border-[#F1F5F9] mr-auto max-w-fit shadow-sm">
                      <div className="w-8 h-8 md:w-10 md:h-10 bg-[#1A1A1A] rounded-[12px] md:rounded-2xl flex items-center justify-center animate-pulse">
                        <BrainCircuit className="text-white" size={16} />
                      </div>
                      <div className="flex flex-col justify-center">
                        <div className="flex gap-1.5 pt-1">
                          <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                          <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                          <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></span>
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                <div className="fixed bottom-0 left-0 lg:left-auto lg:right-0 w-full lg:w-[calc(100%-80px)] xl:w-[calc(100%-260px)] px-4 md:px-8 pb-4 md:pb-8 z-20 flex justify-center transition-all duration-300">
                  <div className="flex flex-col gap-3 md:gap-4 w-full max-w-4xl">
                    <p className="text-[9px] md:text-[10px] text-center text-slate-400 bg-white/60 backdrop-blur-md py-1.5 rounded-full border border-slate-100 px-4 md:px-6 self-center shadow-sm max-w-[280px] md:max-w-none">
                      "O Assistente Pessoal é uma ferramenta independente. Conferência final por sua conta."
                    </p>
                    <div className="relative flex gap-2 md:gap-3 items-center bg-white border border-slate-200 rounded-2xl md:rounded-[2rem] p-1.5 md:p-2 pl-3 md:pl-5 pr-1.5 md:pr-2 shadow-2xl shadow-slate-200/50 focus-within:border-slate-400 transition-all">
                      <input 
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                        placeholder="Escreve aqui..."
                        className="flex-1 bg-transparent border-none py-2 md:py-3 focus:outline-none text-[13px] md:text-sm text-slate-800 placeholder:text-slate-400"
                      />
                      <div className="flex items-center gap-0.5 md:gap-1">
                        <button 
                          onClick={() => fileInputRef.current?.click()}
                          className="p-2 md:p-2.5 hover:bg-slate-50 text-slate-400 hover:text-slate-600 rounded-full transition-all"
                          title="Anexar documento"
                        >
                          <Paperclip size={18} />
                        </button>
                        <button 
                          onClick={() => handleSendMessage()}
                          disabled={!input.trim() || isTyping}
                          className="p-2 md:p-3 bg-[#1A1A1A] text-white rounded-full hover:scale-105 active:scale-95 transition-all disabled:opacity-20 disabled:scale-100 shadow-lg shadow-black/10"
                        >
                          <ArrowRight size={18} />
                        </button>
                      </div>
                      <input 
                        type="file"
                        ref={fileInputRef}
                        onChange={onFileSelect}
                        className="hidden"
                        accept="image/*,.pdf"
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'tips' && (
              <motion.div 
                key="tips"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="max-w-4xl mx-auto space-y-6"
              >
                <div className="bg-white p-8 rounded-3xl border border-[#E5E5E5] shadow-sm flex flex-col md:flex-row items-center gap-8 bg-gradient-to-br from-white to-amber-50/30">
                  <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Sparkles className="text-amber-600 w-8 h-8" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">Otimize a sua Situação Fiscal</h2>
                    <p className="text-[#666] mt-2 leading-relaxed">
                      Estratégias para melhorar a sua eficiência fiscal.
                    </p>
                    <div className="mt-4 p-3 bg-[#FFF9EB] border border-amber-100 rounded-xl flex items-start gap-3">
                      <AlertCircle className="text-amber-600 shrink-0 mt-0.5" size={16} />
                      <p className="text-xs text-amber-800 font-medium leading-relaxed">
                        <span className="font-bold">Nota importante:</span> Estas sugestões visam o <span className="underline">próximo IRS (Rendimentos 2026)</span>. Para o IRS corrente (Rendimentos 2025), o prazo de otimização já terminou.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {getOptimizationTips().map((tip) => (
                    <div key={tip.id} className="bg-white p-6 rounded-2xl border border-[#E5E5E5] hover:border-[#1A1A1A] transition-all group">
                       <div className="flex items-start justify-between mb-4">
                         <span className={cn(
                           "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                           tip.category === 'investments' ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"
                         )}>
                           {tip.category === 'investments' ? 'Investimento' : 'Dedução / Erro Comum'}
                         </span>
                         <span className="text-sm font-bold text-[#1A1A1A]">{tip.impact}</span>
                       </div>
                       <h3 className="font-bold text-lg group-hover:underline">{tip.title}</h3>
                       <p className="text-[#666] text-sm mt-2">{tip.description}</p>
                       <a 
                         href={`https://www.google.com/search?q=${encodeURIComponent(tip.title + " portugal literacia financeira")}`}
                         target="_blank"
                         rel="noopener noreferrer"
                         className="mt-6 w-full py-3 bg-[#F5F5F5] rounded-xl text-xs font-bold hover:bg-[#1A1A1A] hover:text-white transition-all flex items-center justify-center gap-2"
                       >
                         Saber Mais <ChevronRight size={14} />
                       </a>
                    </div>
                  ))}
                  
                  <div className="bg-[#1A1A1A] p-6 rounded-2xl text-white relative overflow-hidden group">
                     <div className="relative z-10">
                        <AlertCircle className="text-amber-400 mb-4" size={24} />
                        <h3 className="font-bold text-lg">Validação e-Fatura</h3>
                        <p className="text-gray-400 text-sm mt-2">Mantenha as suas faturas validadas mensalmente para evitar perdas de benefícios.</p>
                        <a 
                          href="https://www.google.com/search?q=validar+faturas+e-fatura+passo+a+passo"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-6 w-full py-3 bg-white text-black rounded-xl text-xs font-bold hover:bg-amber-400 transition-all block text-center"
                        >
                          Como Validar Faturas
                        </a>
                     </div>
                   <div className="absolute -right-8 -bottom-8 opacity-10 group-hover:scale-110 transition-transform">
                     <Settings size={120} />
                   </div>
                </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'docs' && (
              <motion.div 
                key="docs"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="max-w-4xl mx-auto space-y-6"
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold">Documentos Carregados</h2>
                  <button 
                    onClick={() => setActiveTab('assistant')}
                    className="flex items-center gap-2 px-4 py-2 bg-[#1A1A1A] text-white rounded-xl font-bold text-sm"
                  >
                    <Paperclip size={16} /> Carregar Novo
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {analyzedDocs.length === 0 ? (
                    <div className="bg-white border border-dashed border-[#E5E5E5] rounded-3xl p-12 text-center">
                      <FileText size={48} className="mx-auto text-[#E5E5E5] mb-4" />
                      <p className="text-[#666]">Ainda não carregou nenhum documento financeiro.</p>
                      <button 
                        onClick={() => setActiveTab('assistant')}
                        className="mt-4 text-[#1A1A1A] font-bold hover:underline"
                      >
                        Ir para o Assistente AI →
                      </button>
                    </div>
                  ) : (
                    analyzedDocs.map((doc, i) => (
                      <div key={i} className="bg-white p-4 rounded-2xl border border-[#E5E5E5] flex items-center justify-between">
                         <div className="flex items-center gap-4">
                           <div className="w-12 h-12 bg-[#F5F5F5] rounded-xl flex items-center justify-center">
                             <FileText size={24} className="text-[#666]" />
                           </div>
                           <div>
                             <h4 className="font-bold text-sm">{doc.name}</h4>
                             <p className="text-[10px] text-[#999] uppercase font-bold">{doc.type}</p>
                           </div>
                         </div>
                         <div className="flex gap-2">
                           {doc.detectedIncome?.map((inc, j) => (
                             <span key={j} className="px-2 py-1 bg-blue-50 text-blue-700 rounded-md text-[10px] font-bold border border-blue-100 italic">
                               {inc}
                             </span>
                           ))}
                         </div>
                         <div className="flex items-center gap-2">
                           <CheckCircle2 size={16} className="text-emerald-500" />
                           <span className="text-[10px] font-bold uppercase text-emerald-600">Analizado</span>
                         </div>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {showDisclaimer && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-[100] flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm"
        >
          <motion.div 
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            className="bg-white w-full max-w-md rounded-3xl p-8 shadow-2xl relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-emerald-500 via-amber-400 to-blue-500"></div>
            <div className="w-16 h-16 bg-[#1A1A1A] rounded-2xl flex items-center justify-center mb-6">
              <BrainCircuit className="text-white w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold mb-4">Aviso Legal Obrigatório</h2>
            <p className="text-[#666] leading-relaxed italic mb-8 border-l-4 border-amber-400 pl-4 bg-amber-50/50 py-3 rounded-r-xl text-sm">
              "O Guru Fiscal é uma ferramenta independente de literacia financeira. Não temos ligação à AT. A conferência e submissão final são da responsabilidade do utilizador."
            </p>
            <button 
              onClick={() => setShowDisclaimer(false)}
              className="w-full py-4 bg-[#1A1A1A] text-white rounded-2xl font-bold hover:scale-[1.02] transition-transform flex items-center justify-center gap-2 group"
            >
              Aceito e Compreendo <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </button>
            <p className="text-[10px] text-center text-[#999] mt-6 leading-tight">
              Ao continuar, confirma que compreende que esta ferramenta é meramente informativa.
            </p>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}

function NavItem({ active, onClick, icon, label, collapsed }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string, collapsed: boolean }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 w-full p-3 rounded-xl transition-all",
        active ? "bg-[#1A1A1A] text-white shadow-lg shadow-black/5" : "text-[#666] hover:bg-[#F5F5F5] hover:text-[#1A1A1A]",
        collapsed && "justify-center p-2"
      )}
    >
      <div className={active ? "text-white" : "text-inherit"}>{icon}</div>
      {!collapsed && <span className="text-sm font-medium">{label}</span>}
    </button>
  );
}

function StatCard({ title, value, icon, subtitle, isPositive }: { title: string, value: string, icon: React.ReactNode, subtitle?: string, isPositive?: boolean }) {
  return (
    <div className="bg-white p-6 rounded-2xl border border-[#E5E5E5] shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold text-[#666] uppercase tracking-wider">{title}</span>
        {icon}
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold tracking-tight">{value}</span>
        {isPositive && (
          <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-bold">+12% vs 2024</span>
        )}
      </div>
      {subtitle && <p className="text-[10px] text-[#999] mt-1">{subtitle}</p>}
    </div>
  );
}

function NewsItem({ date, title, description }: { date: string, title: string, description: string }) {
  return (
    <div className="p-4 bg-[#F8F8F8] rounded-xl border border-[#E5E5E5] hover:bg-white transition-colors cursor-pointer group">
      <span className="text-[10px] font-bold text-[#999]">{date}</span>
      <h4 className="font-bold text-sm mt-1 group-hover:text-blue-600 transition-colors">{title}</h4>
      <p className="text-xs text-[#666] mt-1 line-clamp-2">{description}</p>
    </div>
  );
}

function SuggestBtn({ text, onClick }: { text: string, onClick: (t: string) => void }) {
  return (
    <button 
      onClick={() => onClick(text)}
      className="p-3.5 bg-white border border-slate-200 rounded-2xl text-[13px] font-semibold text-slate-700 hover:border-[#1A1A1A] hover:bg-slate-50 transition-all text-left shadow-sm active:scale-95 flex items-center justify-between group"
    >
      <span className="line-clamp-1">{text}</span>
      <ArrowRight size={14} className="text-slate-300 group-hover:text-[#1A1A1A] transition-colors" />
    </button>
  );
}

function DataPoint({ label, value, color, isCap }: { label: string, value: string, color?: string, isCap?: boolean }) {
  return (
    <div className="space-y-1">
      <p className="text-[10px] font-bold text-[#999] uppercase tracking-wider">{label}</p>
      <p className={cn("text-xl font-bold font-mono", color, isCap && "capitalize")}>{value}</p>
    </div>
  );
}
