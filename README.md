# Plataforma Bienestar IA

Aplicación web académica para apoyar el bienestar organizacional mediante encuestas, propuestas de mejora y herramientas de inteligencia artificial.

## Estado del proyecto

Este README describe la estructura, funcionalidades y endpoints de la Plataforma Bienestar IA. El proyecto cuenta con autenticación mediante JWT, autorización por roles, recuperación de contraseña mediante códigos de verificación, protección de rutas y configuración de CORS.

La aplicación integra las funcionalidades contempladas en el MVP y está preparada para su demostración académica.

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

## Metodología de desarrollo

El desarrollo de Plataforma Bienestar IA se realizó mediante un trabajo mixto que combinó programación propia y el apoyo de herramientas de inteligencia artificial.

La implementación del proyecto incluyó actividades realizadas directamente por el desarrollador, como la creación y modificación de código, diseño de interfaces, configuración del backend, conexión con PostgreSQL, implementación de funcionalidades, integración de servicios y corrección de errores.

Asimismo, se utilizaron herramientas de inteligencia artificial como apoyo durante el proceso de desarrollo para consultar soluciones, analizar errores, generar sugerencias, mejorar fragmentos de código, resolver problemas técnicos y orientar la documentación.

Las propuestas generadas mediante inteligencia artificial fueron revisadas, adaptadas e integradas al proyecto según las necesidades de la aplicación.

Por lo tanto, el resultado es producto de la colaboración entre el trabajo técnico del desarrollador y el uso de herramientas de inteligencia artificial como recurso de apoyo.

## Tecnologías

- Frontend: React, React Router, Vite, Bootstrap y Bootstrap Icons.
- Backend: Node.js, Express y `pg`.
- Base de datos: PostgreSQL.
- Contraseñas: `bcryptjs`.
- IA: Cloudflare Workers AI, modelo `@cf/meta/llama-3.1-8b-instruct` en los endpoints actuales.
- Variables de entorno: `dotenv`.

## Estructura principal

Plataforma-bienestar/
├── backend/
│   ├── db/
│   │   ├── schema.sql
│   │   └── datos_prueba.sql
│   ├── server.js
│   ├── package.json
│   ├── .env.example
│   └── .env
├── docs/
│   ├── PRD.md
│   └── MVP.md
├── public/
├── src/
│   ├── pages/
│   ├── App.jsx
│   └── ...
├── .gitignore
├── package.json
└── README.md

Los nombres de archivos pueden variar en mayúsculas/minúsculas según la versión local. En el repositorio revisado, `src/App.jsx` registra las rutas `/`, `/inicio`, `/perfil`, `/configuracion`, `/evaluaciones`, `/bienestar` y `/chat`.

## Requisitos previos

- Node.js LTS y npm.
- PostgreSQL instalado y en ejecución.
- Una base de datos PostgreSQL para el proyecto.
- Credenciales de Cloudflare con permiso para utilizar Workers AI si se desea habilitar el chatbot y los análisis con IA.

## 1. Crear la base de datos

Desde `psql` o una herramienta como pgAdmin, crea la base de datos:

```sql
CREATE DATABASE bienestar_ia;
```

## 2. Crear las tablas de la base de datos

**Este paso debe ejecutarse primero**, ya que crea la estructura y las tablas que necesita la aplicación.

Desde la carpeta raíz del proyecto, ejecuta:

```powershell
psql -U postgres -d bienestar_ia -f backend/db/schema.sql
```

El archivo `schema.sql` crea las tablas y relaciones de la base de datos. No contiene usuarios ni credenciales.

## 3. Insertar los datos de prueba

**Después de ejecutar correctamente `schema.sql`**, ejecuta el siguiente comando para insertar las cuentas de prueba y los datos iniciales:

```powershell
psql -U postgres -d bienestar_ia -f backend/db/datos_prueba.sql
```

Las siguientes cuentas son únicamente para pruebas y desarrollo. No deben utilizarse en producción.

| Usuario | Contraseña | Rol |
|---|---|---|
| admini | Administrador123456 | Administrador (`admin`) |
| paul | minecraft2435 | Usuario (`usuario`) |

