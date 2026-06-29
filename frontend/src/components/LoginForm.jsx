// ============================================================
// LoginForm.jsx
// Hace POST /auth/login y sube el token al padre con onAuth()
// ============================================================

import { useState } from 'react'

function LoginForm({ onAuth }) {
  const [form,     setForm]     = useState({ email: '', password: '' })
  const [cargando, setCargando] = useState(false)
  const [error,    setError]    = useState('')

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value })
    setError('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setCargando(true)
    setError('')

    try {
      const res  = await fetch('/auth/login', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(form)
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Error al iniciar sesión.')
        return
      }

      // Subimos el token al componente padre (App.jsx)
      localStorage.setItem('token', data.token)
      localStorage.setItem('usuario', JSON.stringify(data.usuario))
      onAuth(data.token, data.usuario)
    } catch {
      setError('No se pudo conectar con el servidor.')
    } finally {
      setCargando(false)
    }
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit}>

      {error && (
        <div className="alert alert-error">
          <span>⚠</span> {error}
        </div>
      )}

      <div className="form-group">
        <label className="form-label">Email</label>
        <input
          type="email"
          name="email"
          className="form-input"
          placeholder="tu@email.com"
          value={form.email}
          onChange={handleChange}
          required
          autoComplete="email"
        />
      </div>

      <div className="form-group">
        <label className="form-label">Contraseña</label>
        <input
          type="password"
          name="password"
          className="form-input"
          placeholder="Tu contraseña"
          value={form.password}
          onChange={handleChange}
          required
          autoComplete="current-password"
        />
      </div>

      <button type="submit" className="btn-primary" disabled={cargando}>
        {cargando ? <><span className="btn-spinner" /> Verificando...</> : 'Iniciar sesión'}
      </button>

    </form>
  )
}

export default LoginForm
