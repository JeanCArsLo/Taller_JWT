# AuthApp — Taller de autenticación con JWT, MongoDB y OAuth

Proyecto de la **Unidad 4: Pruebas, seguridad y despliegue**. Implementa un backend en Node.js/Express
con CRUD sobre MongoDB, autenticación con JWT, inicio de sesión con Google (OAuth 2.0) y un frontend
en React que consume todo lo anterior. Incluye la configuración necesaria para desplegar el frontend
en Vercel y el backend en Render/Heroku.

---

## ¿Para qué sirve este proyecto?

Cubre el flujo completo de autenticación y persistencia de una aplicación real:

1. El usuario se registra → el backend encripta su contraseña con **bcrypt** y la guarda en MongoDB.
2. El backend genera un **token JWT** firmado con una clave secreta y lo manda al frontend.
3. El frontend guarda ese token y lo manda en cada petición protegida (`Authorization: Bearer <token>`).
4. El backend verifica la firma del token con un middleware antes de responder.
5. Sobre el modelo `Usuario` existe un **CRUD completo** (crear, leer, actualizar, eliminar) probable desde Postman.
6. El usuario también puede iniciar sesión con su cuenta de **Google (OAuth 2.0)** sin escribir contraseña.
7. Al cerrar sesión, el backend invalida el token (blacklist) y el frontend borra su copia local.

---

## Tecnologías utilizadas

| Capa           | Tecnología                                              |
|----------------|----------------------------------------------------------|
| Backend        | Node.js · Express · Mongoose                             |
| Base de datos  | MongoDB (local o Atlas)                                   |
| Seguridad      | bcrypt (contraseñas) · jsonwebtoken · passport (Google OAuth 2.0) |
| Frontend       | React 18 · Vite                                           |
| Estilos        | CSS puro (sin librerías)                                  |
| Despliegue     | Vercel (frontend) · Render/Heroku (backend)               |

---

## Estructura de carpetas

```
├── backend/
│   ├── index.js         ← servidor completo (rutas, middleware, Passport, conexión a DB)
│   ├── .env              ← variables de entorno (NO subir a git)
│   ├── .env.example       ← plantilla de variables de entorno
│   ├── Procfile          ← comando de arranque para Heroku
│   ├── render.yaml        ← blueprint opcional para Render
│   └── package.json
│
├── frontend/
│   ├── vite.config.js    ← proxy hacia el backend en desarrollo
│   ├── vercel.json        ← rewrites para que Vercel sirva la SPA correctamente
│   ├── .env.example        ← plantilla de variables de entorno (VITE_API_URL)
│   ├── index.html
│   └── src/
│       ├── App.jsx               ← estado global (token + usuario) y callback de Google
│       ├── App.css               ← todos los estilos
│       ├── config.js             ← URL base del backend (VITE_API_URL)
│       ├── main.jsx
│       └── components/
│           ├── LoginForm.jsx     ← inicio de sesión (email/password + botón de Google)
│           ├── RegisterForm.jsx  ← registro de cuenta nueva
│           └── Dashboard.jsx     ← pantalla autenticada: token JWT y tabla de usuarios
│
└── README.md
```

---

## Sesión 1 — CRUD en MongoDB

- **Modelo `Usuario`** (`backend/index.js`): `nombre`, `email` (único), `password` (opcional, para
  soportar cuentas creadas por Google), `googleId` (opcional, único) y `creadoEn`.
- **Endpoints CRUD** (todos requieren token, ver Sesión 2):

| Método | Ruta             | Descripción                                    |
|--------|------------------|-------------------------------------------------|
| POST   | `/auth/register` | Crea un usuario nuevo (alta con contraseña)     |
| GET    | `/usuarios`      | Lista todos los usuarios (sin contraseñas)      |
| GET    | `/usuarios/:id`  | Obtiene un usuario por su ID de MongoDB         |
| PUT    | `/usuarios/:id`  | Actualiza `nombre` y/o `email` de un usuario    |
| DELETE | `/usuarios/:id`  | Elimina un usuario                              |

Para probar con Postman: registra un usuario, copia su `_id` desde la respuesta de `GET /usuarios`
y úsalo en las rutas `GET/PUT/DELETE /usuarios/:id`, enviando siempre el header `Authorization`.

---

## Sesión 2 — Autenticación con JWT

- **`POST /auth/login`**: valida `email`/`password` contra MongoDB (comparando el hash con `bcrypt.compare`)
  y devuelve un token JWT firmado con `JWT_SECRET`, válido por 2 horas.
- **Middleware `verificarToken`**: lee el header `Authorization: Bearer <token>`, verifica la firma con
  `jwt.verify` y revisa que el token no esté en la colección `TokenInvalido` (blacklist de logout).
  Se aplica a todas las rutas protegidas (`/usuarios`, `/usuarios/:id`, `/me`, `/auth/logout`).
- **`POST /auth/logout`**: guarda el token actual en la blacklist hasta que expire por sí solo.

Para probar desde Postman: haz login, copia el `token` de la respuesta y agrégalo en cada petición
protegida como header `Authorization` con el valor `Bearer <token>`.

---

## Sesión 3 — OAuth con Google y despliegue

### Login con Google

Usa `passport` + `passport-google-oauth20`:

1. `GET /auth/google` redirige al usuario a la pantalla de consentimiento de Google.
2. Google redirige de vuelta a `GET /auth/google/callback` con el perfil del usuario.
3. El backend busca (o crea) el `Usuario` correspondiente por `googleId`/`email`, genera un JWT
   igual que en el login normal y redirige al frontend a `/oauth-callback?token=...`.
