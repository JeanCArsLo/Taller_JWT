// ============================================================
// BACKEND: Node.js + Express + MongoDB + JWT + OAuth (Google)
// Puerto: process.env.PORT (local: 4000)
// ============================================================

import express        from 'express'
import mongoose       from 'mongoose'
import bcrypt         from 'bcrypt'
import jwt            from 'jsonwebtoken'
import dotenv          from 'dotenv'
import cors            from 'cors'
import session          from 'express-session'
import passport         from 'passport'
import { Strategy as GoogleStrategy } from 'passport-google-oauth20'

dotenv.config()

const app = express()
app.use(express.json())

// En producción el front y el back viven en dominios distintos
// (Vercel y Render), así que el origen permitido se toma de FRONTEND_URL.
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}))

// ------------------------------------------------------------
// 1. MODELO DE USUARIO  (cómo se guarda en MongoDB)
// ------------------------------------------------------------
const usuarioSchema = new mongoose.Schema({
  nombre:    { type: String, required: true },
  email:     { type: String, required: true, unique: true },
  // password es opcional: los usuarios que ingresan con Google no tienen una
  password:  { type: String },
  googleId:  { type: String, unique: true, sparse: true },
  creadoEn: { type: Date, default: Date.now }
})

const Usuario = mongoose.model('Usuario', usuarioSchema)

const tokenInvalidoSchema = new mongoose.Schema({
  token:     { type: String, required: true },
  expiraEn:  { type: Date, required: true }
})
const TokenInvalido = mongoose.model('TokenInvalido', tokenInvalidoSchema)


