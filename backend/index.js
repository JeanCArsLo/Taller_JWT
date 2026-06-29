// ============================================================
// BACKEND: Node.js + Express + MongoDB + JWT
// Puerto: 4000
// ============================================================

import express   from 'express'
import mongoose  from 'mongoose'
import bcrypt    from 'bcrypt'
import jwt       from 'jsonwebtoken'
import dotenv    from 'dotenv'
import cors      from 'cors'

dotenv.config()

const app = express()
app.use(express.json())
app.use(cors())

// ------------------------------------------------------------
// 1. MODELO DE USUARIO  (cómo se guarda en MongoDB)
// ------------------------------------------------------------
const usuarioSchema = new mongoose.Schema({
  nombre:    { type: String, required: true },
  email:     { type: String, required: true, unique: true },
  password:  { type: String, required: true },   // siempre encriptado
  creadoEn: { type: Date, default: Date.now }
})

const Usuario = mongoose.model('Usuario', usuarioSchema)

// ------------------------------------------------------------
// 2. MIDDLEWARE: verifica que el token JWT sea válido
//    Se coloca ANTES de las rutas protegidas.
// ------------------------------------------------------------
function verificarToken(req, res, next) {
  // El header llega así: "Authorization: Bearer eyJhbGci..."
  const authHeader = req.headers['authorization']

  if (!authHeader) {
    return res.status(401).json({ error: 'No enviaste un token.' })
  }

  const token = authHeader.split(' ')[1]   // quitamos el "Bearer "

  try {
    // jwt.verify() revisa que el token sea auténtico y no esté vencido.
    // Si pasa, nos devuelve los datos que guardamos dentro del token.
    const datosDelToken = jwt.verify(token, process.env.JWT_SECRET)
    req.usuario = datosDelToken   // lo adjuntamos al request para usarlo después
    next()                        // dejamos pasar a la ruta
  } catch {
    res.status(401).json({ error: 'Token inválido o vencido.' })
  }
}

// ------------------------------------------------------------
// 3. RUTAS DE AUTENTICACIÓN
// ------------------------------------------------------------

// POST /auth/register — crea una cuenta nueva
app.post('/auth/register', async (req, res) => {
  const { nombre, email, password } = req.body

  if (!nombre || !email || !password) {
    return res.status(400).json({ error: 'Nombre, email y contraseña son obligatorios.' })
  }

  try {
    // bcrypt.hash() convierte "12345" en algo como "$2b$10$XrZ..."
    // El "10" son las rondas de hash: más rondas = más seguro pero más lento.
    const passwordEncriptado = await bcrypt.hash(password, 10)

    const usuario = await Usuario.create({
      nombre,
      email,
      password: passwordEncriptado
    })

    // jwt.sign() crea el token firmado con nuestra clave secreta.
    // Guardamos dentro el id, nombre y email del usuario.
    const token = jwt.sign(
      { id: usuario._id, nombre: usuario.nombre, email: usuario.email },
      process.env.JWT_SECRET,
      { expiresIn: '2h' }   // el token vence en 2 horas
    )

    res.status(201).json({
      token,
      usuario: { nombre: usuario.nombre, email: usuario.email }
    })
  } catch (err) {
    if (err.code === 11000) {
      res.status(400).json({ error: 'Ese email ya está registrado.' })
    } else {
      res.status(500).json({ error: 'Error interno al registrar.' })
    }
  }
})

// POST /auth/login — inicia sesión
app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body

  if (!email || !password) {
    return res.status(400).json({ error: 'Email y contraseña son obligatorios.' })
  }

  try {
    const usuario = await Usuario.findOne({ email })

    if (!usuario) {
      return res.status(401).json({ error: 'Email o contraseña incorrectos.' })
    }

    // bcrypt.compare() compara el texto plano contra el hash guardado.
    // Nunca desencripta el hash; lo que hace es re-hashear y comparar.
    const passwordCorrecta = await bcrypt.compare(password, usuario.password)

    if (!passwordCorrecta) {
      return res.status(401).json({ error: 'Email o contraseña incorrectos.' })
    }

    const token = jwt.sign(
      { id: usuario._id, nombre: usuario.nombre, email: usuario.email },
      process.env.JWT_SECRET,
      { expiresIn: '2h' }
    )

    res.json({
      token,
      usuario: { nombre: usuario.nombre, email: usuario.email }
    })
  } catch {
    res.status(500).json({ error: 'Error interno al iniciar sesión.' })
  }
})

// ------------------------------------------------------------
// 4. RUTAS PROTEGIDAS (requieren token válido)
// ------------------------------------------------------------

// GET /usuarios — lista todos los usuarios (sin contraseñas)
app.get('/usuarios', verificarToken, async (req, res) => {
  // El segundo argumento '-password' excluye ese campo del resultado
  const usuarios = await Usuario.find({}, '-password')
  res.json(usuarios)
})

// GET /me — devuelve los datos del usuario autenticado (del token)
app.get('/me', verificarToken, (req, res) => {
  res.json(req.usuario)
})

// ------------------------------------------------------------
// 5. CONEXIÓN A MongoDB Y ARRANQUE DEL SERVIDOR
//    Primero nos conectamos, LUEGO escuchamos peticiones.
// ------------------------------------------------------------
mongoose.connect(process.env.MONGO_URL)
  .then(() => {
    console.log('✅ Conectado a MongoDB')
    app.listen(4000, () => {
      console.log('🚀 Backend corriendo en http://localhost:4000')
    })
  })
  .catch(err => {
    console.error('❌ Error conectando a MongoDB:', err.message)
    process.exit(1)
  })