4. `App.jsx` recoge ese token, llama a `GET /me` para obtener los datos del usuario y completa el login.

**Cómo crear las credenciales de Google:**

1. Entra a [Google Cloud Console → Credenciales](https://console.cloud.google.com/apis/credentials).
2. Crea un proyecto (o usa uno existente) y un **ID de cliente de OAuth 2.0** de tipo "Aplicación web".
3. En **URI de redirección autorizados** agrega:
   - `http://localhost:4000/auth/google/callback` (desarrollo)
   - `https://tu-backend.onrender.com/auth/google/callback` (producción, después de desplegar)
4. Copia el `Client ID` y `Client Secret` a `backend/.env` (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`).

### Despliegue

**Backend en Render:**

1. Sube el repositorio a GitHub.
2. En Render: **New + → Web Service**, selecciona el repo y como *Root Directory* pon `backend`.
3. *Build Command*: `npm install` — *Start Command*: `npm start`.
4. Agrega las variables de entorno de `backend/.env.example` en la sección **Environment** de Render
   (usa tu cadena de MongoDB Atlas en `MONGO_URL`, y pon `FRONTEND_URL` con la URL de Vercel).
5. Actualiza `GOOGLE_CALLBACK_URL` con la URL pública de Render y agrégala también en Google Cloud Console.

**Frontend en Vercel:**

1. En Vercel: **Add New → Project**, selecciona el repo y como *Root Directory* pon `frontend`.
2. *Build Command*: `npm run build` — *Output Directory*: `dist` (Vercel los detecta automáticamente con Vite).
3. Agrega la variable de entorno `VITE_API_URL` con la URL pública del backend en Render.
4. El archivo `vercel.json` ya incluido asegura que rutas como `/oauth-callback` sirvan `index.html`
   (necesario porque la SPA no usa un router de servidor).

---

## Requisitos previos

- [Node.js](https://nodejs.org/) v18 o superior
- [MongoDB Community](https://www.mongodb.com/try/download/community) local en el puerto `27017`,
  o una base de datos en [MongoDB Atlas](https://www.mongodb.com/atlas)

Para verificar que MongoDB local está corriendo:
```bash
mongosh
```

---

## Configuración del archivo `.env`

El backend necesita un archivo `.env` dentro de `backend/` (usa `backend/.env.example` como plantilla):

```env
MONGO_URL=mongodb://localhost:27017/jwt-practica
JWT_SECRET=esta_es_mi_clave_secreta_cambiar_en_produccion_123
SESSION_SECRET=otra_clave_larga_y_aleatoria_para_las_sesiones

GOOGLE_CLIENT_ID=tu_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=tu_client_secret
GOOGLE_CALLBACK_URL=http://localhost:4000/auth/google/callback

FRONTEND_URL=http://localhost:5173
PORT=4000
```

> **¿Por qué no subir el `.env` a git?**
> Porque contiene claves secretas (`JWT_SECRET`, `SESSION_SECRET`, credenciales de Google). Si alguien
> las obtiene puede fabricar tokens válidos o suplantar la app ante Google.

El frontend solo necesita variables de entorno si el backend vive en otro dominio (producción). Usa
`frontend/.env.example` como plantilla para crear `frontend/.env` con `VITE_API_URL`.

---

## Cómo ejecutar el proyecto en local

Necesitas **dos terminales abiertas al mismo tiempo**.

### Terminal 1 — Backend (puerto 4000)

```bash
cd backend
npm install
npm run dev
```

Deberías ver:
```
✅ Conectado a MongoDB
🚀 Backend corriendo en http://localhost:4000
```

### Terminal 2 — Frontend (puerto 5173)

```bash
cd frontend
npm install
npm run dev
```

Luego abre el navegador en:
```
http://localhost:5173
```

---

## Rutas del backend (resumen)

| Método | Ruta                      | Protegida | Descripción                                      |
|--------|---------------------------|-----------|----------------------------------------------------|
| POST   | `/auth/register`          | No        | Registra un usuario nuevo y devuelve un token       |
| POST   | `/auth/login`              | No        | Inicia sesión y devuelve un token                    |
| GET    | `/auth/google`             | No        | Inicia el flujo de login con Google                  |
| GET    | `/auth/google/callback`    | No        | Callback de Google; redirige al frontend con el token|
| POST   | `/auth/logout`              | Sí ✓      | Invalida el token actual                             |
| GET    | `/usuarios`                | Sí ✓      | Lista todos los usuarios (sin contraseñas)           |
| GET    | `/usuarios/:id`            | Sí ✓      | Obtiene un usuario por ID                            |
| PUT    | `/usuarios/:id`            | Sí ✓      | Actualiza nombre/email de un usuario                 |
| DELETE | `/usuarios/:id`            | Sí ✓      | Elimina un usuario                                    |
| GET    | `/me`                       | Sí ✓      | Devuelve los datos del usuario autenticado           |

Para las rutas protegidas hay que enviar el token en el header:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

---

## Notas de diseño

- No tiene React Router → todo es una sola página con estado condicional (el callback de Google se
  procesa leyendo `window.location.search` al montar `App.jsx`).
- No tiene refresh tokens → cuando el JWT vence (2 horas) hay que iniciar sesión de nuevo.
- No valida formato de email ni fortaleza de contraseña más allá de lo mínimo.
- En local no hay HTTPS → solo para desarrollo.
