# ☁️ Decisioni Richieste per Hermes Cloud & Google Integration

Per procedere con lo sviluppo della versione online e l'integrazione con la suite Google, sono necessarie le seguenti scelte strategiche:

### 1. Hosting & Infrastruttura (Low-Cost/Gratis)
Scegliere una delle seguenti opzioni per il deploy del frontend e del backend:
- **Opzione A: Vercel + Supabase**: Ideale per React. Database PostgreSQL con gestione Auth inclusa. (Gratis fino a certi limiti).
- **Opzione B: Firebase (Google)**: Integrazione nativa con Google Auth e Cloud Functions. (Gratis fino a certi limiti).
- **Opzione C: Render/Railway + MongoDB Atlas**: Approccio standard Node.js + NoSQL.

### 2. Autenticazione & API Google
Per abilitare Google Calendar e le notifiche, è necessario:
- **Creazione Progetto Google Cloud**: Fornire il `Client ID` e la `Client Secret` (da gestire come segreti).
- **Scope di Autorizzazione**: Confermare se Hermes deve avere accesso in sola lettura o anche scrittura (creazione eventi) al calendario.

### 3. Persistenza dei Dati (Cloud Sync)
- Come gestire i Vault locali nella versione web?
  - **Opzione 1**: Sincronizzazione con Google Drive (Hermes legge i file .md da una cartella Drive).
  - **Opzione 2**: Database Cloud proprietario (i file diventano record nel DB).

### 4. Pipeline CI/CD
- Confermare l'utilizzo di GitHub Actions per il deploy automatico su branch `main`.

---
*Compilare questo file o fornire indicazioni via chat per sbloccare i relativi task di sviluppo.*

---
# Decisioni
1: A (vercel + Supabase)
3: 1 (sincronizzazione con Google Drive)
