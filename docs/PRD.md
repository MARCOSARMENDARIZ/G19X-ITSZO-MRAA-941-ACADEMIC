# PRD — Plataforma Bienestar IA

**Versión:** 1.0  
**Fecha:** 2 de noviembre de 2026  
**Estado:** Documento de requisitos basado en la revisión del código disponible.  
**Proyecto:** Plataforma Bienestar IA

## 1. Resumen

Plataforma Bienestar IA es una aplicación web académica para apoyar el bienestar organizacional. Permite a los usuarios acceder a su cuenta, consultar su perfil, participar en encuestas, enviar propuestas de mejora y conversar con un asistente de inteligencia artificial. Los usuarios administradores disponen de funciones de gestión de usuarios y administración de encuestas. La aplicación utiliza React en el frontend, Node.js y Express en el backend, PostgreSQL para persistencia y Cloudflare Workers AI para funciones de IA.

Este documento describe el alcance observado en el código revisado; no implica que todas las funciones estén probadas o listas para producción.

## 2. Problema y oportunidad

Las organizaciones necesitan una forma centralizada de recopilar opiniones, identificar oportunidades de mejora y dar seguimiento a iniciativas relacionadas con el bienestar. Cuando las encuestas y propuestas se administran de forma dispersa, resulta más difícil organizar la información y convertirla en acciones.

La plataforma busca reunir estas actividades en una sola aplicación web y ofrecer herramientas de IA como apoyo para interpretar resultados y explorar la viabilidad de propuestas.

## 3. Objetivos del producto

- Centralizar el acceso a las funciones de bienestar organizacional.
- Permitir que los usuarios respondan encuestas y registren propuestas.
- Facilitar a los administradores la creación de encuestas y la gestión de cuentas.
- Ofrecer análisis orientativos mediante IA para apoyar la revisión de resultados y propuestas.
- Proporcionar un tablero con indicadores generales y actividad reciente.
- Mantener las contraseñas y credenciales de servicios fuera del código fuente y aplicar controles de acceso en el backend.

## 4. Usuarios y roles

### 4.1 Usuario autenticado
Puede consultar su perfil, acceder al tablero, responder encuestas disponibles, registrar propuestas y utilizar el chatbot. El backend identifica la sesión mediante un token JWT.

### 4.2 Administrador
Tiene las capacidades del usuario autenticado y, además, puede consultar, registrar y eliminar usuarios, cambiar contraseñas desde la ruta administrativa y crear encuestas. Las operaciones administrativas deben validarse en el backend, no solamente ocultarse en la interfaz.


## 5. Alcance funcional

### 5.1 Autenticación y sesión
- Iniciar sesión mediante nombre de usuario o correo electrónico y contraseña.
- Comparar la contraseña con un hash almacenado, usando `bcryptjs`.
- Emitir un JWT con identificador y rol del usuario.
- Configurar el tiempo de expiración del token mediante variables de entorno.
- Redirigir las rutas privadas a la pantalla de inicio de sesión cuando no existe una sesión local.
- Finalizar la sesión eliminando los datos locales de autenticación.

**Criterios de aceptación**
- Las credenciales correctas permiten iniciar sesión.
- Las credenciales incorrectas no permiten entrar y muestran un mensaje comprensible.
- Las rutas API protegidas rechazan solicitudes sin un token válido.
- El frontend no almacena contraseñas en texto plano.

### 5.2 Perfil de usuario
- Consultar nombre, correo, rol y datos complementarios del perfil.
- Mostrar teléfono, puesto, departamento, fecha de ingreso y foto cuando estén disponibles.
- Permitir la carga de una imagen de perfil con formatos permitidos.
- Restringir la consulta y actualización del perfil al propietario o a un administrador.

**Criterios de aceptación**
- El usuario puede consultar su propio perfil.
- Un usuario no administrador no puede consultar ni modificar el perfil de otra persona.
- Se rechazan formatos de imagen no permitidos.

### 5.3 Tablero
- Mostrar indicadores generales de usuarios, encuestas, participaciones y propuestas.
- Presentar actividad reciente de encuestas y propuestas.

**Criterios de aceptación**
- Los indicadores se obtienen del backend y de PostgreSQL.
- Si ocurre un error al consultar los datos, la interfaz debe informar del problema sin mostrar información inventada.

