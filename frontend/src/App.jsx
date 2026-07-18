// ============================================================
// App.jsx — Componente raíz
//
// CONCEPTO CLAVE: El token vive SOLO en el estado de React.
// Si recargas la página, desaparece → hay que volver a iniciar sesión.
// Esto es intencional para esta práctica.
// ============================================================

import { useState, useEffect } from 'react'
import LoginForm    from './components/LoginForm'
import RegisterForm from './components/RegisterForm'
import Dashboard    from './components/Dashboard'
import { API_URL }  from './config'

function App() {
  // token y usuario son null cuando no hay sesión activa
  const [token,   setToken]   = useState(() => localStorage.getItem('token') || null)
  const [usuario, setUsuario] = useState(() => {
    const u = localStorage.getItem('usuario')
    return u ? JSON.parse(u) : null
  })
  const [tab,     setTab]     = useState('login')   // 'login' | 'register'

  // Esta función la reciben LoginForm y RegisterForm.
  // La llaman cuando el backend responde con un token exitoso.
  function onAuth(nuevoToken, datosUsuario) {
    localStorage.setItem('token', nuevoToken)
    localStorage.setItem('usuario', JSON.stringify(datosUsuario))
    setToken(nuevoToken)
    setUsuario(datosUsuario)
  }

  // Cuando Google redirige de vuelta a /auth/google/callback, el backend
  // reenvía al navegador a "/oauth-callback?token=...". Aquí recogemos ese
  // token, pedimos los datos del usuario a /me y completamos el login.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const tokenDeGoogle = params.get('token')
    if (!tokenDeGoogle) return

    fetch(`${API_URL}/me`, {
      headers: { Authorization: `Bearer ${tokenDeGoogle}` }
    })
      .then(res => res.json())
      .then(datos => onAuth(tokenDeGoogle, { nombre: datos.nombre, email: datos.email }))
      .finally(() => {
        // Limpiamos la URL para no dejar el token visible ni reprocesarlo
        window.history.replaceState({}, '', '/')
      })
  }, [])

  // Cerrar sesión = borrar el token del estado. Así de simple.
  async function onLogout() {
    // Avisa al backend que invalide el token
    await fetch(`${API_URL}/auth/logout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }
    })

    localStorage.removeItem('token')
    localStorage.removeItem('usuario')
    setToken(null)
    setUsuario(null)
  }

  // ¿Hay token? → mostramos el dashboard.
  // ¿No hay token? → mostramos los formularios.
  if (token) {
    return <Dashboard token={token} usuario={usuario} onLogout={onLogout} />
  }

  return (
    <div className="auth-page">
      <div className="auth-card">

       

        {/* Pestañas Login / Registrar */}
        <div className="auth-tabs">
          <button
            className={`auth-tab ${tab === 'login' ? 'active' : ''}`}
            onClick={() => setTab('login')}
          >
            Iniciar sesión
          </button>
          <button
            className={`auth-tab ${tab === 'register' ? 'active' : ''}`}
            onClick={() => setTab('register')}
          >
            Crear cuenta
          </button>
        </div>

        {/* Formulario activo */}
        {tab === 'login'
          ? <LoginForm    onAuth={onAuth} />
          : <RegisterForm onAuth={onAuth} />
        }

      </div>
    </div>
  )
}

export default App
