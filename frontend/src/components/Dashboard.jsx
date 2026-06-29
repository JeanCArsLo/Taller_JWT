// ============================================================
// Dashboard.jsx — Pantalla principal cuando el usuario está autenticado
//
// Muestra:
//   1. Navbar con info del usuario y botón de logout
//   2. El token JWT desglosado (header · payload · firma) en colores
//   3. Payload decodificado (para ver qué hay DENTRO del token)
//   4. Tabla con todos los usuarios registrados
// ============================================================

import { useState, useEffect } from 'react'

// Genera un color de avatar determinista según el nombre
function colorAvatar(nombre) {
  const colores = ['#2563eb','#7c3aed','#db2777','#dc2626','#d97706','#059669','#0891b2']
  return colores[nombre.charCodeAt(0) % colores.length]
}

// Iniciales del nombre (máx 2 letras)
function iniciales(nombre) {
  return nombre.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()
}

// Decodifica la parte del payload del JWT (es solo base64, NO está encriptado)
function decodificarPayload(token) {
  try {
    return JSON.parse(atob(token.split('.')[1]))
  } catch {
    return null
  }
}

// Calcula minutos restantes hasta que vence el token
function minutosRestantes(exp) {
  return Math.max(0, Math.round((exp * 1000 - Date.now()) / 60000))
}

// Formatea una fecha ISO a algo legible
function formatearFecha(isoString) {
  return new Date(isoString).toLocaleDateString('es-ES', {
    day: '2-digit', month: 'short', year: 'numeric'
  })
}

// --------------------------------------------------------