### 5.4 Encuestas y evaluaciones
- Listar encuestas con título, descripción, estado, fecha de cierre y cantidades relacionadas.
- Consultar el detalle de una encuesta, sus preguntas y las opciones disponibles.
- Permitir preguntas de tipo opción, escala y texto.
- Permitir al administrador crear encuestas y configurar preguntas, opciones y fecha de cierre.
- Registrar respuestas de usuarios autenticados.
- Evitar que se registren respuestas fuera del periodo permitido y controlar la participación repetida según las reglas implementadas.
- Permitir al administrador solicitar un análisis con IA de los resultados cuando existan suficientes respuestas.

**Criterios de aceptación**
- Las preguntas y opciones se muestran en el orden configurado.
- No se aceptan respuestas inválidas ni encuestas vencidas.
- Solo los administradores pueden crear encuestas y solicitar el análisis administrativo.
- Los errores se muestran de manera comprensible.

### 5.5 Propuestas de mejora
- Permitir a los usuarios autenticados registrar una propuesta relacionada con el bienestar organizacional.
- Permitir consultar las propuestas registradas según las reglas de acceso definidas.
- Admitir propuestas anónimas cuando la lógica de la aplicación lo permita.
- Ofrecer un análisis orientativo de viabilidad mediante IA.

**Criterios de aceptación**
- Una propuesta válida se guarda en PostgreSQL.
- Los campos requeridos se validan en el backend.
- La IA se presenta como apoyo orientativo, no como decisión definitiva.

### 5.6 Chatbot de bienestar
- Recibir mensajes del usuario autenticado.
- Enviar el mensaje al servicio de Cloudflare Workers AI desde el backend.
- Devolver una respuesta relacionada con el bienestar organizacional.
- Mantener las credenciales de Cloudflare únicamente en variables de entorno del servidor.

**Criterios de aceptación**
- La clave de API no aparece en el código del frontend ni en las respuestas de la API.
- Si el servicio de IA no responde, se devuelve un error controlado.
- El usuario recibe una respuesta o un mensaje de error entendible.

### 5.7 Recuperación de contraseña
- Solicitar un código de verificación por correo electrónico.
- Verificar un código de seis dígitos con expiración y límite de intentos.
- Permitir el cambio de contraseña después de una verificación válida.
- Guardar la nueva contraseña mediante hash.

**Criterios de aceptación**
- Los códigos caducados, incorrectos o ya utilizados no permiten cambiar la contraseña.
- La aplicación no revela innecesariamente si una dirección de correo está registrada.
- Las credenciales SMTP permanecen en variables de entorno.

## 6. Requisitos no funcionales

### Seguridad
- Usar consultas SQL parametrizadas.
- Hashear contraseñas con `bcryptjs`.
- Validar JWT en las rutas privadas.
- Aplicar autorización por rol en las operaciones administrativas.
- Comprobar la identidad del usuario en operaciones relacionadas con perfiles y respuestas.
- No subir `.env`, tokens, contraseñas, archivos privados ni datos personales al repositorio.
- Usar HTTPS, CORS restringido y límites de solicitudes antes de desplegar en producción.
- Revisar los controles de recuperación de contraseña, carga de archivos y acceso a propuestas antes de publicar la aplicación.

### Rendimiento y disponibilidad
- Mostrar estados de carga y error en operaciones que consultan el backend.
- Gestionar errores de PostgreSQL y de servicios de IA sin bloquear toda la aplicación.
- Evitar consultas innecesarias y revisar índices cuando aumente el volumen de datos.

### Usabilidad y accesibilidad
- Mantener navegación consistente entre las pantallas.
- Usar etiquetas, mensajes de validación y botones comprensibles.
- Mostrar claramente el estado de una encuesta y su fecha límite.
- Asegurar contraste suficiente y navegación usable en pantallas comunes.

### Mantenibilidad
- Separar interfaz, API y persistencia.
- Mantener las variables de entorno documentadas mediante un `.env.example` con valores ficticios.
- Documentar instalación, configuración, estructura y limitaciones conocidas.

## 7. Requisitos técnicos y arquitectura

- **Frontend:** React, React Router, Vite, Bootstrap y Bootstrap Icons.
- **Backend:** Node.js, Express y middleware de autenticación.
- **Base de datos:** PostgreSQL mediante `pg`.
- **Autenticación:** JWT.
- **Contraseñas:** `bcryptjs`.
- **Correo:** Nodemailer con SMTP.
- **Carga de fotos:** Multer.
- **IA:** Cloudflare Workers AI, llamado desde el backend.
- **Configuración:** variables de entorno cargadas desde `backend/.env`.

