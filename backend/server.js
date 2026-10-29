const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

require('dotenv').config({
  path: path.join(__dirname, '.env')
});

const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const jwt = require('jsonwebtoken');


console.log(
  'Password cargada correctamente:',
  process.env.DB_PASSWORD ? 'SÍ' : 'NO'
);

const app = express();

app.use(cors());
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error('Falta configurar JWT_SECRET en el archivo .env');
}

function autenticarToken(req, res, next) {
  const encabezado = req.headers.authorization;

  if (!encabezado || !encabezado.startsWith('Bearer ')) {
    return res.status(401).json({
      exito: false,
      mensaje: 'Debes iniciar sesión para acceder a este recurso.'
    });
  }

  const token = encabezado.slice(7).trim();

  try {
    const datos = jwt.verify(token, JWT_SECRET);

    if (!datos.id || !datos.rol) {
      return res.status(401).json({
        exito: false,
        mensaje: 'El token no contiene los datos necesarios.'
      });
    }

    req.usuario = {
      id: datos.id,
      rol: datos.rol
    };

    next();
  } catch (error) {
    return res.status(401).json({
      exito: false,
      mensaje: 'La sesión no es válida o ha caducado.'
    });
  }
}

function soloAdministrador(req, res, next) {
  const rol = String(req.usuario?.rol || '').toLowerCase();

  if (!['admin', 'administrador'].includes(rol)) {
    return res.status(403).json({
      exito: false,
      mensaje: 'No tienes permisos de administrador.'
    });
  }

  next();
}


if (!JWT_SECRET) {
  throw new Error('Falta configurar JWT_SECRET en el archivo .env');
}

function autenticarToken(req, res, next) {
  const encabezado = req.headers.authorization;

  if (!encabezado || !encabezado.startsWith('Bearer ')) {
    return res.status(401).json({
      exito: false,
      mensaje: 'Debes iniciar sesión para acceder a este recurso.'
    });
  }

  const token = encabezado.slice(7).trim();

  try {
    const datos = jwt.verify(token, JWT_SECRET);

    if (!datos.id || !datos.rol) {
      return res.status(401).json({
        exito: false,
        mensaje: 'El token no contiene los datos necesarios.'
      });
    }

    req.usuario = {
      id: datos.id,
      rol: datos.rol
    };

    next();
  } catch (error) {
    return res.status(401).json({
      exito: false,
      mensaje: 'La sesión no es válida o ha caducado.'
    });
  }
}

function soloAdministrador(req, res, next) {
  const rol = String(req.usuario?.rol || '').trim().toLowerCase();

  if (rol !== 'admin' && rol !== 'administrador') {
    return res.status(403).json({
      exito: false,
      mensaje: 'Acceso exclusivo para administradores'
    });
  }

  next();
}

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT
});


const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  },
  tls: {
    minVersion: 'TLSv1.2'
  }
});



// =========================================================================
// RUTA DE PRUEBA
// =========================================================================

app.get('/', (req, res) => {
  res.send('Servidor de Node.js funcionando correctamente');
});

// =========================================================================
// RUTAS DE USUARIOS Y AUTENTICACIÓN
// =========================================================================


app.post('/api/login', async (req, res) => {
  const { usuario, password } = req.body;

  try {
    const result = await pool.query(
      `SELECT id, nombre, email, rol, password_hash
       FROM usuarios
       WHERE nombre = $1 OR email = $1`,
      [usuario]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        exito: false,
        mensaje: 'Usuario o contraseña incorrectos'
      });
    }

    const user = result.rows[0];
    const match = await bcrypt.compare(password, user.password_hash);

    if (!match) {
      return res.status(401).json({
        exito: false,
        mensaje: 'Usuario o contraseña incorrectos'
      });
    }

    delete user.password_hash;

    const token = jwt.sign(
      {
        id: user.id,
        rol: user.rol
      },
      JWT_SECRET,
      {
        expiresIn: process.env.JWT_EXPIRES_IN || '2h'
      }
    );

    return res.json({
      exito: true,
      mensaje: 'Inicio de sesión exitoso',
      token,
      usuario: user
    });

  } catch (error) {
    console.error('Error durante el login:', error);

    return res.status(500).json({
      exito: false,
      mensaje: 'Error en el servidor'
    });
  }
});


app.get('/api/perfil/:id', autenticarToken, async (req, res) => {
  const usuarioSolicitado = Number(req.params.id);
  const usuarioAutenticado = Number(req.usuario.id);

  const esAdmin = ['admin', 'administrador'].includes(
    String(req.usuario.rol).toLowerCase()
  );

  if (
    usuarioSolicitado !== usuarioAutenticado &&
    !esAdmin
  ) {
    return res.status(403).json({
      exito: false,
      mensaje: 'No tienes permiso para consultar este perfil.'
    });
  }

  const { id } = req.params;

  try {
    const result = await pool.query(
      `SELECT
         u.id,
         u.nombre,
         u.email,
         u.rol,
         p.telefono,
         COALESCE(p.puesto, u.rol) AS puesto,
         p.departamento,
         p.fecha_ingreso,
         p.foto_url
       FROM usuarios u
       LEFT JOIN perfiles p ON u.id = p.usuario_id
       WHERE u.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        exito: false,
        mensaje: 'Usuario no encontrado'
      });
    }

    return res.json({
      exito: true,
      perfil: result.rows[0]
    });
  } catch (error) {
    console.error('Error al obtener el perfil:', error);

    return res.status(500).json({
      exito: false,
      mensaje: 'Error en el servidor al obtener el perfil'
    });
  }
});

app.get('/api/usuarios', autenticarToken, soloAdministrador, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
         u.id,
         u.nombre,
         u.email,
         u.rol,
         p.puesto,
         p.departamento
       FROM usuarios u
       LEFT JOIN perfiles p ON u.id = p.usuario_id
       ORDER BY u.id ASC`
    );

    return res.json({
      exito: true,
      usuarios: result.rows
    });
  } catch (error) {
    console.error('Error al obtener la lista de usuarios:', error);

    return res.status(500).json({
      exito: false,
      mensaje: 'Error al consultar usuarios'
    });
  }
});

