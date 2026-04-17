import streamlit as st
import google.generativeai as genai
import pandas as pd

# --- CONFIGURAÇÃO ---
st.set_page_config(page_title="Guru Fiscal Portugal", layout="wide")

# Inicialização da API
if "GOOGLE_API_KEY" in st.secrets:
    genai.configure(api_key=st.secrets["GOOGLE_API_KEY"])
else:
    st.error("Configura a GOOGLE_API_KEY nos Secrets do Streamlit!")
    st.stop()

# O NOME TÉCNICO PARA O MODELO QUE TENS SELECIONADO:
MODEL_ID = 'models/gemini-1.5-pro-latest' 

# --- CÁLCULOS FISCAIS (Baseados no teu App.tsx) ---
def calcular_irs(rendimento, retencao, tem_ppr):
    # Simulação de escalões 2025/26
    if rendimento <= 7703: taxa = 0.13
    elif rendimento <= 21321: taxa = 0.26
    else: taxa = 0.32
    
    imposto_devido = rendimento * taxa
    beneficio_ppr = 400 if tem_ppr else 0
    imposto_final = max(0, imposto_devido - beneficio_ppr)
    saldo = retencao - imposto_final
    return imposto_final, saldo

# --- INTERFACE ---
col_chat, col_dash = st.columns([2, 1])

with col_dash:
    st.subheader("📊 Simulador IRS 2026")
    renda = st.number_input("Rendimento Anual Bruto", value=25000)
    ret = st.number_input("Retenção na Fonte", value=4000)
    ppr = st.checkbox("Tem PPR?", value=True)
    
    imp, saldo = calcular_irs(renda, ret, ppr)
    
    st.metric("Imposto Estimado", f"{imp:.2f}€")
    st.metric("Resultado (Reembolso se > 0)", f"{saldo:.2f}€", delta=saldo)
    
    # Gráfico de Barras
    df_chart = pd.DataFrame({
        'Tipo': ['Rendimento Líquido', 'Imposto'],
        'Valor': [renda - imp, imp]
    })
    st.bar_chart(df_chart, x='Tipo', y='Valor')

with col_chat:
    st.title("⚖️ Guru Fiscal")
    
    if "messages" not in st.session_state:
        st.session_state.messages = []

    # Mostrar histórico
    for m in st.session_state.messages:
        with st.chat_message(m["role"]):
            st.markdown(m["content"])

    # Input do Chat
    if prompt := st.chat_input("Dúvida sobre o IRS?"):
        st.session_state.messages.append({"role": "user", "content": prompt})
        with st.chat_message("user"):
            st.markdown(prompt)

        # Chamada ao modelo Pro
        with st.chat_message("assistant"):
            model = genai.GenerativeModel(
                model_name=MODEL_ID,
                system_instruction="Tu és o Guru Fiscal Portugal. Usa tabelas e sê proativo."
            )
            # Enviamos o contexto do simulador para a IA saber os valores
            contexto = f"\n[Contexto: Rendimento={renda}€, Retenção={ret}€, PPR={ppr}]"
            response = model.generate_content(prompt + contexto)
            st.markdown(response.text)
            st.session_state.messages.append({"role": "assistant", "content": response.text})
