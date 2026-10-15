// Carga las variables de tu archivo .env
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const { GoogleGenAI } = require('@google/genai');

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY
});

console.log("🔒 Password cargada correctamente:", process.env.DB_PASSWORD ? "SÍ" : "NO");
console.log("🤖 Gemini API cargada correctamente:", process.env.GEMINI_API_KEY ? "SÍ" : "NO");


const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Conexión a PostgreSQL leyendo desde el .env
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

// Ruta de prueba
app.get('/', (req, res) => {
  res.send('Servidor de Node.js funcionando correctamente');
});

// =========================================================================
// RUTAS DE USUARIOS Y AUTENTICACIÓN
// =========================================================================

// Endpoint de inicio de sesión (Corregido para comparar hash con bcrypt)
app.post('/api/login', async (req, res) => {
  const { usuario, password } = req.body;

  try {
    const result = await pool.query(
      'SELECT id, nombre, email, rol, password_hash FROM usuarios WHERE nombre = $1 OR email = $1',
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

    delete user.password_hash; // Evitar enviar el hash al frontend
    res.json({
      exito: true,
      mensaje: 'Inicio de sesión exitoso',
      usuario: user
    });
  } catch (error) {
    console.error('Error durante el login:', error);
    res.status(500).json({
      exito: false,
      mensaje: 'Error en el servidor'
    });
  }
});

// Endpoint para obtener el perfil de un usuario específico
app.get('/api/perfil/:id', async (req, res) => {
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
         p.fecha_ingreso
       FROM usuarios u 
       LEFT JOIN perfiles p ON u.id = p.usuario_id 
       WHERE u.id = $1`,
      [id]
    );

    if (result.rows.length > 0) {
      res.json({ exito: true, perfil: result.rows[0] });
    } else {
      res.status(404).json({ exito: false, mensaje: 'Usuario no encontrado' });
    }
  } catch (error) {
    console.error('Error al obtener el perfil:', error);
    res.status(500).json({ exito: false, mensaje: 'Error en el servidor' });
  }
});

// GET: Obtener la lista completa de usuarios con sus perfiles
app.get('/api/usuarios', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.id, u.nombre, u.email, u.rol, p.puesto, p.departamento 
       FROM usuarios u 
       LEFT JOIN perfiles p ON u.id = p.usuario_id 
       ORDER BY u.id ASC`
    );

    res.json({ exito: true, usuarios: result.rows });
  } catch (error) {
    console.error('Error al obtener la lista de usuarios:', error);
    res.status(500).json({ exito: false, mensaje: 'Error al consultar usuarios' });
  }
});

// POST: Registrar un nuevo usuario y crear su perfil asociado (Corregido con bcrypt)
app.post('/api/usuarios/registrar', async (req, res) => {
  const { nombre, email, password, rol, puesto, departamento, telefono } = req.body;

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const hash = await bcrypt.hash(password, 10);

    const insertUsuarioQuery = `
      INSERT INTO usuarios (nombre, email, password_hash, rol)
      VALUES ($1, $2, $3, $4)
      RETURNING id;
    `;
    const resUsuario = await client.query(insertUsuarioQuery, [nombre, email, hash, rol || 'usuario']);
    const nuevoUsuarioId = resUsuario.rows[0].id;

    const insertPerfilQuery = `
      INSERT INTO perfiles (usuario_id, telefono, puesto, departamento, fecha_ingreso)
      VALUES ($1, $2, $3, $4, CURRENT_DATE);
    `;
    await client.query(insertPerfilQuery, [nuevoUsuarioId, telefono || null, puesto || null, departamento || null]);

    await client.query('COMMIT');

    res.json({ exito: true, mensaje: 'Usuario registrado correctamente', usuarioId: nuevoUsuarioId });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error al registrar usuario:', error);
    if (error.code === '23505') {
      return res.status(400).json({ exito: false, mensaje: 'El correo electrónico ya está registrado.' });
    }
    res.status(500).json({ exito: false, mensaje: 'Error interno en el servidor al crear usuario.' });
  } finally {
    client.release();
  }
});

