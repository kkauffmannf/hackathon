# Votación Hackathon — TO AI

Sistema simple de votación entre pares para 5 grupos (1–5), con rúbrica completa, PIN por grupo y tablero de podio en vivo. Taller de Terapia Ocupacional.

## URLs

| Página | Ruta |
|--------|------|
| Votar | `/` |
| Podio en vivo | `/results.html` |

## Deploy en Cloudflare Pages (gratis, ~10 min)

### 1. Subir a GitHub

```bash
cd Hackathon
git init
git add .
git commit -m "Votación hackathon con rúbrica y podio"
git remote add origin https://github.com/TU_USUARIO/hackathon-votacion.git
git push -u origin main
```

### 2. Crear base de datos D1

Instala [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/) y ejecuta:

```bash
npx wrangler d1 create hackathon-votes
```

Copia el `database_id` que aparece y pégalo en `wrangler.toml` (reemplaza `REPLACE_WITH_YOUR_D1_DATABASE_ID`).

Luego crea la tabla:

```bash
npx wrangler d1 execute hackathon-votes --remote --file=schema.sql
```

### 3. Conectar Cloudflare Pages a GitHub

1. Entra a [dash.cloudflare.com](https://dash.cloudflare.com)
2. **Workers & Pages** → **Create** → **Pages** → **Connect to Git**
3. Selecciona el repo
4. Configuración de build:
   - **Framework preset:** None
   - **Build command:** (dejar vacío)
   - **Build output directory:** `/`
5. En **Settings → Functions → D1 database bindings**:
   - Variable name: `DB`
   - D1 database: `hackathon-votes`

### 4. Configurar variables de entorno

En **Settings → Environment variables** (Production), agrega:

| Variable | Ejemplo | Descripción |
|----------|---------|-------------|
| `GROUP_1_PIN` | `4821` | PIN del Grupo 1 |
| `GROUP_2_PIN` | `7392` | PIN del Grupo 2 |
| `GROUP_3_PIN` | `1056` | PIN del Grupo 3 |
| `GROUP_4_PIN` | `8834` | PIN del Grupo 4 |
| `GROUP_5_PIN` | `2917` | PIN del Grupo 5 |
| `ADMIN_PIN` | `hackathon2026` | PIN del profesor |
| `TOKEN_SECRET` | `cambia-esto-por-algo-largo` | Firma de sesión (cualquier string largo) |

### 5. Compartir en clase

- Envía a cada grupo su PIN por chat privado o breakout room
- Proyecta `/results.html` en pantalla compartida
- Los estudiantes votan en `/`

## Grupos y proyectos

| Grupo | Proyecto |
|-------|----------|
| 1 | El informe funcional consume la sesión |
| 2 | ¿Qué actividad terapéutica elijo? |
| 3 | La familia no sabe qué hacer en casa |
| 4 | El plan terapéutico no lo entiende nadie |
| 5 | La derivación llega vacía |

## Cómo funciona la votación

1. Cada grupo ingresa su PIN → se identifica como 1, 2, 3, 4 o 5
2. Evalúa los **4 grupos restantes** con la rúbrica (5 criterios clínicos + 5 de diseño por grupo)
3. Un checkbox marcado = 1 punto
4. El servidor rechaza:
   - PIN incorrecto
   - Segundo voto del mismo grupo
   - Voto por el propio grupo

## Podios

| Podio | Criterio |
|-------|----------|
| 🥇 Clínico | Suma de criterios clínicos (máx. 20 pts por grupo) |
| 🎨 Diseño | Suma de criterios de diseño (máx. 20 pts) |
| 🏆 General | Clínico + diseño (máx. 40 pts) |

## Panel del profesor

En `/results.html`, ingresa `ADMIN_PIN` para:

- **Ver estado:** qué grupos ya votaron y cuáles faltan
- **Reiniciar votos:** borra todos los votos (útil entre sesiones)

## Desarrollo local

```bash
npx wrangler pages dev . --d1 DB=hackathon-votes --local
```

Crea un archivo `.dev.vars` con los PINs para probar en local:

```
GROUP_1_PIN=1111
GROUP_2_PIN=2222
GROUP_3_PIN=3333
GROUP_4_PIN=4444
GROUP_5_PIN=5555
ADMIN_PIN=admin
TOKEN_SECRET=local-dev-secret
```

Ejecuta el schema en local:

```bash
npx wrangler d1 execute hackathon-votes --local --file=schema.sql
```

## Estructura

```
├── index.html          # Votación con PIN
├── results.html        # Podio en vivo
├── css/styles.css
├── js/vote.js
├── js/results.js
├── functions/api/      # Backend serverless
├── schema.sql          # Tabla de votos
└── wrangler.toml       # Config Cloudflare
```
