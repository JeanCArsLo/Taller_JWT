// ============================================================
// RegisterForm.jsx
// Hace POST /auth/register y sube el token al padre con onAuth()
// ============================================================

import { useState } from 'react'

function RegisterForm({ onAuth }) {
  const [form,     setForm]     = useState({ nombre: '', email: '', password: '' })
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
      const res  = await fetch('/auth/register', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(form)
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Error al registrar.')
        return
      }

      // El backend respondió con token + datos del usuario → los subimos al padre
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
        <label className="form-label">Nombre completo</label>
        <input
          type="text"
          name="nombre"
          className="form-input"
          placeholder="Juan Pérez"
          value={form.nombre}
          onChange={handleChange}
          required
          autoComplete="name"
        />
      </div>

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
          placeholder="Mínimo 6 caracteres"
          value={form.password}
          onChange={handleChange}
          required
          minLength={6}
          autoComplete="new-password"
        />
      </div>

      <button type="submit" className="btn-primary" disabled={cargando}>
        {cargando ? <><span className="btn-spinner" /> Creando cuenta...</> : 'Crear cuenta'}
      </button>

    </form>
  )
}

export default RegisterForm
