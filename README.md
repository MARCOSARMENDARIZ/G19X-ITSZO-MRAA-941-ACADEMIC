# Plataforma Bienestar IA

Aplicación web académica para apoyar el bienestar organizacional mediante encuestas, propuestas de mejora y herramientas de inteligencia artificial.

## Estado del proyecto

Este README describe la estructura y los endpoints presentes en el repositorio al momento de su revisión. No significa que todas las funciones estén listas para producción. En particular, antes de desplegar en un entorno real deben reforzarse la autenticación, la autorización de rutas y la recuperación de contraseñas.

## Funcionalidades identificadas

- Inicio de sesión por nombre de usuario o correo electrónico.
- Perfil del usuario con información complementaria.
- Administración de usuarios para el rol `admin`.
- Creación y consulta de encuestas con preguntas de opción, escala y texto.
- Fecha de cierre y temporizador para las encuestas.
- Registro de respuestas de encuestas.
- Análisis de resultados de encuestas con Cloudflare Workers AI.
- Envío de propuestas de mejora organizacional.
- Análisis orientativo de viabilidad de propuestas mediante IA.
- Chatbot enfocado en bienestar organizacional.

## Tecnologías

- Frontend: React, React Router, Vite, Bootstrap y Bootstrap Icons.
- Backend: Node.js, Express y `pg`.
- Base de datos: PostgreSQL.
- Contraseñas: `bcryptjs`.
- IA: Cloudflare Workers AI, modelo `@cf/meta/llama-3.1-8b-instruct` en los endpoints actuales.
- Variables de entorno: `dotenv`.

## Estructura principal

```text
Plataforma-bienestar/
├── backend/
│   ├── db/
│   │   └── schema.sql
│   ├── server.js
│   ├── package.json
│   └── .env                 # local; no subir a Git
├── docs/
│   ├── PRD.md
│   └── MVP.md
├── public/
├── src/
│   ├── pages/
│   │   ├── Login.jsx
│   │   ├── Inicio.jsx
│   │   ├── Perfil.jsx
│   │   ├── configuracion.jsx
│   │   ├── Evaluaciones.jsx
│   │   ├── Bienestar.jsx
│   │   └── Chatbot.jsx
│   ├── App.jsx
│   └── ...
├── .gitignore
├── package.json
└── README.md
```

Los nombres de archivos pueden variar en mayúsculas/minúsculas según la versión local. En el repositorio revisado, `src/App.jsx` registra las rutas `/`, `/inicio`, `/perfil`, `/configuracion`, `/evaluaciones`, `/bienestar` y `/chat`.

## Requisitos previos

- Node.js LTS y npm.
- PostgreSQL instalado y en ejecución.
- Una base de datos PostgreSQL para el proyecto.
- Credenciales de Cloudflare con permiso para utilizar Workers AI si se desea habilitar el chatbot y los análisis con IA.

## 1. Crear la base de datos

Desde `psql` o una herramienta como pgAdmin, crea una base de datos, por ejemplo:

```sql
CREATE DATABASE bienestar_ia;
```

Después abre esa base de datos y ejecuta el archivo `backend/db/schema.sql`.

Con `psql`, desde la carpeta raíz del proyecto puedes usar:

```powershell
psql -U postgres -d plataforma_bienestar -f backend/db/schema.sql
```

Cambia `postgres` por tu usuario de PostgreSQL si es diferente. El esquema crea las tablas que utiliza el backend; no elimina ni modifica tablas existentes.

## 2. Configurar las variables de entorno

Crea `backend/.env` en tu máquina. No subas este archivo a GitHub. Ejemplo de nombres y formato:

```dotenv
PORT=5000

DB_USER=tu_usuario_postgres
DB_HOST=localhost
DB_DATABASE=plataforma_bienestar
DB_PASSWORD=tu_contrasena_postgres
DB_PORT=5432

CLOUDFLARE_ACCOUNT_ID=tu_account_id
CLOUDFLARE_API_TOKEN=REEMPLAZAR_CON_UN_TOKEN_NUEVO


```

Notas importantes:

- Sustituye los valores de ejemplo por los valores de tu entorno.
- No uses valores de ejemplo como si fueran credenciales reales.
- El código actual de chatbot, análisis de encuestas y viabilidad consulta Cloudflare Workers AI.
- `server.js` también importa e inicializa `@google/genai`; revisa esa inicialización si no vas a utilizar Gemini.
- Si una credencial real se compartió o subió a un repositorio, revócala y genera otra. Borrar el archivo no invalida una credencial expuesta.
- Para compartir el proyecto, utiliza un `.env.example` que contenga únicamente marcadores ficticios.

## 3. Instalar dependencias

Abre una terminal en la raíz del proyecto:

```powershell
npm install
```

Abre una segunda terminal y entra al backend:

```powershell
cd backend
npm install
```

## 4. Iniciar el backend

Desde `Plataforma-bienestar\backend`:

```powershell
node server.js
```

El servidor utiliza el puerto `5000` de forma predeterminada y muestra:

```text
Servidor ejecutándose en http://localhost:5000
```

Puedes comprobar la ruta básica abriendo `http://localhost:5000/`. Debe mostrar un mensaje de que el servidor está funcionando.

## 5. Iniciar el frontend

Desde otra terminal, en la carpeta raíz del proyecto:

```powershell
npm run dev
```

Vite mostrará la dirección local del frontend, normalmente `http://localhost:5173`. Abre la dirección que aparezca en tu terminal.

## Pantallas del frontend

| Ruta | Pantalla | Propósito |
|---|---|---|
| `/` | Inicio de sesión | Acceder con nombre o correo y contraseña. |
| `/inicio` | Tablero | Mostrar indicadores y accesos a las áreas principales. |
| `/perfil` | Mi perfil | Consultar información del usuario. |
| `/configuracion` | Configuración | Interfaz de administración de usuarios, visible en la navegación para `admin`. |
| `/evaluaciones` | Evaluaciones | Crear, consultar y responder encuestas; consultar análisis con IA. |
| `/bienestar` | Bienestar | Capturar propuestas de mejora organizacional. |
| `/chat` | Chat de ayuda | Conversar con el asistente de bienestar mediante IA. |

## Endpoints principales identificados

Todos los endpoints de API usan el prefijo `/api`.

| Método | Ruta | Propósito |
|---|---|---|
| `POST` | `/api/login` | Validar credenciales e iniciar sesión. |
| `GET` | `/api/perfil/:id` | Obtener el perfil de un usuario. |
| `GET` | `/api/usuarios` | Consultar usuarios. |
| `POST` | `/api/usuarios/registrar` | Registrar usuario y perfil. |
| `DELETE` | `/api/usuarios/:id` | Eliminar un usuario. |
| `POST` | `/api/verificar-email` | Comprobar si existe un correo. |
| `POST` | `/api/cambiar-password-directo` | Cambiar contraseña; requiere endurecimiento antes de producción. |
| `GET` | `/api/encuestas` | Listar encuestas y contadores. |
| `GET` | `/api/encuestas/:id` | Consultar encuesta, preguntas y opciones. |
| `POST` | `/api/encuestas` | Crear encuesta y preguntas. |
| `POST` | `/api/encuestas/:id/respuestas` | Guardar respuestas. |
| `GET` | `/api/encuestas/:id/analizar-ia` | Generar análisis de los resultados. |
| `POST` | `/api/propuestas` | Registrar una propuesta. |
| `GET` | `/api/propuestas` | Consultar propuestas. |
| `POST` | `/api/chatbot` | Enviar mensaje al chatbot. |
| `POST` | `/api/analizar-viabilidad` | Analizar una propuesta con IA. |

## Crear un usuario administrador de prueba

El esquema no inserta una contraseña predeterminada. Crea un usuario desde la interfaz de administración si ya existe un administrador, o genera un hash con `bcryptjs` y registra el usuario en la base de datos.

Ejemplo de generación de hash desde una terminal dentro de `backend`:

```powershell
node -e "const bcrypt=require('bcryptjs'); const readline=require('readline').createInterface({input:process.stdin,output:process.stdout}); readline.question('Contraseña temporal para el admin: ', async p => { console.log(await bcrypt.hash(p,10)); readline.close(); });"
```

Copia el hash generado y úsalo en una inserción SQL. No guardes la contraseña en texto plano:

```sql
INSERT INTO usuarios (nombre, email, password_hash, rol)
VALUES ('Administrador de prueba', 'admin@ejemplo.local', 'PEGA_AQUI_EL_HASH_GENERADO', 'admin')
RETURNING id;
```

Después crea el perfil usando el `id` devuelto:

```sql
INSERT INTO perfiles (usuario_id, puesto, departamento, fecha_ingreso)
VALUES (ID_DEVUELTO, 'Administrador', 'Administración', CURRENT_DATE);
```

Reemplaza `ID_DEVUELTO` por el número real. Utiliza una contraseña temporal y cámbiala antes de cualquier uso no local. No reutilices contraseñas personales.

## Seguridad: pendientes antes de producción

La revisión del código actual identifica trabajo pendiente:

1. Añadir autenticación basada en token y middleware en las rutas protegidas.
2. Comprobar el rol `admin` en el backend; ocultar una opción en React no protege una API.
3. Sustituir el cambio directo de contraseña por un flujo con contraseña actual o un código de recuperación verificable.
4. No confiar en `usuario_id` o `rol` enviados por el navegador como prueba de identidad.
5. Configurar CORS para los orígenes autorizados y validar las entradas.
6. No registrar tokens, contraseñas ni otros secretos en consola.
7. Revocar cualquier token expuesto y actualizar los secretos locales.
8. Revisar las dependencias y probar el esquema en una base de datos de desarrollo antes de usarlo con datos existentes.


## Licencia

No se identifica una licencia de distribución en esta documentación. Añade una licencia explícita si el proyecto se publicará para reutilización externa.