app.post('/api/usuarios/registrar', autenticarToken, soloAdministrador, async (req, res) => {
  const {
    nombre,
    email,
    password,
    rol,
    puesto,
    departamento,
    telefono
  } = req.body;

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const hash = await bcrypt.hash(password, 10);

    const resUsuario = await client.query(
      `INSERT INTO usuarios (nombre, email, password_hash, rol)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [nombre, email, hash, rol || 'usuario']
    );

    const nuevoUsuarioId = resUsuario.rows[0].id;

    await client.query(
      `INSERT INTO perfiles (
         usuario_id,
         telefono,
         puesto,
         departamento,
         fecha_ingreso
       )
       VALUES ($1, $2, $3, $4, CURRENT_DATE)`,
      [
        nuevoUsuarioId,
        telefono || null,
        puesto || null,
        departamento || null
      ]
    );

    await client.query('COMMIT');

    return res.json({
      exito: true,
      mensaje: 'Usuario registrado correctamente',
      usuarioId: nuevoUsuarioId
    });
  } catch (error) {
    await client.query('ROLLBACK');

    console.error('Error al registrar usuario:', error);

    if (error.code === '23505') {
      return res.status(400).json({
        exito: false,
        mensaje: 'El correo electrónico ya está registrado.'
      });
    }

    return res.status(500).json({
      exito: false,
      mensaje: 'Error interno en el servidor al crear usuario.'
    });
  } finally {
    client.release();
  }
});

app.delete('/api/usuarios/:id', autenticarToken, soloAdministrador, async (req, res) => {
  const { id } = req.params;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    await client.query(
      'DELETE FROM perfiles WHERE usuario_id = $1',
      [id]
    );

    const result = await client.query(
      'DELETE FROM usuarios WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rowCount === 0) {
      await client.query('ROLLBACK');

      return res.status(404).json({
        exito: false,
        mensaje: 'Usuario no encontrado'
      });
    }

    await client.query('COMMIT');

    return res.json({
      exito: true,
      mensaje: 'Usuario eliminado correctamente'
    });
  } catch (error) {
    await client.query('ROLLBACK');

    console.error('Error al eliminar usuario:', error);

    return res.status(500).json({
      exito: false,
      mensaje: 'Error al eliminar el usuario en la base de datos'
    });
  } finally {
    client.release();
  }
});

// =========================================================================
// CAMBIAR CONTRASEÑA DE UN USUARIO (SOLO ADMINISTRADORES)
// =========================================================================

app.put(
  '/api/usuarios/:id/password',
  autenticarToken,
  soloAdministrador,
  async (req, res) => {
    try {
      const id = Number(req.params.id);
      const { nuevaPassword } = req.body;

      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({
          exito: false,
          mensaje: 'El ID del usuario no es válido.'
        });
      }

      if (
        typeof nuevaPassword !== 'string' ||
        nuevaPassword.length < 8 ||
        nuevaPassword.trim().length < 8
      ) {
        return res.status(400).json({
          exito: false,
          mensaje: 'La contraseña debe tener al menos 8 caracteres.'
        });
      }

      const resultado = await pool.query(
        'SELECT id FROM usuarios WHERE id = $1',
        [id]
      );

      if (resultado.rowCount === 0) {
        return res.status(404).json({
          exito: false,
          mensaje: 'El usuario no existe.'
        });
      }

      const passwordHash = await bcrypt.hash(nuevaPassword, 10);

      await pool.query(
        `UPDATE usuarios
         SET password_hash = $1
         WHERE id = $2`,
        [passwordHash, id]
      );

      return res.status(200).json({
        exito: true,
        mensaje: 'La contraseña se cambió correctamente.'
      });
    } catch (error) {
      console.error(
        'Error al cambiar la contraseña del usuario:',
        error
      );

      return res.status(500).json({
        exito: false,
        mensaje: 'No se pudo cambiar la contraseña.'
      });
    }
  }
);

// =========================================================================
// ENCUESTAS
// =========================================================================

// 1. Obtener todas las encuestas, incluyendo la fecha límite.

app.get('/api/encuestas', async (req, res) => {
  const usuarioId = req.query.usuario_id;

  try {
    const query = `
      SELECT
        e.id,
        e.titulo,
        e.descripcion,
        e.estado,
        e.fecha_cierre,
        TO_CHAR(e.fecha_creacion, 'DD/MM/YYYY') AS "fechaCreacion",
        COUNT(DISTINCT p.id)::INT AS "preguntasCount",
        COUNT(DISTINCT re.id)::INT AS "respuestasCount",
        CASE 
          WHEN $1::int IS NOT NULL THEN 
            EXISTS(SELECT 1 FROM respuestas_encuesta r WHERE r.encuesta_id = e.id AND r.usuario_id = $1::int)
          ELSE FALSE
        END AS "yaRespondida"
      FROM encuestas e
      LEFT JOIN preguntas p ON e.id = p.encuesta_id
      LEFT JOIN respuestas_encuesta re ON e.id = re.encuesta_id
      GROUP BY e.id
      ORDER BY e.fecha_creacion DESC;
    `;

    const result = await pool.query(query, [usuarioId || null]);

    return res.json({
      exito: true,
      encuestas: result.rows
    });
  } catch (error) {
    console.error('Error al obtener encuestas:', error);

    return res.status(500).json({
      exito: false,
      mensaje: 'Error al consultar las encuestas'
    });
  }
});

// 2. Obtener una encuesta con sus preguntas y opciones.

app.get('/api/encuestas/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const encuestaRes = await pool.query(
      'SELECT * FROM encuestas WHERE id = $1',
      [id]
    );

    if (encuestaRes.rows.length === 0) {
      return res.status(404).json({
        exito: false,
        mensaje: 'Encuesta no encontrada'
      });
    }

    const preguntasRes = await pool.query(
      `SELECT id, texto_pregunta, tipo_respuesta, orden
       FROM preguntas
       WHERE encuesta_id = $1
       ORDER BY orden ASC`,
      [id]
    );

    const preguntas = preguntasRes.rows;

    for (const pregunta of preguntas) {
      if (pregunta.tipo_respuesta === 'opcion') {
        const opcionesRes = await pool.query(
          `SELECT id, texto_opcion
           FROM opciones_pregunta
           WHERE pregunta_id = $1`,
          [pregunta.id]
        );

        pregunta.opciones = opcionesRes.rows;
      }
    }

    return res.json({
      exito: true,
      encuesta: {
        ...encuestaRes.rows[0],
        preguntas
      }
    });
  } catch (error) {
    console.error('Error al obtener detalle de encuesta:', error);

    return res.status(500).json({
      exito: false,
      mensaje: 'Error al cargar el detalle de la encuesta'
    });
  }
});

// 3. Crear una encuesta con fecha límite, preguntas y opciones.

app.post('/api/encuestas', autenticarToken, soloAdministrador, async (req, res) => {
  const {
    titulo,
    descripcion,
    creado_por,
    preguntas,
    fecha_cierre
  } = req.body;

  if (typeof titulo !== 'string' || !titulo.trim()) {
    return res.status(400).json({
      exito: false,
      mensaje: 'El título de la encuesta es obligatorio.'
    });
  }

  let fechaCierreValida = null;

  if (
    fecha_cierre !== undefined &&
    fecha_cierre !== null &&
    fecha_cierre !== ''
  ) {
    const fecha = new Date(fecha_cierre);

    if (Number.isNaN(fecha.getTime())) {
      return res.status(400).json({
        exito: false,
        mensaje: 'La fecha de cierre no es válida.'
      });
    }

    if (fecha.getTime() <= Date.now()) {
      return res.status(400).json({
        exito: false,
        mensaje: 'La fecha de cierre debe ser futura.'
      });
    }

    fechaCierreValida = fecha.toISOString();
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const encuestaResult = await client.query(
      `INSERT INTO encuestas (
         titulo,
         descripcion,
         creado_por,
         fecha_cierre
       )
       VALUES ($1, $2, $3, $4)
       RETURNING
         id,
         titulo,
         descripcion,
         estado,
         fecha_creacion,
         fecha_cierre`,
      [
        titulo.trim(),
        descripcion || '',
        creado_por || null,
        fechaCierreValida
      ]
    );

    const nuevaEncuesta = encuestaResult.rows[0];

    if (preguntas !== undefined && !Array.isArray(preguntas)) {
      throw new Error('El formato de las preguntas no es válido.');
    }

    if (Array.isArray(preguntas)) {
      for (let i = 0; i < preguntas.length; i++) {
        const p = preguntas[i];

        if (
          !p ||
          typeof p.texto_pregunta !== 'string' ||
          !p.texto_pregunta.trim() ||
          !['opcion', 'escala', 'texto'].includes(p.tipo_respuesta)
        ) {
          throw new Error(`La pregunta ${i + 1} no es válida.`);
        }

        if (
          p.tipo_respuesta === 'opcion' &&
          (
            !Array.isArray(p.opciones) ||
            p.opciones.length === 0 ||
            p.opciones.some(
              opcion =>
                typeof opcion !== 'string' ||
                !opcion.trim()
            )
          )
        ) {
          throw new Error(
            `La pregunta ${i + 1} necesita opciones válidas.`
          );
        }

        const preguntaResult = await client.query(
          `INSERT INTO preguntas (
             encuesta_id,
             texto_pregunta,
             tipo_respuesta,
             orden
           )
           VALUES ($1, $2, $3, $4)
           RETURNING id`,
          [
            nuevaEncuesta.id,
            p.texto_pregunta.trim(),
            p.tipo_respuesta,
            i + 1
          ]
        );

        if (
          p.tipo_respuesta === 'opcion' &&
          Array.isArray(p.opciones)
        ) {
          for (const opcionTexto of p.opciones) {
            await client.query(
              `INSERT INTO opciones_pregunta (
                 pregunta_id,
                 texto_opcion
               )
               VALUES ($1, $2)`,
              [
                preguntaResult.rows[0].id,
                opcionTexto.trim()
              ]
            );
          }
        }
      }
    }

    await client.query('COMMIT');

    return res.status(201).json({
      exito: true,
      mensaje: 'Encuesta creada con éxito',
      encuesta: nuevaEncuesta
    });
  } catch (error) {
    await client.query('ROLLBACK');

    console.error('Error al crear encuesta:', error);

    return res.status(400).json({
      exito: false,
      mensaje: error.message || 'Error al guardar la encuesta.'
    });
  } finally {
    client.release();
  }
});

// 4. Guardar respuestas únicamente si la encuesta sigue abierta.

app.post('/api/encuestas/:id/respuestas', autenticarToken, async (req, res) => {
  const encuesta_id = req.params.id;
const usuario_id = req.usuario.id;
const { respuestas } = req.body;

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const encuestaResult = await client.query(
      `SELECT
         id,
         fecha_cierre,
         (
           fecha_cierre IS NOT NULL
           AND fecha_cierre <= clock_timestamp()
         ) AS vencida
       FROM encuestas
       WHERE id = $1
       FOR UPDATE`,
      [encuesta_id]
    );

    if (encuestaResult.rows.length === 0) {
      await client.query('ROLLBACK');

      return res.status(404).json({
        exito: false,
        mensaje: 'La encuesta no existe.'
      });
    }

    if (encuestaResult.rows[0].vencida) {
      await client.query('ROLLBACK');

      return res.status(403).json({
        exito: false,
        vencida: true,
        mensaje: 'El tiempo para responder esta encuesta ha terminado.'
      });
    }

    if (!Array.isArray(respuestas) || respuestas.length === 0) {
      await client.query('ROLLBACK');

      return res.status(400).json({
        exito: false,
        mensaje: 'Debes proporcionar las respuestas de la encuesta.'
      });
    }

    // Comprobar que las preguntas pertenezcan a esta encuesta.
    const preguntasIds = respuestas.map(r => r?.pregunta_id);

    if (
      preguntasIds.some(id => id === undefined || id === null) ||
      new Set(preguntasIds.map(String)).size !== preguntasIds.length
    ) {
      await client.query('ROLLBACK');

      return res.status(400).json({
        exito: false,
        mensaje: 'Las preguntas enviadas no son válidas.'
      });
    }

    const preguntasValidas = await client.query(
      `SELECT id, tipo_respuesta
       FROM preguntas
       WHERE encuesta_id = $1
         AND id = ANY($2::int[])`,
      [encuesta_id, preguntasIds]
    );

    if (preguntasValidas.rowCount !== preguntasIds.length) {
      await client.query('ROLLBACK');

      return res.status(400).json({
        exito: false,
        mensaje: 'Una o más preguntas no pertenecen a esta encuesta.'
      });
    }

    const mapaPreguntas = new Map(
      preguntasValidas.rows.map(p => [String(p.id), p])
    );

    // Validar que cada respuesta corresponda al tipo de pregunta.
    for (const r of respuestas) {
      const pregunta = mapaPreguntas.get(String(r.pregunta_id));

      if (!pregunta) {
        await client.query('ROLLBACK');

        return res.status(400).json({
          exito: false,
          mensaje: 'Se encontró una pregunta no válida.'
        });
      }

      if (
        pregunta.tipo_respuesta === 'opcion' &&
        (r.opcion_id === undefined || r.opcion_id === null)
      ) {
        await client.query('ROLLBACK');

        return res.status(400).json({
          exito: false,
          mensaje: 'Debes seleccionar una opción para cada pregunta requerida.'
        });
      }

      if (
        pregunta.tipo_respuesta === 'escala' &&
        (
          r.valor_numero === undefined ||
          r.valor_numero === null ||
          r.valor_numero === ''
        )
      ) {
        await client.query('ROLLBACK');

        return res.status(400).json({
          exito: false,
          mensaje: 'Debes proporcionar una calificación para cada pregunta requerida.'
        });
      }

      if (
        pregunta.tipo_respuesta === 'texto' &&
        (
          typeof r.valor_texto !== 'string' ||
          !r.valor_texto.trim()
        )
      ) {
        await client.query('ROLLBACK');

        return res.status(400).json({
          exito: false,
          mensaje: 'Debes responder las preguntas de texto requeridas.'
        });
      }

      if (
        pregunta.tipo_respuesta === 'escala' &&
        !Number.isFinite(Number(r.valor_numero))
      ) {
        await client.query('ROLLBACK');

        return res.status(400).json({
          exito: false,
          mensaje: 'Una de las calificaciones no es válida.'
        });
      }

      if (pregunta.tipo_respuesta === 'opcion') {
        const opcionValida = await client.query(
          `SELECT id
           FROM opciones_pregunta
           WHERE id = $1
             AND pregunta_id = $2`,
          [r.opcion_id, r.pregunta_id]
        );

        if (opcionValida.rowCount === 0) {
          await client.query('ROLLBACK');

          return res.status(400).json({
            exito: false,
            mensaje: 'Una opción seleccionada no pertenece a su pregunta.'
          });
        }
      }
    }

    const resCabecera = await client.query(
      `INSERT INTO respuestas_encuesta (encuesta_id, usuario_id)
       VALUES ($1, $2)
       RETURNING id`,
      [encuesta_id, usuario_id || null]
    );

    const respuestaEncuestaId = resCabecera.rows[0].id;

    for (const r of respuestas) {
      const pregunta = mapaPreguntas.get(String(r.pregunta_id));

      const opcionId =
        pregunta.tipo_respuesta === 'opcion'
          ? r.opcion_id
          : null;

      const valorNumero =
        pregunta.tipo_respuesta === 'escala'
          ? Number(r.valor_numero)
          : null;

      const valorTexto =
        pregunta.tipo_respuesta === 'texto'
          ? r.valor_texto.trim()
          : null;

      await client.query(
        `INSERT INTO detalle_respuestas (
           respuesta_encuesta_id,
           pregunta_id,
           opcion_id,
           valor_numero,
           valor_texto
         )
         VALUES ($1, $2, $3, $4, $5)`,
        [
          respuestaEncuestaId,
          r.pregunta_id,
          opcionId,
          valorNumero,
          valorTexto
        ]
      );
    }

    await client.query('COMMIT');

    return res.status(201).json({
      exito: true,
      mensaje: 'Respuestas guardadas con éxito'
    });
  } catch (error) {
    await client.query('ROLLBACK');

    console.error('Error al responder encuesta:', error);

    return res.status(500).json({
      exito: false,
      mensaje: 'Error al registrar tus respuestas'
    });
  } finally {
    client.release();
  }
});

// =========================================================================
// PROPUESTAS
// =========================================================================

app.post('/api/propuestas', autenticarToken, async (req, res) => {
  const usuario_id = req.usuario.id;
  const { titulo, descripcion } = req.body;

  if (
    typeof titulo !== 'string' ||
    !titulo.trim() ||
    typeof descripcion !== 'string' ||
    !descripcion.trim()
  ) {
    return res.status(400).json({
      exito: false,
      mensaje: 'El título y la descripción son requeridos.'
    });
  }

  try {
    const result = await pool.query(
      `INSERT INTO propuestas (usuario_id, titulo, descripcion)
       VALUES ($1, $2, $3)
       RETURNING id, usuario_id, titulo, descripcion, fecha`,
      [usuario_id || null, titulo.trim(), descripcion.trim()]
    );

    return res.status(201).json({
      exito: true,
      mensaje: 'Propuesta enviada',
      propuesta: result.rows[0]
    });
  } catch (error) {
    console.error('Error al registrar la propuesta:', error);

    return res.status(500).json({
      exito: false,
      mensaje: 'Error interno del servidor al registrar la propuesta'
    });
  }
});

app.get('/api/propuestas', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
         p.id,
         p.usuario_id,
         p.titulo,
         p.descripcion,
         p.fecha,
         COALESCE(u.nombre, 'Anónimo') AS usuario_nombre
       FROM propuestas p
       LEFT JOIN usuarios u ON p.usuario_id = u.id
       ORDER BY p.fecha DESC`
    );

    return res.json({
      exito: true,
      propuestas: result.rows
    });
  } catch (error) {
    console.error('Error al obtener la lista de propuestas:', error);

    return res.status(500).json({
      exito: false,
      mensaje: 'Error interno del servidor al consultar las propuestas'
    });
  }
});