// ------------------------------------------------------------
// 2. MIDDLEWARE: verifica que el token JWT sea válido
//    Se coloca ANTES de las rutas protegidas.
// ------------------------------------------------------------
async function verificarToken(req, res, next) {
  const authHeader = req.headers['authorization']
  if (!authHeader) return res.status(401).json({ error: 'No enviaste un token.' })

  const token = authHeader.split(' ')[1]

  try {
    const datosDelToken = jwt.verify(token, process.env.JWT_SECRET)

    //revisa si el token fue invalidado
    const invalidado = await TokenInvalido.findOne({ token })
    if (invalidado) {
      return res.status(401).json({ error: 'Token inválido o vencido.' })
    }

    req.usuario = datosDelToken
    next()
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
    console.log("Token generado:", token)
    res.status(201).json({
      token,
      usuario: { nombre: usuario.nombre, email: usuario.email }
    })
  } catch (err) {
    if (err.code === 11000) {
      res.status(400).json({ error: 'El usuario esta registrado.' })
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

    if (!usuario.password) {
      return res.status(401).json({ error: 'Esta cuenta se creó con Google. Inicia sesión con el botón "Continuar con Google".' })
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
    console.log("Token generado:", token)
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

// GET /usuarios/:id — obtiene un único usuario por su ID de MongoDB
app.get('/usuarios/:id', verificarToken, async (req, res) => {
  try {
    const usuario = await Usuario.findById(req.params.id, '-password')
    if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado.' })
    res.json(usuario)
  } catch {
    res.status(400).json({ error: 'ID de usuario inválido.' })
  }
})

// PUT /usuarios/:id — actualiza el nombre y/o email de un usuario
app.put('/usuarios/:id', verificarToken, async (req, res) => {
  const { nombre, email } = req.body

  if (!nombre && !email) {
    return res.status(400).json({ error: 'Envía al menos nombre o email para actualizar.' })
  }

  try {
    const usuario = await Usuario.findByIdAndUpdate(
      req.params.id,
      { ...(nombre && { nombre }), ...(email && { email }) },
      { new: true, runValidators: true }
    ).select('-password')

    if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado.' })
    res.json(usuario)
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ error: 'Ese email ya está en uso por otro usuario.' })
    }
    res.status(400).json({ error: 'No se pudo actualizar el usuario.' })
  }
})

// DELETE /usuarios/:id — elimina un usuario
app.delete('/usuarios/:id', verificarToken, async (req, res) => {
  try {
    const usuario = await Usuario.findByIdAndDelete(req.params.id)
    if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado.' })
    res.json({ mensaje: 'Usuario eliminado correctamente.' })
  } catch {
    res.status(400).json({ error: 'ID de usuario inválido.' })
  }
})

// GET /me — devuelve los datos del usuario autenticado (del token)
app.get('/me', verificarToken, (req, res) => {
  res.json(req.usuario)
})

app.post('/auth/logout', verificarToken, async (req, res) => {
  const token = req.headers['authorization'].split(' ')[1]

  // Guardamos el token en la blacklist hasta que expire
  await TokenInvalido.create({
    token,
    expiraEn: new Date(req.usuario.exp * 1000) // exp viene del JWT
  })

  res.json({ mensaje: 'Sesión cerrada correctamente.' })
})

// ------------------------------------------------------------
// 5. LOGIN CON GOOGLE (OAuth 2.0 con Passport)
// ------------------------------------------------------------

// express-session es requerido internamente por Passport para el
// intercambio OAuth (guarda el "state" mientras Google redirige de vuelta).
app.use(session({
  secret: process.env.SESSION_SECRET || 'clave_de_sesion_temporal_cambiar_en_produccion',
  resave: false,
  saveUninitialized: false
}))
app.use(passport.initialize())
app.use(passport.session())

passport.serializeUser((usuario, done) => done(null, usuario.id))
passport.deserializeUser(async (id, done) => {
  try {
    const usuario = await Usuario.findById(id)
    done(null, usuario)
  } catch (err) {
    done(err)
  }
})

// Solo registramos la estrategia de Google si hay credenciales configuradas,
// así el servidor sigue arrancando aunque aún no tengas las claves de Google.
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(new GoogleStrategy({
    clientID:     process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL:  process.env.GOOGLE_CALLBACK_URL || 'http://localhost:4000/auth/google/callback'
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      // Buscamos primero por googleId; si no existe, por email (por si ya
      // se había registrado manualmente) y lo vinculamos a su cuenta Google.
      let usuario = await Usuario.findOne({ googleId: profile.id })

      if (!usuario) {
        const email = profile.emails?.[0]?.value
        usuario = await Usuario.findOne({ email })

        if (usuario) {
          usuario.googleId = profile.id
          await usuario.save()
        } else {
          usuario = await Usuario.create({
            nombre:   profile.displayName,
            email,
            googleId: profile.id
          })
        }
      }

      done(null, usuario)
    } catch (err) {
      done(err)
    }
  }))
}

// GET /auth/google — redirige al usuario a la pantalla de consentimiento de Google
app.get('/auth/google', passport.authenticate('google', {
  scope: ['profile', 'email']
}))

// GET /auth/google/callback — Google vuelve aquí después del login
app.get('/auth/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: '/' }),
  (req, res) => {
    // Igual que en /auth/login: generamos un JWT propio para el usuario.
    const token = jwt.sign(
      { id: req.user._id, nombre: req.user.nombre, email: req.user.email },
      process.env.JWT_SECRET,
      { expiresIn: '2h' }
    )

    // Como es una redirección del navegador (no un fetch), mandamos el
    // token como query param y el frontend lo recoge en /oauth-callback.
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173'
    res.redirect(`${frontendUrl}/oauth-callback?token=${token}`)
  }
)

// ------------------------------------------------------------
// 6. CONEXIÓN A MongoDB Y ARRANQUE DEL SERVIDOR
//    Primero nos conectamos, LUEGO escuchamos peticiones.
// ------------------------------------------------------------
const PORT = process.env.PORT || 4000

mongoose.connect(process.env.MONGO_URL)
  .then(() => {
    console.log('✅ Conectado a MongoDB')
    app.listen(PORT, () => {
      console.log(`🚀 Backend corriendo en http://localhost:${PORT}`)
    })
  })
  .catch(err => {
    console.error('❌ Error conectando a MongoDB:', err.message)
    process.exit(1)
  })
