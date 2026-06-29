# AuthApp — Práctica de autenticación con JWT

Aplicación de práctica para entender cómo funciona el login seguro con tokens JWT.
Divide el trabajo en dos procesos independientes: un backend en Node.js y un frontend en React.

---

## ¿Para qué sirve este proyecto?

Este proyecto existe para aprender el flujo completo de autenticación sin sesiones en el servidor:

1. El usuario se registra → el backend encripta su contraseña con **bcrypt** y la guarda en MongoDB.
2. El backend genera un **token JWT** firmado con una clave secreta y lo manda al frontend.
3. El frontend guarda ese token **solo en memoria** (estado de React, no en localStorage).
4. En cada petición protegida, el frontend manda el token en el header `Authorization: Bearer <token>`.
5. El backend verifica la firma del token y, si es válida, responde con los datos.
6. Al cerrar sesión, React borra el token del estado → la sesión desaparece.

---

## Tecnologías utilizadas

| Capa      | Tecnología                          |
|-----------|-------------------------------------|
| Backend   | Node.js · Express · Mongoose        |
| Base de datos | MongoDB (local)                 |
| Seguridad | bcrypt (contraseñas) · jsonwebtoken |
| Frontend  | React 18 · Vite                     |
| Estilos   | CSS puro (sin librerías)            |

---

## Estructura de carpetas

```
├── backend/
│   ├── index.js        ← servidor completo (rutas, middleware, conexión a DB)
│   ├── .env            ← variables de entorno (NO subir a git)
│   └── package.json
│
├── frontend/
│   ├── vite.config.js  ← proxy configurado para evitar CORS
│   ├── index.html
│   └── src/
│       ├── App.jsx              ← estado global (token + usuario)
│       ├── App.css              ← todos los estilos
│       ├── main.jsx
│       └── components/
│           ├── LoginForm.jsx    ← formulario de inicio de sesión
│           ├── RegisterForm.jsx ← formulario de registro
│           └── Dashboard.jsx    ← pantalla autenticada con token y usuarios
│
└── README.md
```

---

## Requisitos previos

- [Node.js](https://nodejs.org/) v18 o superior
- [MongoDB Community](https://www.mongodb.com/try/download/community) corriendo localmente en el puerto `27017`

Para verificar que MongoDB está corriendo, abre una terminal y ejecuta:
```bash
mongosh
```
Si conecta, está listo.

---

## Configuración del archivo `.env`

El backend necesita un archivo `.env` dentro de la carpeta `backend/`. Ya viene creado con valores de ejemplo; cámbialos si lo vas a usar en producción.

**`backend/.env`**
```env
# URL de conexión a MongoDB
# Por defecto apunta a una base de datos local llamada "jwt-practica"
MONGO_URL=mongodb://localhost:27017/jwt-practica

# Clave secreta para firmar y verificar los tokens JWT
# IMPORTANTE: en producción usa una cadena larga y aleatoria, nunca la dejes así
JWT_SECRET=esta_es_mi_clave_secreta_cambiar_en_produccion_123
```

> **¿Por qué no subir el `.env` a git?**
> Porque contiene `JWT_SECRET`. Si alguien obtiene esa clave, puede fabricar tokens válidos
> y acceder a todas las rutas protegidas haciéndose pasar por cualquier usuario.

---

## Cómo ejecutar el proyecto

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

## Rutas del backend

| Método | Ruta             | Protegida | Descripción                                      |
|--------|------------------|-----------|--------------------------------------------------|
| POST   | `/auth/register` | No        | Registra un usuario nuevo y devuelve un token    |
| POST   | `/auth/login`    | No        | Inicia sesión y devuelve un token                |
| GET    | `/usuarios`      | Sí ✓      | Lista todos los usuarios (sin contraseñas)       |
| GET    | `/me`            | Sí ✓      | Devuelve los datos del usuario autenticado       |

Para las rutas protegidas hay que enviar el token en el header:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

---

## Lo que este proyecto NO tiene (por diseño, es práctica)

- No guarda el token en `localStorage` ni en cookies → recargar la página cierra la sesión.
- No tiene React Router → todo es una sola página con estado condicional.
- No tiene refresh tokens → cuando el JWT vence (2 horas) hay que iniciar sesión de nuevo.
- No valida formato de email ni fortaleza de contraseña.
- No tiene HTTPS → solo para desarrollo local.