// DELETE: Eliminar un usuario y su perfil asociado
app.delete('/api/usuarios/:id', async (req, res) => {
  const { id } = req.params;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Eliminar el perfil asociado en la tabla 'perfiles'
    await client.query('DELETE FROM perfiles WHERE usuario_id = $1', [id]);

    // 2. Eliminar el registro de la tabla 'usuarios'
    const result = await client.query('DELETE FROM usuarios WHERE id = $1 RETURNING id', [id]);

    if (result.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ exito: false, mensaje: 'Usuario no encontrado' });
    }

    await client.query('COMMIT');
    res.json({ exito: true, mensaje: 'Usuario eliminado correctamente' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error al eliminar usuario:', error);
    res.status(500).json({ exito: false, mensaje: 'Error al eliminar el usuario en la base de datos' });
  } finally {
    client.release();
  }
});

// =========================================================================
// ENDPOINTS DE RECUPERACIÓN DE CONTRASEÑA
// =========================================================================

// Endpoint 1: Verificar si el correo existe
app.post('/api/verificar-email', async (req, res) => {
  const { email } = req.body;

  try {
    const result = await pool.query('SELECT id, email FROM usuarios WHERE email = $1', [email]);

    if (result.rows.length === 0) {
      return res.status(404).json({ exito: false, mensaje: 'El correo electrónico no está registrado' });
    }

    return res.json({ exito: true, mensaje: 'Usuario encontrado' });
  } catch (error) {
    console.error('Error al verificar correo:', error);
    return res.status(500).json({ exito: false, mensaje: 'Error interno del servidor' });
  }
});

// Endpoint 2: Cambiar la contraseña directamente (Corregido a password_hash)
app.post('/api/cambiar-password-directo', async (req, res) => {
  const { email, nuevaPassword } = req.body;

  try {
    const passwordHash = await bcrypt.hash(nuevaPassword, 10);

    const result = await pool.query(
      'UPDATE usuarios SET password_hash = $1 WHERE email = $2 RETURNING id',
      [passwordHash, email]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ exito: false, mensaje: 'No se pudo encontrar el usuario' });
    }

    return res.json({ exito: true, mensaje: 'Contraseña actualizada exitosamente' });
  } catch (error) {
    console.error('Error al cambiar contraseña:', error);
    return res.status(500).json({ exito: false, mensaje: 'Error al actualizar la contraseña' });
  }
});

// =========================================================================
// ENDPOINTS DE ENCUESTAS
// =========================================================================

// 1. GET: Obtener todas las encuestas con total de preguntas y respuestas
app.get('/api/encuestas', async (req, res) => {
  try {
    const query = `
      SELECT 
        e.id,
        e.titulo,
        e.descripcion,
        e.estado,
        TO_CHAR(e.fecha_creacion, 'DD/MM/YYYY') AS "fechaCreacion",
        COUNT(DISTINCT p.id)::INT AS "preguntasCount",
        COUNT(DISTINCT re.id)::INT AS "respuestasCount"
      FROM encuestas e
      LEFT JOIN preguntas p ON e.id = p.encuesta_id
      LEFT JOIN respuestas_encuesta re ON e.id = re.encuesta_id
      GROUP BY e.id
      ORDER BY e.fecha_creacion DESC;
    `;

    const result = await pool.query(query);
    res.json({ exito: true, encuestas: result.rows });
  } catch (error) {
    console.error('Error al obtener encuestas:', error);
    res.status(500).json({ exito: false, mensaje: 'Error al consultar las encuestas' });
  }
});