// =========================================================================
// CHATBOT CON CLOUDFLARE WORKERS AI
// =========================================================================

app.post('/api/chatbot', autenticarToken, async (req, res) => {
  const { mensaje, historial } = req.body;

  if (
    typeof mensaje !== 'string' ||
    !mensaje.trim()
  ) {
    return res.status(400).json({
      exito: false,
      mensaje: 'El mensaje es obligatorio y no puede estar vacío.'
    });
  }

  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;

  if (!accountId || !apiToken) {
    console.error('Faltan las credenciales de Cloudflare.');

    return res.status(500).json({
      exito: false,
      mensaje: 'La configuración de Cloudflare Workers AI está incompleta.'
    });
  }

  try {
    const messages = [
      {
        role: 'system',
        content: `Eres el asistente virtual de una plataforma de bienestar organizacional.

Tu objetivo es ayudar a los colaboradores y administradores a mejorar su bienestar y ambiente laboral.

Puedes ayudar con:
- Bienestar laboral y emocional.
- Clima organizacional.
- Estrés laboral.
- Comunicación entre compañeros.
- Satisfacción de los colaboradores.
- Encuestas de bienestar.
- Propuestas de mejora.
- Resolución de conflictos laborales.
- Equilibrio entre trabajo y vida personal.
- Recomendaciones para mejorar la organización.

INSTRUCCIONES:
1. Responde siempre en español.
2. Sé amable, respetuoso y profesional.
3. Explica las cosas de manera sencilla y clara.
4. Mantén el contexto usando el historial.
5. No inventes estadísticas ni información de la empresa.
6. No afirmes que consultaste bases de datos si no se proporcionaron esos datos.
7. Proporciona recomendaciones concretas y realistas.
8. Si falta información, solicita los datos necesarios.
9. Evita respuestas innecesariamente largas.
10. Orienta la conversación hacia el bienestar organizacional.`
      }
    ];

    if (Array.isArray(historial)) {
      historial.slice(-10).forEach(h => {
        if (!h || typeof h !== 'object') {
          return;
        }

        const texto =
          h.text ||
          h.content ||
          (
            Array.isArray(h.parts) && h.parts[0]
              ? h.parts[0].text
              : ''
          );

        if (typeof texto !== 'string' || !texto.trim()) {
          return;
        }

        let rol;

        if (h.role === 'user') {
          rol = 'user';
        } else if (
          h.role === 'model' ||
          h.role === 'assistant'
        ) {
          rol = 'assistant';
        } else {
          return;
        }

        messages.push({
          role: rol,
          content: texto.trim()
        });
      });
    }

    messages.push({
      role: 'user',
      content: mensaje.trim()
    });

    const respuestaCloudflare = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/@cf/meta/llama-3.1-8b-instruct`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messages,
          max_tokens: 1000,
          temperature: 0.7
        })
      }
    );

    const datosCloudflare = await respuestaCloudflare.json();

    if (!respuestaCloudflare.ok || !datosCloudflare.success) {
      console.error(
        'Error de Cloudflare Workers AI:',
        datosCloudflare.errors || datosCloudflare
      );

      return res.status(502).json({
        exito: false,
        mensaje: 'No se pudo generar una respuesta. Inténtalo nuevamente.'
      });
    }

    const respuestaIA = datosCloudflare.result?.response;

    if (
      typeof respuestaIA !== 'string' ||
      !respuestaIA.trim()
    ) {
      console.error(
        'Cloudflare no devolvió una respuesta válida:',
        datosCloudflare
      );

      return res.status(502).json({
        exito: false,
        mensaje: 'La inteligencia artificial no devolvió una respuesta válida.'
      });
    }

    return res.json({
      exito: true,
      respuesta: respuestaIA.trim()
    });
  } catch (error) {
    console.error('Error en el chatbot con Cloudflare:', error);

    return res.status(500).json({
      exito: false,
      mensaje: 'Error interno del servidor al procesar el mensaje.'
    });
  }
});

// =========================================================================
// ANALIZAR RESULTADOS DE ENCUESTA CON CLOUDFLARE WORKERS AI
// =========================================================================

app.get('/api/encuestas/:id/analizar-ia', autenticarToken, soloAdministrador, async (req, res) => {
  const { id } = req.params;

  try {
    const encuestaQuery = await pool.query(
      'SELECT * FROM encuestas WHERE id = $1',
      [id]
    );

    if (encuestaQuery.rows.length === 0) {
      return res.status(404).json({
        exito: false,
        mensaje: 'Encuesta no encontrada'
      });
    }

    const encuesta = encuestaQuery.rows[0];

    const preguntasQuery = await pool.query(
      `SELECT id, texto_pregunta, tipo_respuesta
       FROM preguntas
       WHERE encuesta_id = $1`,
      [id]
    );

    const respuestasQuery = await pool.query(
      `SELECT
         dr.pregunta_id,
         dr.valor_numero,
         dr.valor_texto,
         dr.opcion_id,
         op.texto_opcion
       FROM respuestas_encuesta re
       JOIN detalle_respuestas dr
         ON re.id = dr.respuesta_encuesta_id
       LEFT JOIN opciones_pregunta op
         ON dr.opcion_id = op.id
       WHERE re.encuesta_id = $1`,
      [id]
    );

    if (respuestasQuery.rows.length < 3) {
      return res.status(400).json({
        exito: false,
        mensaje: 'Aún no hay suficientes respuestas registradas para esta encuesta.'
      });
    }

    const datosProcesados = {
      titulo: encuesta.titulo,
      descripcion: encuesta.descripcion,
      total_respuestas: respuestasQuery.rows.length,
      preguntas: preguntasQuery.rows.map(p => ({
        id: p.id,
        texto: p.texto_pregunta,
        tipo: p.tipo_respuesta
      })),
      respuestas: respuestasQuery.rows.map(r => ({
        pregunta_id: r.pregunta_id,
        calificacion_estrellas: r.valor_numero,
        comentario_abierto: r.valor_texto,
        opcion_seleccionada: r.texto_opcion
      }))
    };

    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
    const apiToken = process.env.CLOUDFLARE_API_TOKEN;

    if (!accountId || !apiToken) {
      return res.status(500).json({
        exito: false,
        mensaje: 'Faltan las variables CLOUDFLARE_ACCOUNT_ID o CLOUDFLARE_API_TOKEN en el archivo .env.'
      });
    }

    const prompt = `
Analiza los resultados de esta encuesta de bienestar organizacional.

Datos de la encuesta:
${JSON.stringify(datosProcesados)}

Genera un análisis profesional, objetivo y útil para una organización.
Utiliza exclusivamente los datos proporcionados. No inventes resultados.

La puntuación promedio debe calcularse únicamente con las respuestas
numéricas disponibles y compatibles con una escala de calificación.
Si no se puede calcular, utiliza "N/A".

El sentimiento predominante debe ser "Positivo", "Neutro" o "Negativo",
según las respuestas disponibles.

Devuelve el resultado en español con los campos solicitados.
`;

    const respuestaCloudflare = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/@cf/meta/llama-3.1-8b-instruct`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messages: [
            {
              role: 'system',
              content: `Eres un analista experto en bienestar organizacional.
Devuelve únicamente un objeto JSON válido, sin Markdown ni explicaciones adicionales.
La estructura debe ser:
{
  "resumen_ejecutivo": "texto",
  "sentimiento_predominante": "Positivo, Neutro o Negativo",
  "puntuacion_promedio": "valor o N/A",
  "hallazgos_clave": ["texto"],
  "areas_criticas": ["texto"],
  "plan_de_accion": ["texto"]
}`
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          response_format: {
            type: 'json_schema',
            json_schema: {
              type: 'object',
              properties: {
                resumen_ejecutivo: {
                  type: 'string'
                },
                sentimiento_predominante: {
                  type: 'string',
                  enum: ['Positivo', 'Neutro', 'Negativo']
                },
                puntuacion_promedio: {
                  type: 'string'
                },
                hallazgos_clave: {
                  type: 'array',
                  items: { type: 'string' }
                },
                areas_criticas: {
                  type: 'array',
                  items: { type: 'string' }
                },
                plan_de_accion: {
                  type: 'array',
                  items: { type: 'string' }
                }
              },
              required: [
                'resumen_ejecutivo',
                'sentimiento_predominante',
                'puntuacion_promedio',
                'hallazgos_clave',
                'areas_criticas',
                'plan_de_accion'
              ]
            }
          },
          max_tokens: 1500,
          temperature: 0.1
        })
      }
    );

    const datosCloudflare = await respuestaCloudflare.json();

    if (!respuestaCloudflare.ok || !datosCloudflare.success) {
      console.error(
        'Error de Cloudflare Workers AI:',
        datosCloudflare.errors || respuestaCloudflare.status
      );

      return res.status(502).json({
        exito: false,
        mensaje: 'Cloudflare no pudo generar el análisis. Revisa los errores del backend.'
      });
    }

    const textoIA = datosCloudflare.result?.response;

    if (!textoIA) {
      console.error('Cloudflare no devolvió texto:', datosCloudflare);

      return res.status(502).json({
        exito: false,
        mensaje: 'Cloudflare devolvió una respuesta vacía.'
      });
    }

    let analisisJSON;

    try {
      let textoLimpio = typeof textoIA === 'string'
        ? textoIA.trim()
        : textoIA;

      if (typeof textoLimpio === 'string') {
        textoLimpio = textoLimpio
          .replace(/^```json\s*/i, '')
          .replace(/^```\s*/i, '')
          .replace(/\s*```$/i, '')
          .trim();

        try {
          analisisJSON = JSON.parse(textoLimpio);
        } catch {
          const inicio = textoLimpio.indexOf('{');
          const final = textoLimpio.lastIndexOf('}');

          if (inicio === -1 || final <= inicio) {
            throw new Error('No se encontró un objeto JSON completo.');
          }

          analisisJSON = JSON.parse(
            textoLimpio.substring(inicio, final + 1)
          );
        }
      } else if (
        textoLimpio &&
        typeof textoLimpio === 'object'
      ) {
        analisisJSON = textoLimpio;
      } else {
        throw new Error('La respuesta no contiene un objeto JSON.');
      }

      const camposRequeridos = [
        'resumen_ejecutivo',
        'sentimiento_predominante',
        'puntuacion_promedio',
        'hallazgos_clave',
        'areas_criticas',
        'plan_de_accion'
      ];

      const faltantes = camposRequeridos.filter(
        campo => !Object.prototype.hasOwnProperty.call(
          analisisJSON,
          campo
        )
      );

      if (faltantes.length > 0) {
        throw new Error(
          `Faltan campos: ${faltantes.join(', ')}`
        );
      }

      if (
        !Array.isArray(analisisJSON.hallazgos_clave) ||
        !Array.isArray(analisisJSON.areas_criticas) ||
        !Array.isArray(analisisJSON.plan_de_accion)
      ) {
        throw new Error(
          'Los hallazgos, áreas críticas y plan de acción deben ser arreglos.'
        );
      }
    } catch (error) {
      console.error(
        'Error al interpretar la respuesta de Cloudflare:',
        error.message
      );

      console.error('Respuesta original de la IA:', textoIA);

      return res.status(502).json({
        exito: false,
        mensaje: 'La IA devolvió una respuesta incompleta o con formato inválido. Revisa la terminal del backend.'
      });
    }

    return res.json({
      exito: true,
      analisis: analisisJSON
    });
  } catch (error) {
    console.error(
      'Error al analizar la encuesta con Cloudflare:',
      error
    );

    return res.status(500).json({
      exito: false,
      mensaje: 'Error interno al procesar el análisis de la encuesta.'
    });
  }
});

// =========================================================================
// ANALIZAR VIABILIDAD DE UNA PROPUESTA CON CLOUDFLARE WORKERS AI
// =========================================================================

app.post('/api/analizar-viabilidad', autenticarToken, async (req, res) => {
  const { titulo, descripcion } = req.body;

  const tituloValido =
    typeof titulo === 'string' && titulo.trim();

  const descripcionValida =
    typeof descripcion === 'string' && descripcion.trim();

  if (!tituloValido && !descripcionValida) {
    return res.status(400).json({
      exito: false,
      mensaje: 'Se requiere un título o descripción para analizar la propuesta.'
    });
  }

  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;

  if (!accountId || !apiToken) {
    return res.status(500).json({
      exito: false,
      mensaje: 'Faltan las credenciales de Cloudflare Workers AI en el archivo .env.'
    });
  }

  try {
    const prompt = `
Eres un consultor experto en proyectos y bienestar organizacional.

Evalúa la siguiente propuesta de mejora presentada por un colaborador.

Título: ${tituloValido ? titulo.trim() : 'Sin título'}
Descripción: ${descripcionValida ? descripcion.trim() : 'Sin descripción'}

Analiza:
1. Viabilidad general.
2. Beneficios para los colaboradores y la organización.
3. Riesgos y dificultades.
4. Recursos necesarios.
5. Recomendaciones para implementarla.
6. Información adicional necesaria para evaluar mejor la propuesta.

Distingue los datos proporcionados de las suposiciones.
No inventes presupuestos, estadísticas ni información que no se haya proporcionado.
La evaluación es orientativa y no sustituye un estudio técnico o financiero.

Responde en español, de forma clara y profesional.
`;

    const respuesta = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/@cf/meta/llama-3.1-8b-instruct`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messages: [
            {
              role: 'system',
              content: 'Evalúa propuestas organizacionales con objetividad. No afirmes que una propuesta es viable sin considerar sus limitaciones.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 1000,
          temperature: 0.3
        })
      }
    );

    const datos = await respuesta.json();

    if (!respuesta.ok || !datos.success) {
      console.error(
        'Error de Cloudflare Workers AI:',
        datos.errors || datos
      );

      return res.status(502).json({
        exito: false,
        mensaje: 'No se pudo generar el análisis con Cloudflare Workers AI. Verifica el modelo, los permisos del token y los límites de uso.'
      });
    }

    const resumenIA = datos.result?.response;

    if (!resumenIA) {
      return res.status(502).json({
        exito: false,
        mensaje: 'La IA no devolvió un análisis. Inténtalo nuevamente.'
      });
    }

    return res.json({
      exito: true,
      resumen: resumenIA
    });
  } catch (error) {
    console.error(
      'Error al analizar la viabilidad con Cloudflare:',
      error.message
    );

    return res.status(500).json({
      exito: false,
      mensaje: 'Ocurrió un error al procesar el análisis de viabilidad.'
    });
  }
});

