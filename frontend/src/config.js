// URL base del backend.
//
// - En desarrollo la dejamos vacía: las peticiones van a rutas relativas
//   ("/auth/login") y el proxy de vite.config.js las reenvía al backend.
// - En producción (Vercel) el frontend y el backend viven en dominios
//   distintos, así que se necesita la URL completa del backend en Render.
//   Se configura como variable de entorno VITE_API_URL en Vercel.
export const API_URL = import.meta.env.VITE_API_URL || ''
