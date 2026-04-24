# Rifbound TCG — Site Communautaire

Site communautaire non officiel pour le TCG Rifbound.  
Bibliothèque de cartes, constructeur de deck, suivi de collection et règles du jeu.

## Stack

| Couche          | Technologie                  | Hébergement        |
|-----------------|------------------------------|--------------------|
| Frontend        | HTML / CSS / Vanilla JS      | Vercel (gratuit)   |
| Backend API     | Node.js + Express            | Render (gratuit)   |
| Base de données | PostgreSQL via Supabase      | Supabase (gratuit) |
| Auth + Realtime | Supabase                     | Supabase           |

---

## Structure du repo

```
rifbound-tcg/
├── .github/workflows/ci.yml   # Lint automatique sur chaque push
├── backend/                   # API Express
│   ├── src/
│   │   ├── index.js           # Entrée du serveur
│   │   ├── config/env.js      # Variables d'env validées
│   │   ├── db/index.js        # Pool PostgreSQL
│   │   ├── middleware/        # CORS, erreurs
│   │   └── routes/            # Routes API
│   ├── .env.example           # Template des variables
│   └── package.json
├── frontend/                  # Site HTML/CSS/JS
│   ├── index.html
│   ├── assets/js/api.js       # Client API centralisé
│   └── vercel.json            # Config déploiement Vercel
├── render.yaml                # Config déploiement Render
└── .gitignore
```

---

## Installation locale

### Prérequis
- Node.js ≥ 20 ([nodejs.org](https://nodejs.org))
- Un compte [Supabase](https://supabase.com) (gratuit)
- Un compte [GitHub](https://github.com)

### 1 — Cloner et installer

```bash
git clone https://github.com/TON_USERNAME/rifbound-tcg.git
cd rifbound-tcg/backend
npm install
```

### 2 — Configurer Supabase

1. Crée un nouveau projet sur [supabase.com](https://supabase.com)
2. Dans **Settings → Database**, copie la **Connection String** (mode Transaction, port 6543)
3. Dans **Settings → API**, copie l'`ANON KEY` et la `SERVICE_ROLE KEY`

### 3 — Variables d'environnement

```bash
cd backend
cp .env.example .env
# Édite .env avec tes vraies valeurs Supabase
```

### 4 — Lancer en développement

```bash
# Terminal 1 — Backend (rechargement auto avec Node --watch)
cd backend && npm run dev

# Terminal 2 — Frontend
# Ouvre frontend/index.html avec Live Server (VS Code) ou :
cd frontend && npx http-server -p 5500
```

Ouvre http://localhost:5500 — la page doit afficher "API connectée".

---

## Déploiement

### Vercel (frontend)

```bash
npm install -g vercel
cd frontend
vercel
# Suit le wizard : framework = Other, output directory = .
```

Ou connecte le repo sur [vercel.com](https://vercel.com) → root directory = `frontend`.

### Render (backend)

1. Va sur [render.com](https://render.com) → New → Web Service
2. Connecte ton repo GitHub
3. Render détecte automatiquement le `render.yaml`
4. Dans **Environment**, renseigne toutes les variables de `.env.example`
5. Le health check (`/api/health`) confirme que le service est vivant

---

## Roadmap

| Phase | Feature            | Statut      |
|-------|--------------------|-------------|
| 0     | Fondations & setup | ✅ En cours |
| 1     | Bibliothèque cartes | 🔜 À faire  |
| 2     | Constructeur deck  | 🔜 À faire  |
| 3     | Collection         | 🔜 À faire  |
| 4     | Règles & Communauté | 🔜 À faire |