// =========================================================================
// Generason de codigo  de verificacion
// =========================================================================

const generarHashCodigo = (codigo) =>
  crypto.createHash('sha256').update(codigo).digest('hex');

// 1. Enviar código al correo registrado.
app.post('/api/verificar-email', async (req, res) => {
  const email =
    typeof req.body.email === 'string'
      ? req.body.email.trim().toLowerCase()
      : '';

  if (!email) {
    return res.status(400).json({
      exito: false,
      mensaje: 'Ingresa un correo electrónico válido.'
    });
  }

  try {
    const resultado = await pool.query(
      `SELECT id, email, nombre
       FROM usuarios
       WHERE LOWER(email) = $1`,
      [email]
    );

    // No revelar si una cuenta existe o no.
    if (resultado.rowCount === 0) {
      return res.json({
        exito: true,
        mensaje:
          'Si el correo está registrado, recibirás un código de verificación.'
      });
    }

    const usuario = resultado.rows[0];

    const codigo = crypto
      .randomInt(0, 1000000)
      .toString()
      .padStart(6, '0');

    const codigoHash = generarHashCodigo(codigo);

    await pool.query(
      'DELETE FROM recuperacion_password WHERE usuario_id = $1',
      [usuario.id]
    );

    await pool.query(
      `INSERT INTO recuperacion_password
         (usuario_id, codigo_hash, expira_en)
       VALUES ($1, $2, NOW() + INTERVAL '10 minutes')`,
      [usuario.id, codigoHash]
    );

    try {
      await transporter.sendMail({
        from: process.env.SMTP_USER,
        to: usuario.email,
        subject: 'Código para cambiar tu contraseña - Bienestar IA',
        text:
          `Hola ${usuario.nombre},\n\n` +
          `Tu código para cambiar la contraseña es: ${codigo}\n\n` +
          'El código caduca en 10 minutos y solo puede utilizarse una vez.\n\n' +
          'Si no solicitaste este cambio, ignora este correo.'
      });
    } catch (errorCorreo) {
      await pool.query(
        'DELETE FROM recuperacion_password WHERE usuario_id = $1',
        [usuario.id]
      );

      throw errorCorreo;
    }

    return res.json({
      exito: true,
      mensaje:
        'Si el correo está registrado, recibirás un código de verificación.'
    });
  } catch (error) {
    console.error('Error al enviar código de recuperación:', error);

    return res.status(500).json({
      exito: false,
      mensaje: 'No se pudo enviar el correo. Inténtalo nuevamente.'
    });
  }
});

