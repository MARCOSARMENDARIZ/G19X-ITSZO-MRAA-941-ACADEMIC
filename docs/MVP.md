# MVP — Plataforma Bienestar IA

**Versión:** 1.0  
**Fecha:** 2 de noviembre de 2026  
**Proyecto:** Plataforma Bienestar IA  
**Base:** Funcionalidades y rutas encontradas en el código revisado.

## 1. Propósito del MVP

El Producto Mínimo Viable (MVP) reúne las funciones indispensables para que una organización de prueba pueda iniciar sesión, consultar información básica, responder encuestas, registrar propuestas de mejora y utilizar un chatbot de bienestar. Incluye funciones administrativas para gestionar usuarios y encuestas.

El MVP es una versión de desarrollo académico. Antes de usarlo con datos reales o publicarlo, se deben cerrar los pendientes de seguridad y validar las funciones con pruebas.

## 2. Usuarios del MVP

- **Usuario:** consulta su perfil, participa en encuestas, envía propuestas y usa el chatbot.
- **Administrador:** gestiona usuarios, crea encuestas y solicita análisis de resultados.

## 3. Funciones incluidas

### MVP-01. Inicio de sesión
**Prioridad:** Obligatoria.

- Inicio de sesión por nombre de usuario o correo.
- Validación de contraseña con hash.
- Emisión de JWT.
- Protección de pantallas privadas en React y de rutas privadas en Express.

**Aceptación**
- Un usuario válido entra al sistema.
- Un usuario con credenciales incorrectas recibe un mensaje de error.
- La API rechaza tokens ausentes, inválidos o caducados en rutas protegidas.

### MVP-02. Perfil
**Prioridad:** Obligatoria.

- Consulta de datos básicos y complementarios.
- Visualización de foto de perfil.
- Carga de foto en formatos permitidos.
- Control de acceso al perfil propio y acceso administrativo cuando corresponda.

**Aceptación**
- Se muestra el perfil asociado al usuario autenticado.
- Un usuario no puede modificar el perfil de otro usuario.

### MVP-03. Tablero
**Prioridad:** Obligatoria.

- Conteo de usuarios, encuestas, participaciones y propuestas.
- Actividad reciente de encuestas y propuestas.

**Aceptación**
- Los datos provienen de PostgreSQL a través de `/api/tablero`.
- La pantalla maneja los errores de consulta.

### MVP-04. Encuestas
**Prioridad:** Obligatoria.

- Listado y detalle de encuestas.
- Preguntas de opción, escala y texto.
- Creación de encuestas por administradores.
- Fecha de cierre y control de vencimiento.
- Registro de respuestas.
- Indicador de encuesta ya respondida.
- Análisis de resultados con IA para administradores, sujeto a disponibilidad del proveedor y a las condiciones implementadas.

**Aceptación**
- El usuario ve las preguntas y opciones correctas.
- No se guardan respuestas fuera del periodo permitido.
- Las rutas de creación y análisis exigen rol administrativo.
- Las respuestas se asocian al usuario autenticado, no a una identidad arbitraria enviada por el navegador.

### MVP-05. Propuestas de mejora
**Prioridad:** Obligatoria.

- Captura de propuestas.
- Almacenamiento y consulta de propuestas.
- Análisis orientativo de viabilidad mediante IA.

**Aceptación**
- Los campos obligatorios se validan.
- La propuesta queda guardada y se devuelve una confirmación.
- El análisis de IA presenta resultados como orientación, no como decisión definitiva.
- El acceso de lectura queda limitado al alcance autorizado.

### MVP-06. Chatbot de bienestar
**Prioridad:** Obligatoria.

- Interfaz de conversación.
- Envío del mensaje a `/api/chatbot`.
- Consulta de Cloudflare Workers AI desde el servidor.

**Aceptación**
- El usuario autenticado puede enviar un mensaje y recibir una respuesta.
- Si el servicio de IA falla, se presenta un mensaje controlado.
- El token de Cloudflare no se expone al navegador.

### MVP-07. Administración de usuarios
**Prioridad:** Obligatoria para la demostración administrativa.

- Consultar usuarios.
- Registrar usuarios y sus perfiles.
- Eliminar usuarios.
- Cambiar contraseña de una cuenta mediante la ruta administrativa.

**Aceptación**
- Solo un administrador puede ejecutar operaciones administrativas.
- Las contraseñas se guardan con hash.
- Las operaciones inválidas devuelven errores claros.

### MVP-08. Recuperación de contraseña
**Prioridad:** Incluida; requiere prueba integral.

- Solicitud de código por correo.
- Código de seis dígitos.
- Caducidad y límite de intentos.
- Verificación del código y cambio de contraseña.

**Aceptación**
- Un código vencido, incorrecto o ya verificado no permite completar el cambio.
- El correo se envía con configuración SMTP local y no se muestran credenciales en el cliente.
- El flujo completo se prueba desde la interfaz hasta PostgreSQL.

## 4. Fuera del MVP