function Dashboard({ token, usuario, onLogout }) {
  const [usuarios,  setUsuarios]  = useState([])
  const [cargando,  setCargando]  = useState(false)
  const [errorLista, setErrorLista] = useState('')
  const [copiado,   setCopiado]   = useState(false)
  const [tokenVisible, setTokenVisible] = useState(false)

  const payload = decodificarPayload(token)
  const partes  = token.split('.')

  // Cargamos los usuarios al montar el componente
  useEffect(() => {
    cargarUsuarios()
  }, [])

  async function cargarUsuarios() {
    setCargando(true)
    setErrorLista('')
    try {
      // CLAVE: mandamos el token en el header Authorization
      const res = await fetch('/usuarios', {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()

      if (!res.ok) {
        setErrorLista(data.error || 'Error al cargar usuarios.')
      } else {
        setUsuarios(data)
      }
    } catch {
      setErrorLista('No se pudo conectar con el servidor.')
    } finally {
      setCargando(false)
    }
  }

  function copiarToken() {
    navigator.clipboard.writeText(token)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2000)
  }

  return (
    <div className="dashboard">

      {/* ── NAVBAR ── */}
      <nav className="navbar">
        <div className="navbar-brand">
          AuthApp
        </div>
        <div className="navbar-user">
          <div
            className="user-avatar"
            style={{ background: colorAvatar(usuario.nombre) }}
          >
            {iniciales(usuario.nombre)}
          </div>
          <div className="user-info">
            <span className="user-name">{usuario.nombre}</span>
            <span className="user-email">{usuario.email}</span>
          </div>
          <button className="btn-logout" onClick={onLogout}>
            Cerrar sesión
          </button>
        </div>
      </nav>

      {/* ── CONTENIDO ── */}
      <main className="dashboard-content">

        {/* Bienvenida */}
        <div className="welcome-section">
          <h2>Bienvenido, {usuario.nombre} </h2>
          <p>Tu sesión está activa. El token vence en {payload ? minutosRestantes(payload.exp) : '?'} minutos.</p>
        </div>

        {/* Tarjetas de estado */}
        <div className="stats-grid">
          <div className="stat-card active">
            <div className="stat-label">Estado de sesión</div>
            <div className="stat-value">Activo</div>
            <div className="stat-sub">JWT válido</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Token expira en</div>
            <div className="stat-value">{payload ? minutosRestantes(payload.exp) : '--'}</div>
            <div className="stat-sub">minutos</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Usuarios registrados</div>
            <div className="stat-value">{cargando ? '...' : usuarios.length}</div>
            <div className="stat-sub">en la base de datos</div>
          </div>
        </div>

        {/* ── SECCIÓN DEL TOKEN JWT ── */}
        <div className="token-card">
          <div className="card-header">
            <div className="card-title">
              <span>🎫</span> Tu Token JWT
              <span className="badge badge-green">Válido</span>
            </div>
            <div className="card-actions">
              <button className="btn-copy" onClick={() => setTokenVisible(v => !v)}>
                {tokenVisible ? 'Ocultar' : 'Ver token'}
              </button>
              <button className="btn-copy" onClick={copiarToken}>
                {copiado ? '✓ Copiado' : 'Copiar'}
              </button>
            </div>
          </div>

          <div className="token-body">

            {/* Explicación de las 3 partes */}
            <div className="token-legend">
              <span><span className="dot dot-orange" /> Header</span>
              <span><span className="dot dot-purple" /> Payload (datos)</span>
              <span><span className="dot dot-green"  /> Firma</span>
            </div>

            {/* Token coloreado por partes */}
            <div className="token-parts">
              <span className="token-header-part">
                {tokenVisible ? partes[0] : partes[0].slice(0, 20) + '...'}
              </span>
              <span className="token-dot">.</span>
              <span className="token-payload-part">
                {tokenVisible ? partes[1] : partes[1].slice(0, 20) + '...'}
              </span>
              <span className="token-dot">.</span>
              <span className="token-sig-part">
                {tokenVisible ? partes[2] : partes[2].slice(0, 20) + '...'}
              </span>
            </div>

            {/* Payload decodificado — esto es EDUCATIVO */}
            {payload && (
              <div className="token-decoded">
                <h4>Payload decodificado (base64 → JSON)</h4>
                <p className="decoded-note">
                  El payload NO está encriptado, solo codificado en base64. Cualquiera puede leerlo.
                  Por eso nunca pongas contraseñas dentro del token.
                </p>
                <div className="decoded-grid">
                  <div className="decoded-row">
                    <span className="decoded-key">id</span>
                    <span className="decoded-value">{payload.id}</span>
                  </div>
                  <div className="decoded-row">
                    <span className="decoded-key">nombre</span>
                    <span className="decoded-value">"{payload.nombre}"</span>
                  </div>
                  <div className="decoded-row">
                    <span className="decoded-key">email</span>
                    <span className="decoded-value">"{payload.email}"</span>
                  </div>
                  <div className="decoded-row">
                    <span className="decoded-key">exp</span>
                    <span className="decoded-value">
                      {new Date(payload.exp * 1000).toLocaleTimeString('es-ES')}
                      {' '}
                      <span className="decoded-muted">(vence a esta hora)</span>
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── TABLA DE USUARIOS ── */}
        <div className="users-card">
          <div className="card-header">
            <div className="card-title">
              <span>👥</span> Usuarios registrados
              <span className="badge badge-blue">{usuarios.length}</span>
            </div>
            <button className="btn-refresh" onClick={cargarUsuarios} disabled={cargando}>
              {cargando ? '⟳ Cargando...' : '↺ Actualizar'}
            </button>
          </div>

          {errorLista && (
            <div className="alert alert-error" style={{ margin: '16px 20px 0' }}>
              <span>⚠</span> {errorLista}
            </div>
          )}

          {cargando && !usuarios.length ? (
            <div className="loading-state">
              <div className="spinner" />
              <span>Cargando usuarios...</span>
            </div>
          ) : usuarios.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">👤</div>
              <p>No hay usuarios todavía.</p>
            </div>
          ) : (
            <table className="users-table">
              <thead>
                <tr>
                  <th>Usuario</th>
                  <th>ID en MongoDB</th>
                  <th>Registrado</th>
                </tr>
              </thead>
              <tbody>
                {usuarios.map(u => (
                  <tr key={u._id}>
                    <td>
                      <div className="table-user-cell">
                        <div
                          className="user-row-avatar"
                          style={{ background: colorAvatar(u.nombre) }}
                        >
                          {iniciales(u.nombre)}
                        </div>
                        <div className="table-user-info">
                          <span className="table-user-name">{u.nombre}</span>
                          <span className="table-user-email">{u.email}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="table-id">{u._id}</span>
                    </td>
                    <td>
                      <span className="table-date">{formatearFecha(u.creadoEn)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

      </main>
    </div>
  )
}

export default Dashboard