// 2. Verificar el código recibido.
app.post('/api/verificar-codigo', async (req, res) => {
  const email =
    typeof req.body.email === 'string'
      ? req.body.email.trim().toLowerCase()
      : '';

  const codigo =
    typeof req.body.codigo === 'string'
      ? req.body.codigo.trim()
      : '';

  if (!email || !/^\d{6}$/.test(codigo)) {
    return res.status(400).json({
      exito: false,
      mensaje: 'Ingresa el correo y el código de seis dígitos.'
    });
  }

  try {
    const resultado = await pool.query(
      `SELECT r.id, r.codigo_hash, r.expira_en,
              r.intentos, r.verificado_en
       FROM recuperacion_password r
       JOIN usuarios u ON u.id = r.usuario_id
       WHERE LOWER(u.email) = $1
       ORDER BY r.creado_en DESC
       LIMIT 1`,
      [email]
    );

    if (resultado.rowCount === 0) {
      return res.status(400).json({
        exito: false,
        mensaje: 'El código no es válido o ha caducado.'
      });
    }

    const registro = resultado.rows[0];

    if (
      new Date(registro.expira_en) <= new Date() ||
      Number(registro.intentos) >= 5
    ) {
      await pool.query(
        'DELETE FROM recuperacion_password WHERE id = $1',
        [registro.id]
      );

      return res.status(400).json({
        exito: false,
        mensaje: 'El código ha caducado. Solicita uno nuevo.'
      });
    }

    const hashIngresado = generarHashCodigo(codigo);

    if (hashIngresado !== registro.codigo_hash) {
      const intentos = Number(registro.intentos) + 1;

      if (intentos >= 5) {
        await pool.query(
          'DELETE FROM recuperacion_password WHERE id = $1',
          [registro.id]
        );
      } else {
        await pool.query(
          `UPDATE recuperacion_password
           SET intentos = $1
           WHERE id = $2`,
          [intentos, registro.id]
        );
      }

      return res.status(400).json({
        exito: false,
        mensaje: 'Código incorrecto. Revisa el correo e inténtalo de nuevo.'
      });
    }

    if (registro.verificado_en) {
      return res.status(400).json({
        exito: false,
        mensaje: 'Este código ya fue verificado. Solicita uno nuevo.'
      });
    }

    await pool.query(
      `UPDATE recuperacion_password
       SET verificado_en = NOW()
       WHERE id = $1`,
      [registro.id]
    );

    return res.json({
      exito: true,
      mensaje: 'Código verificado correctamente.'
    });
  } catch (error) {
    console.error('Error al verificar código:', error);

    return res.status(500).json({
      exito: false,
      mensaje: 'Error al verificar el código.'
    });
  }
});