// 2. GET: Obtener detalle de una encuesta específica (con preguntas y opciones)
app.get('/api/encuestas/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const encuestaRes = await pool.query('SELECT * FROM encuestas WHERE id = $1', [id]);
    if (encuestaRes.rows.length === 0) {
      return res.status(404).json({ exito: false, mensaje: 'Encuesta no encontrada' });
    }

    const preguntasRes = await pool.query(
      'SELECT id, texto_pregunta, tipo_respuesta, orden FROM preguntas WHERE encuesta_id = $1 ORDER BY orden ASC',
      [id]
    );

    const preguntas = preguntasRes.rows;

    for (let pregunta of preguntas) {
      if (pregunta.tipo_respuesta === 'opcion') {
        const opcionesRes = await pool.query(
          'SELECT id, texto_opcion FROM opciones_pregunta WHERE pregunta_id = $1',
          [pregunta.id]
        );
        pregunta.opciones = opcionesRes.rows;
      }
    }

    res.json({
      exito: true,
      encuesta: {
        ...encuestaRes.rows[0],
        preguntas
      }
    });
  } catch (error) {
    console.error('Error al obtener detalle de encuesta:', error);
    res.status(500).json({ exito: false, mensaje: 'Error al cargar el detalle de la encuesta' });
  }
});

// 3. POST: Crear una nueva encuesta con preguntas y opciones (Transacción SQL)
app.post('/api/encuestas', async (req, res) => {
  const { titulo, descripcion, creado_por, preguntas } = req.body;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const insertEncuestaQuery = `
      INSERT INTO encuestas (titulo, descripcion, creado_por)
      VALUES ($1, $2, $3)
      RETURNING id, titulo, descripcion, estado, fecha_creacion;
    `;
    const encuestaResult = await client.query(insertEncuestaQuery, [titulo, descripcion, creado_por || null]);
    const nuevaEncuesta = encuestaResult.rows[0];

    if (preguntas && Array.isArray(preguntas)) {
      for (let i = 0; i < preguntas.length; i++) {
        const p = preguntas[i];
        const insertPreguntaQuery = `
          INSERT INTO preguntas (encuesta_id, texto_pregunta, tipo_respuesta, orden)
          VALUES ($1, $2, $3, $4)
          RETURNING id;
        `;
        const preguntaResult = await client.query(insertPreguntaQuery, [
          nuevaEncuesta.id,
          p.texto_pregunta,
          p.tipo_respuesta,
          i + 1
        ]);

        if (p.tipo_respuesta === 'opcion' && Array.isArray(p.opciones)) {
          for (let opcionTexto of p.opciones) {
            await client.query(
              'INSERT INTO opciones_pregunta (pregunta_id, texto_opcion) VALUES ($1, $2)',
              [preguntaResult.rows[0].id, opcionTexto]
            );
          }
        }
      }
    }

    await client.query('COMMIT');
    res.status(201).json({ exito: true, mensaje: 'Encuesta creada con éxito', encuesta: nuevaEncuesta });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error al crear encuesta:', error);
    res.status(500).json({ exito: false, mensaje: 'Error interno al guardar la encuesta' });
  } finally {
    client.release();
  }
});

