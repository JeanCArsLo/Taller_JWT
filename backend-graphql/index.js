// ============================================================
// TALLER GRAPHQL — Apollo Server 4 + MongoDB + JWT
// Puerto: 4001  (el REST sigue en 4000, corren al mismo tiempo)
//
// DIFERENCIA CLAVE vs REST:
//   REST  → muchos endpoints (/auth/login, /usuarios, /me)
//   GraphQL → UN SOLO endpoint /graphql, el cliente pide lo que necesita
// ============================================================

import { ApolloServer }       from '@apollo/server'
import { startStandaloneServer } from '@apollo/server/standalone'
import mongoose               from 'mongoose'
import bcrypt                 from 'bcrypt'
import jwt                    from 'jsonwebtoken'
import dotenv                 from 'dotenv'

dotenv.config()

// ─────────────────────────────────────────────────────────────
// 1. MODELO  (igual que en el backend REST, sin cambios)
// ─────────────────────────────────────────────────────────────
const Usuario = mongoose.model('Usuario', new mongoose.Schema({
  nombre:   { type: String, required: true },
  email:    { type: String, required: true, unique: true },
  password: { type: String, required: true },
  creadoEn: { type: Date, default: Date.now }
}))

// ─────────────────────────────────────────────────────────────
// 2. SCHEMA (SDL — Schema Definition Language)
//
//    Aquí defines QUÉ tipos existen y QUÉ operaciones permite la API.
//    Es como el "contrato" entre cliente y servidor.
//
//    Query    → leer datos   (equivale a GET en REST)
//    Mutation → modificar    (equivale a POST/PUT/DELETE en REST)
// ─────────────────────────────────────────────────────────────
const typeDefs = `#graphql

  # Tipo principal: cómo luce un usuario en las respuestas
  type Usuario {
    id:       ID!
    nombre:   String!
    email:    String!
    creadoEn: String!
  }

  # Lo que devuelve register y login
  type AuthPayload {
    token:   String!
    usuario: UsuarioPublico!
  }

  # Versión reducida del usuario (sin contraseña ni id)
  type UsuarioPublico {
    nombre: String!
    email:  String!
  }

  # ── Queries (leer) ──────────────────────────────────────────
  type Query {
    # Devuelve los datos del usuario autenticado (del token)
    me: Usuario

    # Lista todos los usuarios — ruta protegida
    usuarios: [Usuario!]!
  }

  # ── Mutations (escribir) ─────────────────────────────────────
  type Mutation {
    register(nombre: String!, email: String!, password: String!): AuthPayload!
    login(email: String!, password: String!): AuthPayload!
  }
`

// ─────────────────────────────────────────────────────────────
// 3. RESOLVERS
//
//    Son las FUNCIONES que responden cada query/mutation.
//    Equivalen a los app.get() / app.post() del backend REST.
//
//    Cada resolver recibe (parent, args, context):
//      parent  → resultado del resolver padre (en queries anidadas)
//      args    → los argumentos que mandó el cliente
//      context → datos compartidos en toda la petición (ej: usuario autenticado)
// ─────────────────────────────────────────────────────────────
const resolvers = {

  Query: {
    // GET /me  →  query { me { nombre email } }
    me: (_, __, context) => {
      if (!context.usuario) throw new Error('No autenticado. Mandá el token.')
      return context.usuario
    },

    // GET /usuarios  →  query { usuarios { id nombre email } }
    usuarios: async (_, __, context) => {
      if (!context.usuario) throw new Error('No autenticado. Mandá el token.')
      const lista = await Usuario.find({}, '-password')
      // GraphQL necesita que los IDs sean strings
      return lista.map(u => ({ ...u.toObject(), id: u._id.toString() }))
    }
  },

  Mutation: {
    // POST /auth/register  →  mutation { register(nombre: "...", email: "...", password: "...") { token } }
    register: async (_, { nombre, email, password }) => {
      if (!nombre || !email || !password) {
        throw new Error('Todos los campos son obligatorios.')
      }

      try {
        const hash    = await bcrypt.hash(password, 10)
        const usuario = await Usuario.create({ nombre, email, password: hash })

        const token = jwt.sign(
          { id: usuario._id.toString(), nombre: usuario.nombre, email: usuario.email },
          process.env.JWT_SECRET,
          { expiresIn: '2h' }
        )

        return { token, usuario: { nombre: usuario.nombre, email: usuario.email } }
      } catch (err) {
        if (err.code === 11000) throw new Error('Ese email ya está registrado.')
        throw new Error('Error al registrar el usuario.')
      }
    },

    // POST /auth/login  →  mutation { login(email: "...", password: "...") { token usuario { nombre } } }
    login: async (_, { email, password }) => {
      const usuario = await Usuario.findOne({ email })
      if (!usuario) throw new Error('Email o contraseña incorrectos.')

      const ok = await bcrypt.compare(password, usuario.password)
      if (!ok)  throw new Error('Email o contraseña incorrectos.')

      const token = jwt.sign(
        { id: usuario._id.toString(), nombre: usuario.nombre, email: usuario.email },
        process.env.JWT_SECRET,
        { expiresIn: '2h' }
      )

      return { token, usuario: { nombre: usuario.nombre, email: usuario.email } }
    }
  }
}

// ─────────────────────────────────────────────────────────────
// 4. CONTEXTO
//
//    Esta función se ejecuta en CADA petición antes de llegar al resolver.
//    Es el equivalente al middleware verificarToken del backend REST,
//    pero en lugar de bloquear, pone al usuario en el contexto.
//
//    Así todos los resolvers pueden saber quién está autenticado
//    leyendo context.usuario, sin repetir la verificación en cada uno.
// ─────────────────────────────────────────────────────────────
async function context({ req }) {
  const authHeader = req.headers.authorization || ''
  const token      = authHeader.replace('Bearer ', '').trim()

  if (!token) return { usuario: null }

  try {
    const datos = jwt.verify(token, process.env.JWT_SECRET)
    return { usuario: datos }
  } catch {
    return { usuario: null }  // token inválido o vencido
  }
}

// ─────────────────────────────────────────────────────────────
// 5. ARRANCAR EL SERVIDOR
// ─────────────────────────────────────────────────────────────
async function main() {
  await mongoose.connect(process.env.MONGO_URL)
  console.log('✅ Conectado a MongoDB')

  const server = new ApolloServer({ typeDefs, resolvers })

  const { url } = await startStandaloneServer(server, {
    listen:  { port: 4001 },
    context
  })

  console.log(`🚀 GraphQL corriendo en ${url}`)
  console.log(`🎮 Abrí el Sandbox en: ${url}`)
  console.log('')
  console.log('── Ejemplo de queries para probar en el Sandbox ──')
  console.log(`
  # 1. Registrar un usuario
  mutation {
    register(nombre: "Juan", email: "juan@test.com", password: "123456") {
      token
      usuario { nombre email }
    }
  }

  # 2. Iniciar sesión
  mutation {
    login(email: "juan@test.com", password: "123456") {
      token
      usuario { nombre }
    }
  }

  # 3. Ver mis datos (necesita el token en el header)
  # Header: Authorization: Bearer <el token>
  query {
    me { id nombre email }
  }

  # 4. Listar usuarios (necesita el token)
  # Header: Authorization: Bearer <el token>
  query {
    usuarios { id nombre email creadoEn }
  }

  # 5. Pedir SOLO los campos que necesitás (esto es lo único de GraphQL)
  query {
    usuarios { nombre }
  }
  `)
}

main().catch(err => {
  console.error('❌ Error:', err.message)
  process.exit(1)
})