// 3. Cambiar contraseña después de verificar el código.
app.post('/api/cambiar-password-directo', async (req, res) => {
  const email =
    typeof req.body.email === 'string'
      ? req.body.email.trim().toLowerCase()
      : '';

  const codigo =
    typeof req.body.codigo === 'string'
      ? req.body.codigo.trim()
      : '';

  const nuevaPassword = req.body.nuevaPassword;

  if (
    !email ||
    !/^\d{6}$/.test(codigo) ||
    typeof nuevaPassword !== 'string' ||
    nuevaPassword.length < 6
  ) {
    return res.status(400).json({
      exito: false,
      mensaje: 'Datos inválidos. Verifica el código y la contraseña.'
    });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const resultado = await client.query(
      `SELECT u.id AS usuario_id,
              r.id AS recuperacion_id,
              r.codigo_hash,
              r.expira_en,
              r.intentos,
              r.verificado_en
       FROM usuarios u
       JOIN recuperacion_password r ON r.usuario_id = u.id
       WHERE LOWER(u.email) = $1
       ORDER BY r.creado_en DESC
       LIMIT 1
       FOR UPDATE OF r`,
      [email]
    );

    if (resultado.rowCount === 0) {
      await client.query('ROLLBACK');

      return res.status(400).json({
        exito: false,
        mensaje: 'La solicitud no es válida. Solicita un nuevo código.'
      });
    }

    const registro = resultado.rows[0];

    if (
      !registro.verificado_en ||
      new Date(registro.expira_en) <= new Date() ||
      Number(registro.intentos) >= 5 ||
      generarHashCodigo(codigo) !== registro.codigo_hash
    ) {
      await client.query('ROLLBACK');

      return res.status(400).json({
        exito: false,
        mensaje: 'El código no es válido o ha caducado. Verifícalo de nuevo.'
      });
    }

    const passwordHash = await bcrypt.hash(nuevaPassword, 10);

    await client.query(
      `UPDATE usuarios
       SET password_hash = $1
       WHERE id = $2`,
      [passwordHash, registro.usuario_id]
    );

    // Consumir el código: no podrá volver a utilizarse.
    await client.query(
      'DELETE FROM recuperacion_password WHERE usuario_id = $1',
      [registro.usuario_id]
    );

    await client.query('COMMIT');

    return res.json({
      exito: true,
      mensaje: 'Contraseña actualizada correctamente.'
    });
  } catch (error) {
    await client.query('ROLLBACK');

    console.error('Error al cambiar contraseña:', error);

    return res.status(500).json({
      exito: false,
      mensaje: 'No se pudo actualizar la contraseña.'
    });
  } finally {
    client.release();
  }
});