// 4. POST: Guardar las respuestas de un usuario
app.post('/api/encuestas/:id/respuestas', async (req, res) => {
  const encuesta_id = req.params.id;
  const { usuario_id, respuestas } = req.body;

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const insertRespuestaCabecera = `
      INSERT INTO respuestas_encuesta (encuesta_id, usuario_id)
      VALUES ($1, $2)
      RETURNING id;
    `;
    const resCabecera = await client.query(insertRespuestaCabecera, [encuesta_id, usuario_id || null]);
    const respuestaEncuestaId = resCabecera.rows[0].id;

    if (respuestas && Array.isArray(respuestas)) {
      const insertDetalle = `
        INSERT INTO detalle_respuestas (respuesta_encuesta_id, pregunta_id, opcion_id, valor_numero, valor_texto)
        VALUES ($1, $2, $3, $4, $5);
      `;

      for (let r of respuestas) {
        await client.query(insertDetalle, [
          respuestaEncuestaId,
          r.pregunta_id,
          r.opcion_id || null,
          r.valor_numero || null,
          r.valor_texto || null
        ]);
      }
    }

    await client.query('COMMIT');
    res.status(201).json({ exito: true, mensaje: 'Respuestas guardadas con éxito' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error al responder encuesta:', error);
    res.status(500).json({ exito: false, mensaje: 'Error al registrar tus respuestas' });
  } finally {
    client.release();
  }
});

// Endpoint exclusivo para registrar una nueva propuesta
app.post('/api/propuestas', async (req, res) => {
  const { usuario_id, titulo, descripcion } = req.body;

  // Validación básica en backend
  if (!titulo || !descripcion) {
    return res.status(400).json({ 
      exito: false, 
      mensaje: 'El título y la descripción son requeridos.' 
    });
  }

  try {
    const query = `
      INSERT INTO propuestas (usuario_id, titulo, descripcion)
      VALUES ($1, $2, $3)
      RETURNING id, usuario_id, titulo, descripcion, fecha
    `;
    
    // Si usuario_id es opcional (para publicaciones anónimas), se mandará null
    const values = [usuario_id || null, titulo, descripcion];

    const result = await pool.query(query, values);

    res.status(201).json({
      exito: true,
      mensaje: 'Propuesta enviada',
      propuesta: result.rows[0]
    });
  } catch (error) {
    console.error('Error al registrar la propuesta:', error);
    res.status(500).json({ 
      exito: false, 
      mensaje: 'Error interno del servidor al registrar la propuesta' 
    });
  }
});
// GET: Obtener la lista de propuestas enviadas (con el nombre del usuario si aplica)
app.get('/api/propuestas', async (req, res) => {
  try {
    const query = `
      SELECT 
        p.id, 
        p.usuario_id, 
        p.titulo, 
        p.descripcion, 
        p.fecha,
        COALESCE(u.nombre, 'Anónimo') AS usuario_nombre
      FROM propuestas p
      LEFT JOIN usuarios u ON p.usuario_id = u.id
      ORDER BY p.fecha DESC;
    `;

    const result = await pool.query(query);

    // Retornamos la respuesta indicando 'exito: true' y el arreglo 'propuestas'
    res.json({
      exito: true,
      propuestas: result.rows
    });
  } catch (error) {
    console.error('Error al obtener la lista de propuestas:', error);
    res.status(500).json({
      exito: false,
      mensaje: 'Error interno del servidor al consultar las propuestas'
    });
  }
});
// =========================================================================
// ENDPOINT PARA EL CHATBOT CON INTELIGENCIA ARTIFICIAL (GEMINI)
// =========================================================================
app.post('/api/chatbot', async (req, res) => {
  const { mensaje, historial } = req.body;

  if (!mensaje || typeof mensaje !== 'string' || !mensaje.trim()) {
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

Puedes ayudar con los siguientes temas:
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
4. Mantén el contexto de la conversación utilizando el historial.
5. No inventes estadísticas ni información de la empresa.
6. No afirmes que has consultado encuestas o bases de datos si no se te proporcionaron esos datos.
7. Cuando te soliciten recomendaciones, proporciona acciones concretas y realistas.
8. Si no tienes suficiente información, solicita los datos necesarios.
9. Evita respuestas innecesariamente largas.
10. Puedes responder preguntas generales y orientar la conversación hacia el bienestar organizacional.`
      }
    ];

    // Procesar el historial de la conversación
    if (Array.isArray(historial)) {
      historial.slice(-10).forEach(h => {
        if (!h || typeof h !== 'object') {
          return;
        }

        const texto =
          h.text ||
          h.content ||
          (Array.isArray(h.parts) && h.parts[0]
            ? h.parts[0].text
            : '');

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

    // Agregar el mensaje actual del usuario
    messages.push({
      role: 'user',
      content: mensaje.trim()
    });

    // Solicitar respuesta a Cloudflare Workers AI
    const respuestaCloudflare = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/@cf/meta/llama-3.1-8b-instruct`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messages: messages,
          max_tokens: 1000,
          temperature: 0.7
        })
      }
    );

    // Obtener la respuesta de Cloudflare
    const datosCloudflare = await respuestaCloudflare.json();

    // Comprobar si Cloudflare devolvió un error
    if (
      !respuestaCloudflare.ok ||
      !datosCloudflare.success
    ) {
      console.error(
        'Error de Cloudflare Workers AI:',
        datosCloudflare.errors || datosCloudflare
      );

      return res.status(502).json({
        exito: false,
        mensaje: 'No se pudo generar una respuesta. Inténtalo nuevamente.'
      });
    }

    // Obtener el texto generado por la IA
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

    // Enviar la respuesta al frontend React
    return res.json({
      exito: true,
      respuesta: respuestaIA.trim()
    });

  } catch (error) {
    console.error(
      'Error en el chatbot con Cloudflare:',
      error
    );

    return res.status(500).json({
      exito: false,
      mensaje: 'Error interno del servidor al procesar el mensaje.'
    });
  }
});
// =========================================================================
// ENDPOINT PARA ANALIZAR RESULTADOS DE ENCUESTA CON GEMINI IA (ADMIN)
// =========================================================================