- Diagnóstico o tratamiento de condiciones médicas o psicológicas.
- Garantía de exactitud de la IA.
- Aplicación móvil nativa.
- Integraciones con nóminas, sistemas empresariales o servicios externos no implementados.
- Analítica predictiva avanzada.
- Despliegue de producción con alta disponibilidad.
- Sistema completo de auditoría y monitoreo empresarial.

## 5. Requisitos técnicos mínimos

- Node.js y npm instalados.
- PostgreSQL en ejecución y una base de datos del proyecto.
- Dependencias del frontend instaladas desde la raíz.
- Dependencias del backend instaladas dentro de `backend`.
- Archivo local `backend/.env` configurado con valores propios.
- Variables requeridas: `PORT`, `DB_USER`, `DB_HOST`, `DB_DATABASE`, `DB_PASSWORD`, `DB_PORT`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN`, `SMTP_USER` y `SMTP_PASS`, según las funciones que se vayan a probar.
- Un esquema PostgreSQL que coincida con las consultas del backend.
- Token de Cloudflare con permisos mínimos necesarios para Workers AI.

No incluir el archivo `.env` real en Git, documentación, capturas ni archivos compartidos.

## 6. Puesta en marcha local

### 6.1 Instalar dependencias del frontend

Desde la raíz del proyecto:

```powershell
npm install
```

### 6.2 Instalar dependencias del backend

```powershell
cd backend
npm install
```

### 6.3 Configurar variables de entorno

Crear `backend/.env` localmente usando `backend/.env.example` como guía. Reemplazar todos los marcadores con valores válidos. No pegar credenciales en documentación o conversaciones.

### 6.4 Preparar PostgreSQL

Crear la base de datos de desarrollo y ejecutar el esquema SQL validado del proyecto. En la copia examinada no estaba incluido `backend/db/schema.sql`, por lo que este paso debe completarse antes de considerar reproducible la instalación.

### 6.5 Iniciar el backend

Desde la carpeta `backend`:

```powershell
node server.js
```

El servidor utiliza normalmente el puerto `5000`.

### 6.6 Iniciar el frontend

En otra terminal, desde la raíz:

```powershell
npm run dev
```

Abrir la dirección local que muestre Vite.

## 7. Plan de pruebas de aceptación

| ID | Prueba | Resultado esperado | Prioridad |
|---|---|---|---|
| T-01 | Login con credenciales válidas | Se crea sesión y se abre el inicio | Alta |
| T-02 | Login con contraseña incorrecta | Se rechaza el acceso | Alta |
| T-03 | Abrir ruta privada sin sesión | Se redirige al login | Alta |
| T-04 | Llamar una ruta protegida sin JWT | La API devuelve 401 | Alta |
| T-05 | Usuario intenta una acción de administrador | La API devuelve 403 | Alta |
| T-06 | Consultar perfil de otro usuario | Se rechaza salvo autorización administrativa | Alta |
| T-07 | Crear encuesta como administrador | Encuesta y preguntas quedan guardadas | Alta |
| T-08 | Responder encuesta vigente | Respuestas quedan guardadas | Alta |
| T-09 | Responder encuesta vencida | La API rechaza la respuesta | Alta |
| T-10 | Enviar propuesta válida | La propuesta queda registrada | Alta |
| T-11 | Usar chatbot con IA disponible | Se recibe una respuesta | Media |
| T-12 | Simular indisponibilidad de IA | Se muestra un error controlado | Media |
| T-13 | Solicitar recuperación de contraseña | Se envía código al correo de prueba | Alta |
| T-14 | Usar código incorrecto o caducado | Se rechaza el cambio | Alta |
| T-15 | Subir una imagen no permitida | La carga es rechazada | Media |
| T-16 | Revisar repositorio antes de publicar | No contiene `.env`, tokens ni contraseñas | Alta |

## 8. Riesgos y condiciones para considerar listo el MVP

El MVP no debe considerarse listo para producción hasta que se cumpla lo siguiente:

1. Revisar que todas las rutas privadas tengan `autenticarToken`.
2. Revisar que todas las operaciones administrativas tengan `soloAdministrador`.
3. Verificar que el identificador de usuario se obtenga del JWT cuando la operación corresponda a la sesión actual.
4. Probar los permisos de lectura de encuestas y propuestas.
5. Validar recuperación de contraseña, expiración y uso único del código.
6. Restringir CORS y validar límites de tamaño y tipo en archivos.
7. Añadir o completar pruebas automatizadas.
8. Crear y probar `backend/db/schema.sql` en una base limpia.
9. Revocar cualquier credencial expuesta y comprobar que la nueva configuración funciona.
10. Retirar `.env`, `.git`, `node_modules` y archivos de carga del material de entrega cuando no sean necesarios.

## 9. Criterio final de aceptación

El MVP se acepta para una demostración académica cuando un usuario puede iniciar sesión, consultar su perfil, participar en una encuesta vigente, enviar una propuesta y utilizar el chatbot; y cuando un administrador puede gestionar usuarios y crear encuestas. Las pruebas de acceso no autorizado deben pasar y la instalación debe documentarse sin exponer credenciales.

Las funciones de IA dependen de la disponibilidad y configuración de Cloudflare Workers AI. El proyecto debe indicar claramente cualquier función que aún no se haya probado.