app.get('/api/tablero', autenticarToken, async (req, res) => {
  try {
    const [
      usuariosResult,
      encuestasResult,
      participacionesResult,
      propuestasResult,
      encuestasRecientesResult,
      propuestasRecientesResult
    ] = await Promise.all([
      pool.query(`
        SELECT COUNT(*)::INT AS total
        FROM usuarios
      `),

      pool.query(`
        SELECT COUNT(*)::INT AS total
        FROM encuestas
      `),

      pool.query(`
        SELECT COUNT(*)::INT AS total
        FROM respuestas_encuesta
      `),

      pool.query(`
        SELECT COUNT(*)::INT AS total
        FROM propuestas
      `),

      pool.query(`
        SELECT id, titulo, fecha_creacion AS fecha
        FROM encuestas
        ORDER BY fecha_creacion DESC NULLS LAST
        LIMIT 5
      `),

      pool.query(`
        SELECT id, titulo, fecha
        FROM propuestas
        ORDER BY fecha DESC NULLS LAST
        LIMIT 5
      `)
    ]);

    const actividadEncuestas = encuestasRecientesResult.rows.map(
      (encuesta) => ({
        id: `encuesta-${encuesta.id}`,
        tipo: 'Encuesta',
        titulo: encuesta.titulo,
        descripcion: 'Encuesta registrada en la plataforma',
        fecha: encuesta.fecha
      })
    );

    const actividadPropuestas = propuestasRecientesResult.rows.map(
      (propuesta) => ({
        id: `propuesta-${propuesta.id}`,
        tipo: 'Propuesta',
        titulo: propuesta.titulo,
        descripcion: 'Propuesta registrada en la plataforma',
        fecha: propuesta.fecha
      })
    );

    const actividad = [
      ...actividadEncuestas,
      ...actividadPropuestas
    ]
      .sort((a, b) => {
        const fechaA = a.fecha ? new Date(a.fecha).getTime() : 0;
        const fechaB = b.fecha ? new Date(b.fecha).getTime() : 0;
        return fechaB - fechaA;
      })
      .slice(0, 5);

    res.json({
      exito: true,
      metricas: {
        usuariosRegistrados: usuariosResult.rows[0].total,
        encuestas: encuestasResult.rows[0].total,
        participaciones: participacionesResult.rows[0].total,
        propuestas: propuestasResult.rows[0].total
      },
      actividad
    });
  } catch (error) {
    console.error('Error al cargar el tablero:', error);

    res.status(500).json({
      exito: false,
      mensaje: 'No se pudieron consultar los datos del tablero'
    });
  }
});