app.get('/api/encuestas/:id/analizar-ia', async (req, res) => {
  const { id } = req.params;

  try {
    // 1. Obtener la encuesta
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

    // 2. Obtener las preguntas
    const preguntasQuery = await pool.query(
      `SELECT id, texto_pregunta, tipo_respuesta
       FROM preguntas
       WHERE encuesta_id = $1`,
      [id]
    );

    // 3. Obtener las respuestas registradas
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

    // 4. Preparar los datos de la encuesta
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

    // 5. Validar las credenciales de Cloudflare
    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
    const apiToken = process.env.CLOUDFLARE_API_TOKEN;

    if (!accountId || !apiToken) {
      return res.status(500).json({
        exito: false,
        mensaje: 'Faltan las variables CLOUDFLARE_ACCOUNT_ID o CLOUDFLARE_API_TOKEN en el archivo .env.'
      });
    }

    // 6. Crear el prompt
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

    // 7. Solicitar el análisis a Cloudflare Workers AI
    const respuestaCloudflare = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/@cf/meta/llama-3.1-8b-instruct`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiToken}`,
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
                  items: {
                    type: 'string'
                  }
                },
                areas_criticas: {
                  type: 'array',
                  items: {
                    type: 'string'
                  }
                },
                plan_de_accion: {
                  type: 'array',
                  items: {
                    type: 'string'
                  }
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

    // 8. Leer la respuesta de Cloudflare
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

    // 9. Obtener el texto generado
    const textoIA = datosCloudflare.result?.response;

    if (!textoIA) {
      console.error(
        'Cloudflare no devolvió texto:',
        datosCloudflare
      );

      return res.status(502).json({
        exito: false,
        mensaje: 'Cloudflare devolvió una respuesta vacía.'
      });
    }

    // 10. Convertir la respuesta a JSON
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

      // 11. Validar la estructura del análisis
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
        throw new Error('Los hallazgos, áreas críticas y plan de acción deben ser arreglos.');
      }

    } catch (error) {
      console.error(
        'Error al interpretar la respuesta de Cloudflare:',
        error.message
      );

      console.error(
        'Respuesta original de la IA:',
        textoIA
      );

      return res.status(502).json({
        exito: false,
        mensaje: 'La IA devolvió una respuesta incompleta o con formato inválido. Revisa la terminal del backend.'
      });
    }

    // 12. Enviar el análisis al frontend
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
// ENDPOINT PARA ANALIZAR LA VIABILIDAD DE UNA PROPUESTA CON GEMINI IA
// =========================================================================

app.post('/api/analizar-viabilidad', async (req, res) => {
  const { titulo, descripcion } = req.body;

  if ((!titulo || !titulo.trim()) && (!descripcion || !descripcion.trim())) {
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

Título: ${titulo || 'Sin título'}
Descripción: ${descripcion || 'Sin descripción'}

Analiza:
1. Viabilidad general.
2. Beneficios para los colaboradores y la organización.
3. Riesgos y dificultades.
4. Recursos necesarios.
5. Recomendaciones para implementarla.
6. Información adicional que haría falta para evaluar mejor la propuesta.

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
          'Authorization': `Bearer ${apiToken}`,
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
      console.error('Error de Cloudflare Workers AI:', datos.errors || datos);
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
    console.error('Error al analizar la viabilidad con Cloudflare:', error.message);

    return res.status(500).json({
      exito: false,
      mensaje: 'Ocurrió un error al procesar el análisis de viabilidad.'
    });
  }
});


// Arrancar el servidor AL FINAL de las rutas
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor ejecutándose en http://localhost:${PORT}`);
});