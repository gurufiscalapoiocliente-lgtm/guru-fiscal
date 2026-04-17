import streamlit as st
import google.generativeai as genai
import pandas as pd

# --- CONFIGURAÇÃO DA PÁGINA ---
st.set_page_config(page_title="Guru Fiscal Portugal", page_icon="⚖️", layout="wide")

# --- ESTILOS CSS ---
st.markdown("""
    <style>
    .main { background-color: #f8f9fa; }
    .stMetric { background-color: white; padding: 15px; border-radius: 10px; border: 1px solid #e5e5e5; }
    .chat-bubble { padding: 10px; border-radius: 15px; margin-bottom: 10px; }
    </style>
    """, unsafe_allow_html=True)

# --- LÓGICA DE CÁLCULO (Simulação baseada no teu App.tsx) ---
def calcular_irs_estimado(rendimento, retencao, tem_ppr):
    # Tabelas simplificadas de 2024/25 para o IRS 2026
    # Exemplo: Se ganhar > 20k, taxa aproximada de 28.5%, etc.
    if rendimento <= 7703: taxa = 0.13
    elif rendimento <= 11623: taxa = 0.18
    elif rendimento <= 16472: taxa = 0.23
    elif rendimento <= 21321: taxa = 0.26
    else: taxa = 0.32
    
    imposto_base = rendimento * taxa
    deducao_ppr = 400 if tem_ppr else 0 # Benefício máximo médio
    
    imposto_final = max(0, imposto_base - deducao_ppr)
    resultado = retencao - imposto_final
    
    return imposto_final, resultado

# --- INICIALIZAÇÃO DO GEMINI (Usando o teu SYSTEM_PROMPT do gemini.ts) ---
def init_gemini():
    genai.configure(api_key=st.secrets["GOOGLE_API_KEY"])
    
    # Instrução de Sistema completa vinda do teu ficheiro
    instruction = """
    Tu és o "Guru Fiscal", o mentor definitivo de IRS em Portugal. 
    Usa MARKDOWN, tabelas e sê proativo. Se detetares novos dados, 
    pede para atualizar o perfil. Foca-te nos Anexos e Quadros da AT.
    """
    
    model = genai.GenerativeModel(
        model_name='gemini-1.5-flash',
        system_instruction=instruction
    )
    return model

# --- ESTADO DA SESSÃO ---
if "messages" not in st.session_state:
    st.session_state.messages = []
if "perfil" not in st.session_state:
    st.session_state.perfil = {"rendimento": 0.0, "retencao": 0.0, "ppr": False}

# --- UI: COLUNAS PRINCIPAIS ---
col_chat, col_dash = st.columns([2, 1])

with col_dash:
    st.header("📊 Dashboard Fiscal")
    
    # Inputs Manuais (Sincronizados com o Perfil)
    renda = st.number_input("Rendimento Anual Bruto (€)", value=st.session_state.perfil["rendimento"], step=1000.0)
    ret = st.number_input("Retenção na Fonte Total (€)", value=st.session_state.perfil["retencao"], step=100.0)
    ppr = st.toggle("Tenho PPR / Plano Pensão", value=st.session_state.perfil["ppr"])
    
    # Atualizar estado
    st.session_state.perfil.update({"rendimento": renda, "retencao": ret, "ppr": ppr})
    
    # Cálculos
    imposto, reembolso = calcular_irs_estimado(renda, ret, ppr)
    
    # Métricas Visuais
    c1, c2 = st.columns(2)
    c1.metric("Imposto Estimado", f"{imposto:,.2f}€")
    label_reembolso = "A Receber" if reembolso >= 0 else "A Pagar"
    c2.metric(label_reembolso, f"{abs(reembolso):,.2f}€", delta=reembolso, delta_color="normal")
    
    # Gráfico de Comparação (Rendimento vs Imposto)
    if renda > 0:
        data = pd.DataFrame({
            'Categoria': ['Rendimento Líquido', 'Imposto'],
            'Valor': [renda - imposto, imposto]
        })
        st.bar_chart(data, x='Categoria', y='Valor', color="#2ecc71")

with col_chat:
    st.header("⚖️ Conversa com o Guru")
    
    # Contentor de Chat
    chat_container = st.container(height=500)
    for m in st.session_state.messages:
        with chat_container.chat_message(m["role"]):
            st.markdown(m["content"])

    # Input do Utilizador
    if prompt := st.chat_input("Ex: Como declaro o meu PPR para baixar o imposto?"):
        st.session_state.messages.append({"role": "user", "content": prompt})
        with chat_container.chat_message("user"):
            st.markdown(prompt)
            
        # Resposta da IA
        with chat_container.chat_message("assistant"):
            model = init_gemini()
            # Contexto atual para a IA saber os valores do dashboard
            contexto = f"\n[Contexto Atual: Rendimento {renda}€, Retenção {ret}€, PPR: {ppr}]"
            response = model.generate_content(prompt + contexto)
            st.markdown(response.text)
            st.session_state.messages.append({"role": "assistant", "content": response.text})

# --- RODAPÉ ---
st.markdown("---")
st.caption("O Guru Fiscal é uma ferramenta educativa. Verifique sempre com um contabilista certificado.")