const carpetaUploads = path.join(__dirname, 'uploads');

fs.mkdirSync(carpetaUploads, { recursive: true });

app.use('/uploads', express.static(carpetaUploads));

const almacenamientoFotos = multer.diskStorage({
  destination: (req, file, callback) => {
    callback(null, carpetaUploads);
  },

  filename: (req, file, callback) => {
    const extensionesPermitidas = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/webp': '.webp'
    };

    const extension = extensionesPermitidas[file.mimetype];

    if (!extension) {
      return callback(new Error('Formato de imagen no permitido.'));
    }

    const nombreArchivo = `${crypto.randomBytes(16).toString('hex')}${extension}`;

    callback(null, nombreArchivo);
  }
});

const subirFoto = multer({
  storage: almacenamientoFotos,
  limits: {
    fileSize: 5 * 1024 * 1024
  },
  fileFilter: (req, file, callback) => {
    const formatosPermitidos = [
      'image/jpeg',
      'image/png',
      'image/webp'
    ];

    if (!formatosPermitidos.includes(file.mimetype)) {
      return callback(
        new Error('Solo se permiten imágenes JPG, PNG o WEBP.')
      );
    }

    callback(null, true);
  }
});

app.post('/api/perfil/:id/foto',autenticarToken,(req, res) => {
    const usuarioSolicitado = Number(req.params.id);
    const usuarioAutenticado = Number(req.usuario.id);

    const esAdmin = ['admin', 'administrador'].includes(
      String(req.usuario.rol).toLowerCase()
    );

    if (
      usuarioSolicitado !== usuarioAutenticado &&
      !esAdmin
    ) {
      return res.status(403).json({
        exito: false,
        mensaje: 'No puedes modificar este perfil.'
      });
    }
  subirFoto.single('foto')(req, res, async (error) => {
    if (error) {
      return res.status(400).json({
        exito: false,
        mensaje: error.message
      });
    }

    if (!req.file) {
      return res.status(400).json({
        exito: false,
        mensaje: 'Selecciona una imagen.'
      });
    }

    const { id } = req.params;
    const fotoUrl = `/uploads/${req.file.filename}`;

    try {
      const resultado = await pool.query(
        `UPDATE perfiles
         SET foto_url = $1
         WHERE usuario_id = $2
         RETURNING foto_url`,
        [fotoUrl, id]
      );

      if (resultado.rowCount === 0) {
        fs.unlink(req.file.path, () => {});

        return res.status(404).json({
          exito: false,
          mensaje: 'No se encontró el perfil del usuario.'
        });
      }

      return res.json({
        exito: true,
        foto_url: resultado.rows[0].foto_url
      });
    } catch (error) {
      fs.unlink(req.file.path, () => {});
      console.error('Error al guardar la foto:', error);

      return res.status(500).json({
        exito: false,
        mensaje: 'No se pudo guardar la foto.'
      });
    }
  });
});

app.put(
  "/api/usuarios/:id/password",
  autenticarToken,
  soloAdministrador,
  async (req, res) => {
    try {
      const id = Number(req.params.id);
      const { nuevaPassword } = req.body;

      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({
          exito: false,
          mensaje: "El ID del usuario no es válido."
        });
      }

      if (
        typeof nuevaPassword !== "string" ||
        nuevaPassword.length < 8
      ) {
        return res.status(400).json({
          exito: false,
          mensaje: "La contraseña debe tener al menos 8 caracteres."
        });
      }

      const resultado = await pool.query(
        "SELECT id FROM usuarios WHERE id = $1",
        [id]
      );

      if (resultado.rows.length === 0) {
        return res.status(404).json({
          exito: false,
          mensaje: "El usuario no existe."
        });
      }

      const passwordHash = await bcrypt.hash(nuevaPassword, 10);

      await pool.query(
        "UPDATE usuarios SET password_hash = $1 WHERE id = $2",
        [passwordHash, id]
      );

      return res.status(200).json({
        exito: true,
        mensaje: "La contraseña se cambió correctamente."
      });
    } catch (error) {
      console.error("Error al cambiar la contraseña del usuario:", error);

      return res.status(500).json({
        exito: false,
        mensaje: "No se pudo cambiar la contraseña."
      });
    }
  }
);


// =========================================================================
// INICIAR SERVIDOR
// =========================================================================

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Servidor ejecutándose en http://localhost:${PORT}`);
});