**Importante:** No ejecutes `datos_prueba.sql` antes de `schema.sql`, porque las tablas todavía no existirían. Las contraseñas deben estar almacenadas mediante hashes bcrypt para que funcionen con el inicio de sesión de la aplicación.


## 2. Configurar las variables de entorno

Crea `backend/.env` en tu máquina. No subas este archivo a GitHub. Ejemplo de nombres y formato:

```dotenv
# Base de datos PostgreSQL
DB_USER=usuario_ejemplo
DB_HOST=localhost
DB_DATABASE=plataforma_bienestar_ejemplo
DB_PASSWORD=contraseña_ficticia_ejemplo
DB_PORT=5432

# Puerto de tu servidor Node.js
PORT=5000

# Cloudflare
CLOUDFLARE_ACCOUNT_ID=ID_FICTICIO_DE_CLOUDFLARE
CLOUDFLARE_API_TOKEN=TOKEN_FICTICIO_DE_CLOUDFLARE

# Correo SMTP
SMTP_HOST=smtp.gmail.com
SMTP_PORT=aqui_va_el _puerto
SMTP_USER=correo_ejemplo@gmail.com
SMTP_PASS=contraseña_smtp_ficticia

# Autenticación JWT
JWT_SECRET=CAMBIAR_POR_UN_SECRETO_ALEATORIO_LARGO
JWT_EXPIRES_IN=1h

FRONTEND_URL=http://localhost:puerto_abil

```

Notas importantes:

- Sustituye los valores de ejemplo por los valores de tu entorno.
- No uses valores de ejemplo como si fueran credenciales reales.
- El código actual de chatbot, análisis de encuestas y viabilidad consulta Cloudflare Workers AI.
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

| Método | Ruta | Propósito | ¿Pide sesión? |
|---|---|---|---|
| `POST` | `/api/login` | Iniciar sesión. | No |
| `POST` | `/api/verificar-email` | Comprobar si existe un correo. | No |
| `POST` | `/api/verificar-codigo` | Validar código de recuperación. | No |
| `GET` | `/api/perfil/:id` | Consultar perfil. | Sí |
| `POST` | `/api/perfil/:id/foto` | Cargar fotografía. | Sí |
| `GET` | `/api/tablero` | Consultar indicadores. | Sí |
| `GET` | `/api/usuarios` | Consultar usuarios. | Sí, administrador |
| `POST` | `/api/usuarios/registrar` | Registrar usuario. | Sí, administrador |
| `DELETE` | `/api/usuarios/:id` | Eliminar usuario. | Sí, administrador |
| `PUT` | `/api/usuarios/:id/password` | Cambiar contraseña. | Sí, administrador |
| `GET` | `/api/encuestas` | Listar encuestas. | Sí |
| `GET` | `/api/encuestas/:id` | Consultar encuesta. | Sí |
| `POST` | `/api/encuestas` | Crear encuesta. | Sí, administrador |
| `POST` | `/api/encuestas/:id/respuestas` | Guardar respuestas. | Sí |
| `POST` | `/api/encuestas/:id/analizar-ia` | Analizar resultados. | Sí, administrador |
| `POST` | `/api/propuestas` | Registrar propuesta. | Sí |
| `GET` | `/api/propuestas` | Consultar propuestas. | Sí |
| `POST` | `/api/chatbot` | Enviar mensaje al chatbot. | Sí |
| `POST` | `/api/analizar-viabilidad` | Analizar propuesta con IA. | Sí |



## Seguridad implementada

La Plataforma Bienestar IA cuenta con las siguientes medidas de seguridad:

1. Autenticación mediante JWT.
2. Autorización de operaciones administrativas mediante roles.
3. Protección de contraseñas mediante bcrypt.
4. Recuperación de contraseña mediante códigos de verificación.
5. Validación de identidad mediante el token de sesión.
6. Configuración de CORS con orígenes permitidos.
7. Protección de variables de entorno y credenciales.
8. Validación de archivos para fotografías de perfil.

## Licencia

No se identifica una licencia de distribución en esta documentación. Añade una licencia explícita si el proyecto se publicará para reutilización externa.