La dirección del backend está configurada actualmente en `src/api.js` como `http://localhost:5000`; para otros entornos debe externalizarse mediante configuración del frontend.

## 8. Pantallas y rutas del frontend

| Ruta | Pantalla | Propósito |
|---|---|---|
| `/` y `/login` | Inicio de sesión | Acceso y recuperación de cuenta. |
| `/inicio` | Inicio / tablero | Indicadores y actividad reciente. |
| `/perfil` | Perfil | Información del usuario y foto. |
| `/configuracion` | Configuración | Funciones de administración de usuarios. |
| `/evaluaciones` | Evaluaciones | Consulta, creación, respuesta y análisis de encuestas. |
| `/bienestar` | Bienestar | Registro y consulta de propuestas. |
| `/chat` | Chatbot | Asistente de bienestar con IA. |

## 9. API observada

| Método | Ruta | Propósito |
|---|---|---|
| `POST` | `/api/login` | Iniciar sesión y emitir JWT. |
| `GET` | `/api/perfil/:id` | Consultar perfil con control de acceso. |
| `POST` | `/api/perfil/:id/foto` | Cargar foto de perfil. |
| `GET` | `/api/usuarios` | Listar usuarios para administración. |
| `POST` | `/api/usuarios/registrar` | Registrar usuario y perfil. |
| `DELETE` | `/api/usuarios/:id` | Eliminar usuario. |
| `PUT` | `/api/usuarios/:id/password` | Cambiar contraseña de un usuario por administración. |
| `GET` | `/api/tablero` | Obtener indicadores y actividad. |
| `GET` | `/api/encuestas` | Listar encuestas. |
| `GET` | `/api/encuestas/:id` | Consultar una encuesta y sus preguntas. |
| `POST` | `/api/encuestas` | Crear encuesta. |
| `POST` | `/api/encuestas/:id/respuestas` | Guardar respuestas. |
| `GET` | `/api/encuestas/:id/analizar-ia` | Analizar resultados con IA. |
| `POST` | `/api/propuestas` | Registrar propuesta. |
| `GET` | `/api/propuestas` | Consultar propuestas. |
| `POST` | `/api/chatbot` | Obtener respuesta del chatbot. |
| `POST` | `/api/analizar-viabilidad` | Analizar viabilidad de propuesta. |
| `POST` | `/api/verificar-email` | Solicitar recuperación por correo. |
| `POST` | `/api/verificar-codigo` | Verificar código de recuperación. |
| `POST` | `/api/cambiar-password-directo` | Cambiar contraseña tras verificar código. |

La presencia de una ruta en esta tabla no sustituye las pruebas funcionales ni una revisión de autorización en cada endpoint.

## 10. Datos principales

El código utiliza las entidades de datos siguientes, entre otras:
- `usuarios`: credenciales, correo, rol y datos básicos.
- `perfiles`: información complementaria y foto.
- `encuestas`: título, descripción, estado y fechas.
- `preguntas`: preguntas asociadas a una encuesta.
- `opciones_pregunta`: opciones para preguntas de selección.
- `respuestas_encuesta`: registro de participación.
- `detalle_respuestas`: respuestas específicas.
- `propuestas`: ideas de mejora.
- `recuperacion_password`: códigos y metadatos del proceso de recuperación.

La estructura de la base de datos se encuentra definida en `backend/db/schema.sql`. Para preparar una base de datos nueva, ejecuta primero este archivo y posteriormente `backend/db/datos_prueba.sql` si deseas cargar los registros de prueba.

## 11. Fuera del alcance de esta versión

- Diagnóstico médico o psicológico.
- Sustituir a profesionales de salud, recursos humanos o seguridad laboral.
- Garantizar que las recomendaciones de IA sean correctas.
- Integraciones empresariales externas no presentes en el código.
- Aplicaciones móviles nativas.
- Analítica avanzada o predicciones basadas en modelos entrenados con datos propios.



## 12. Métricas de éxito

- Los usuarios pueden iniciar y cerrar sesión correctamente.
- Los usuarios autorizados pueden completar una encuesta válida.
- Los administradores pueden crear encuestas y administrar usuarios.
- Las propuestas quedan almacenadas y pueden consultarse según los permisos definidos.
- El chatbot y los análisis de IA gestionan tanto respuestas correctas como errores del proveedor.
- No se detectan accesos cruzados entre cuentas en las pruebas de autorización.
- La instalación local puede reproducirse siguiendo la documentación sin incluir secretos en el repositorio.
