# Modulo 1 — Schema DB + API Backend Temi

## Struttura file

```
db/
  migrations/
    001_create_survey_themes.sql     ← Migration PostgreSQL
src/
  schemas/
    themeConfig.js                   ← Validazione Joi + defaults
  services/
    themeService.js                  ← Logica CRUD, clone, assets
  routes/
    themes.js                        ← Express routes REST
  middleware/
    upload.js                        ← Multer config per upload immagini
    themeErrorHandler.js             ← Error handler specifico
```

## Setup

### 1. Dipendenze

```bash
npm install joi multer uuid
```

### 2. Variabili d'ambiente

```env
THEME_ASSETS_DIR=./uploads/theme-assets
TEMP_UPLOAD_DIR=./uploads/tmp
```

### 3. Creare le directory

```bash
mkdir -p uploads/theme-assets uploads/tmp
```

### 4. Eseguire la migration

```bash
psql -d your_database -f db/migrations/001_create_survey_themes.sql
```

### 5. Montare in app.js

```javascript
const themeRoutes = require('./src/routes/themes');
const { themeErrorHandler } = require('./src/middleware/themeErrorHandler');

// Routes
app.use('/api/themes', themeRoutes);

// Error handler (dopo tutte le routes)
app.use(themeErrorHandler);
```

## API Endpoints

| Metodo   | Endpoint                           | Descrizione                          |
|----------|------------------------------------|--------------------------------------|
| `GET`    | `/api/themes`                      | Lista temi (propri + builtin + pub)  |
| `GET`    | `/api/themes/defaults`             | Config di default (per il frontend)  |
| `GET`    | `/api/themes/:id`                  | Dettaglio tema con assets            |
| `POST`   | `/api/themes`                      | Crea nuovo tema                      |
| `PUT`    | `/api/themes/:id`                  | Aggiorna tema (full)                 |
| `PATCH`  | `/api/themes/:id/config/:section`  | Aggiorna singola sezione config      |
| `POST`   | `/api/themes/:id/clone`            | Clona tema (anche i builtin)         |
| `DELETE` | `/api/themes/:id`                  | Elimina tema                         |
| `POST`   | `/api/themes/:id/assets`           | Upload immagine (multipart)          |
| `GET`    | `/api/themes/:id/assets/:filename` | Serve immagine asset                 |
| `DELETE` | `/api/themes/:id/assets/:assetId`  | Elimina asset                        |
| `PUT`    | `/api/themes/apply/:surveyId`      | Applica tema a un sondaggio          |

### Esempio: creare un tema custom

```bash
curl -X POST http://localhost:3000/api/themes \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Corporate Dark",
    "description": "Tema scuro per sondaggi aziendali",
    "config": {
      "colors": {
        "pageBackground": "#1a1a2e",
        "surface": "#16213e",
        "primary": "#0f3460",
        "text": "#e0e0e0",
        "border": "#2a2a4a"
      },
      "card": {
        "backgroundColor": "#16213e",
        "shadow": "0 4px 16px rgba(0,0,0,0.3)"
      }
    }
  }'
```

### Esempio: aggiornare solo i colori

```bash
curl -X PATCH http://localhost:3000/api/themes/THEME_ID/config/colors \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "primary": "#e94560", "primaryHover": "#c81e45" }'
```

### Esempio: upload sfondo

```bash
curl -X POST http://localhost:3000/api/themes/THEME_ID/assets \
  -H "Authorization: Bearer TOKEN" \
  -F "file=@./background.jpg" \
  -F "asset_type=background"
```

## Note architetturali

- **Config JSONB**: tutte le proprietà del tema sono in un singolo campo `config` JSONB. 
  Questo permette di aggiungere nuove proprietà senza migration.
- **Patch per sezione**: l'endpoint `PATCH /config/:section` è pensato per il theme editor 
  React, dove ogni pannello (Colori, Tipografia, ecc.) fa il save della propria sezione.
- **Builtin immutabili**: i temi predefiniti non si possono modificare, solo clonare.
- **Assets auto-linkati**: quando si uploada un background o un logo, il service aggiorna 
  automaticamente la config del tema con l'URL dell'asset.
