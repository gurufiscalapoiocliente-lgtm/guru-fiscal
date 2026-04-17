import streamlit as st
import google.generativeai as genai
import pandas as pd

# --- CONFIGURAÇÃO VISUAL (TENTANDO REPLICAR O ESTILO DO STUDIO) ---
st.set_page_config(page_title="Guru Fiscal Portugal", layout="wide", initial_sidebar_state="expanded")

# CSS para imitar o look & feel do AI Studio
st.markdown("""
    <style>
    /* Estilo do Sidebar Escuro */
    [data-testid="stSidebar"] {
        background-color: #0F1115;
        color: white;
    }
    /* Estilo dos Cards de Sugestão */
    .suggestion-card {
        background-color: #F8FAFC;
        border: 1px solid #E2E8F0;
        border-radius: 12px;
        padding: 15px;
        margin-bottom: 10px;
        cursor: pointer;
    }
    /* Botão flutuante tipo Studio */
    .stButton button {
        border-radius: 20px;
        border: 1px solid #E2E8F0;
    }
    </style>
    """, unsafe_allow_html=True)

# --- INICIALIZAÇÃO DO MODELO ---
# Usando o ID que corresponde ao que o Studio usa internamente
MODEL_ID = 'models/gemini-1.5-pro'

def get_chat():
    if "chat" not in st.session_state:
        genai.configure(api_key=st.secrets["GOOGLE_API_KEY"])
        model = genai.GenerativeModel(
            model_name=MODEL_ID,
            system_instruction="Tu és o Guru Fiscal. Mentor de IRS em Portugal. Usa um tom profissional, tabelas Markdown e sê proativo ao detetar dados fiscais."
        )
        st.session_state.chat = model.start_chat(history=[])
    return st.session_state.chat

# --- ESTRUTURA DA PÁGINA (SIDEBAR) ---
with st.sidebar:
    st.image("https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6", use_container_width=True)
    st.title("⚖️ Guru Fiscal")
    st.markdown("---")
    st.subheader("Perfil Fiscal 2026")
    
    # Inputs que tinhas no App.tsx
    renda = st.number_input("Rendimento Bruto (€)", value=0)
    retencao = st.number_input("Retenção na Fonte (€)", value=0)
    ppr = st.toggle("Possui PPR?", value=False)
    
    st.markdown("---")
    st.caption("v1.0.0 | IRS Portugal")

# --- CORPO DA APP ---
col_main, col_data = st.columns([2, 1])

with col_main:
    st.title("Olá! Sou o teu Guru Fiscal. 👋")
    st.info("Como posso ajudar a otimizar o teu IRS hoje?")
    
    # Histórico de Chat
    if "messages" not in st.session_state:
        st.session_state.messages = []

    for msg in st.session_state.messages:
        with st.chat_message(msg["role"]):
            st.markdown(msg["content"])

    # Input (simulando a barra de chat do Studio)
    if prompt := st.chat_input("Escreve aqui a tua dúvida..."):
        st.session_state.messages.append({"role": "user", "content": prompt})
        with st.chat_message("user"):
            st.markdown(prompt)

        with st.chat_message("assistant"):
            chat = get_chat()
            # Injetamos o contexto dos inputs do sidebar na pergunta
            context = f"\n(Contexto: Rendimento={renda}€, Retenção={retencao}€, PPR={ppr})"
            response = chat.send_message(prompt + context)
            st.markdown(response.text)
            st.session_state.messages.append({"role": "assistant", "content": response.text})

with col_data:
    st.subheader("💡 Sugestões")
    if st.button("📈 Como otimizar deduções?"):
        pass # Podias disparar uma pergunta automática aqui
    if st.button("🛡️ Vantagens do PPR"):
        pass

    st.markdown("---")
    st.subheader("Cálculo Estimado")
    # Pequena lógica de cálculo para preencher o gráfico
    imposto = renda * 0.25 # Simplificação
    resultado = retencao - imposto
    
    st.metric("Estimativa de Reembolso", f"{resultado:,.2f}€")
    
    # Gráfico simples para ocupar o espaço lateral
    chart_data = pd.DataFrame({'Label': ['Líquido', 'Imposto'], 'Valor': [renda-imposto, imposto]})
    st.bar_chart(chart_data, x='Label', y='Valor', color="#4F46E5")
