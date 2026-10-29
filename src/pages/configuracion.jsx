import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../api";

function Configuracion() {
  const [listaUsuarios, setListaUsuarios] = useState([]);
  const [listaPropuestas, setListaPropuestas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [cargandoPropuestas, setCargandoPropuestas] = useState(true);

  const [mostrarModal, setMostrarModal] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const [nuevoUsuario, setNuevoUsuario] = useState({
    nombre: "",
    email: "",
    password: "",
    rol: "usuario",
    puesto: "",
    departamento: "",
    telefono: ""
  });

  const [mostrarModalPassword, setMostrarModalPassword] = useState(false);
  const [usuarioSeleccionado, setUsuarioSeleccionado] = useState(null);
  const [nuevaPassword, setNuevaPassword] = useState("");
  const [cambiandoPassword, setCambiandoPassword] = useState(false);

  const [mostrarModalAlerta, setMostrarModalAlerta] = useState(false);
const [mensajeAlerta, setMensajeAlerta] = useState("");

const mostrarAlerta = (mensaje) => {
  setMensajeAlerta(mensaje);
  setMostrarModalAlerta(true);
};

const cerrarModalAlerta = () => {
  setMostrarModalAlerta(false);
  setMensajeAlerta("");
};

  const [mostrarModalViabilidad, setMostrarModalViabilidad] = useState(false);
  const [propuestaSeleccionada, setPropuestaSeleccionada] = useState(null);
  const [cargandoViabilidad, setCargandoViabilidad] = useState(false);
  const [resumenViabilidadIA, setResumenViabilidadIA] = useState("");

  const obtenerToken = () => localStorage.getItem("token");

  const obtenerUsuarios = async () => {
    setCargando(true);

    try {
      const token = obtenerToken();

      if (!token) {
        console.error("No hay token de autenticación. Inicia sesión nuevamente.");
        setListaUsuarios([]);
        return;
      }

      const respuesta = await fetch("http://localhost:5000/api/usuarios", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });

      const data = await respuesta.json();

      if (!respuesta.ok) {
        console.error(
          "Error al obtener usuarios:",
          data.mensaje || data
        );
        return;
      }

      const usuarios = Array.isArray(data)
        ? data
        : Array.isArray(data.usuarios)
          ? data.usuarios
          : [];

      setListaUsuarios(usuarios);
    } catch (error) {
      console.error("Error al consultar usuarios:", error);
    } finally {
      setCargando(false);
    }
  };

  const obtenerPropuestas = async () => {
    try {
      const respuesta = await fetch(
        "http://localhost:5000/api/propuestas"
      );

      const data = await respuesta.json();

      if (!respuesta.ok) {
        console.error(
          "Error al obtener propuestas:",
          data.mensaje || data
        );
        return;
      }

      if (Array.isArray(data)) {
        setListaPropuestas(data);
      } else if (Array.isArray(data.propuestas)) {
        setListaPropuestas(data.propuestas);
      } else {
        setListaPropuestas([]);
      }
    } catch (error) {
      console.error(
        "Error al obtener lista de propuestas:",
        error
      );
    } finally {
      setCargandoPropuestas(false);
    }
  };

  useEffect(() => {
    obtenerUsuarios();
    obtenerPropuestas();
  }, []);

  const handleChange = (e) => {
    setNuevoUsuario({
      ...nuevoUsuario,
      [e.target.name]: e.target.value
    });
  };

  const handleRegistrar = async (e) => {
    e.preventDefault();
    setGuardando(true);

    try {
      const token = obtenerToken();

      if (!token) {
        mostrarAlerta("Tu sesión ha expirado. Inicia sesión nuevamente.");
        return;
      }

      const res = await fetch(
        "http://localhost:5000/api/usuarios/registrar",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify(nuevoUsuario)
        }
      );

      const data = await res.json();

      if (res.ok && data.exito) {
        mostrarAlerta("¡Usuario registrado exitosamente!");

        setMostrarModal(false);

        setNuevoUsuario({
          nombre: "",
          email: "",
          password: "",
          rol: "usuario",
          puesto: "",
          departamento: "",
          telefono: ""
        });

        await obtenerUsuarios();
      } else {
        mostrarAlerta(data.mensaje || "Error al registrar usuario");
      }
    } catch (error) {
      console.error("Error al registrar usuario:", error);
      mostrarAlerta("Error de conexión con el servidor");
    } finally {
      setGuardando(false);
    }
  };

  const abrirModalCambioPassword = (usuario) => {
    setUsuarioSeleccionado(usuario);
    setNuevaPassword("");
    setMostrarModalPassword(true);
  };

 const handleCambiarPassword = async (e) => {
  e.preventDefault();

  if (!nuevaPassword || nuevaPassword.trim().length < 8) {
    mostrarAlerta("La contraseña debe tener al menos 8 caracteres.");
    return;
  }

  if (!usuarioSeleccionado?.id) {
    mostrarAlerta("No se ha seleccionado un usuario válido.");
    return;
  }

  setCambiandoPassword(true);

  try {
    const res = await apiFetch(
      `/api/usuarios/${usuarioSeleccionado.id}/password`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          nuevaPassword
        })
      }
    );

    const data = await res.json();

    if (res.ok && data.exito) {
      mostrarAlerta(
        `¡Contraseña actualizada con éxito para ${usuarioSeleccionado.nombre}!`
      );

      setMostrarModalPassword(false);
      setUsuarioSeleccionado(null);
      setNuevaPassword("");
    } else {
      mostrarAlerta(data.mensaje || "Error al cambiar la contraseña.");
    }
  } catch (error) {
    console.error("Error al cambiar contraseña:", error);
    mostrarAlerta("Error de conexión con el servidor al cambiar la contraseña.");
  } finally {
    setCambiandoPassword(false);
  }
};
  const handleEliminar = async (id, nombre) => {
    const confirmar = window.confirm(
      `¿Estás seguro de que deseas eliminar a ${nombre}?`
    );

    if (!confirmar) return;

    try {
      const token = obtenerToken();

      if (!token) {
        mostrarAlerta("Tu sesión ha expirado. Inicia sesión nuevamente.");
        return;
      }

      const res = await fetch(
        `http://localhost:5000/api/usuarios/${id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      const data = await res.json();

      if (res.ok && data.exito) {
        mostrarAlerta("Usuario eliminado correctamente.");

        setListaUsuarios((prev) =>
          prev.filter((usr) => String(usr.id) !== String(id))
        );
      } else {
        mostrarAlerta(data.mensaje || "Error al eliminar el usuario.");
      }
    } catch (error) {
      console.error("Error al eliminar usuario:", error);
      mostrarAlerta("Error de conexión al intentar eliminar el usuario.");
    }
  };

  const abrirModalViabilidad = async (propuesta) => {
    setPropuestaSeleccionada(propuesta);
    setMostrarModalViabilidad(true);
    setCargandoViabilidad(true);
    setResumenViabilidadIA("");

    try {
      const res = await fetch(
        "http://localhost:5000/api/analizar-viabilidad",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            id: propuesta.id,
            titulo: propuesta.titulo || propuesta.title,
            descripcion:
              propuesta.descripcion ||
              propuesta.description ||
              propuesta.contenido
          })
        }
      );

      const data = await res.json();

      if (res.ok && (data.exito || data.resumen)) {
        setResumenViabilidadIA(
          data.resumen ||
          data.mensaje ||
          "Análisis generado con éxito."
        );
      } else {
        setResumenViabilidadIA(
          data.mensaje ||
          "No se pudo generar el análisis de viabilidad."
        );
      }
    } catch (error) {
      console.error("Error al conectar con el servicio de IA:", error);
      setResumenViabilidadIA(
        "Error de conexión al intentar conectar con el servicio de IA."
      );
    } finally {
      setCargandoViabilidad(false);
    }
  };

  return (
    <div className="config-container">
      <div className="config-header">
        <Link to="/inicio" className="btn-volver">
          ←
        </Link>

        <div>
          <h1>⚙️ Configuración del Sistema</h1>
          <p>Gestión de opciones globales y usuarios registrados</p>
        </div>
      </div>

      <div className="config-contenido">
        <div className="config-card full-width">
          <div className="card-header">
            <h2>👥 Usuarios Registrados</h2>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px"
              }}
            >
              <button
                className="btn-agregar-usuario"
                onClick={() => setMostrarModal(true)}
              >
                ➕ Agregar Nuevo Usuario
              </button>

              <span className="badge-contador">
                {listaUsuarios.length} usuarios
              </span>
            </div>
          </div>

          {cargando ? (
            <p className="cargando-texto">
              Cargando lista de usuarios...
            </p>
          ) : (
            <div className="tabla-responsive">
              <table className="tabla-usuarios">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Nombre</th>
                    <th>Correo electrónico</th>
                    <th>Rol</th>
                    <th>Puesto</th>
                    <th>Departamento</th>
                    <th>Acciones</th>
                  </tr>
                </thead>

                <tbody>
                  {listaUsuarios.length > 0 ? (
                    listaUsuarios.map((usr) => (
                      <tr key={usr.id}>
                        <td>#{usr.id}</td>

                        <td className="columna-nombre">
                          <div className="user-avatar-mini">👤</div>
                          {usr.nombre}
                        </td>

                        <td>{usr.email}</td>

                        <td>
                          <span className={`badge-rol ${usr.rol}`}>
                            {usr.rol}
                          </span>
                        </td>

                        <td>{usr.puesto || "—"}</td>
                        <td>{usr.departamento || "—"}</td>

                        <td>
                          <div
                            style={{
                              display: "flex",
                              gap: "6px",
                              flexWrap: "wrap"
                            }}
                          >
                            <button
                              className="btn-password-usuario"
                              onClick={() => abrirModalCambioPassword(usr)}
                              title="Cambiar contraseña"
                              style={{
                                backgroundColor: "#f59e0b",
                                color: "#fff",
                                border: "none",
                                padding: "6px 12px",
                                borderRadius: "6px",
                                cursor: "pointer",
                                fontSize: "0.85rem"
                              }}
                            >
                              Cambio de Contraseña
                            </button>

                            <button
                              className="btn-eliminar-usuario"
                              onClick={() =>
                                handleEliminar(usr.id, usr.nombre)
                              }
                              title="Eliminar usuario"
                              style={{
                                backgroundColor: "#ef4444",
                                color: "#fff",
                                border: "none",
                                padding: "6px 12px",
                                borderRadius: "6px",
                                cursor: "pointer",
                                fontSize: "0.85rem"
                              }}
                            >
                              🗑️ Eliminar
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan="7"
                        style={{
                          textAlign: "center",
                          padding: "16px"
                        }}
                      >
                        No hay usuarios registrados aún.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div
          className="config-card full-width"
          style={{ marginTop: "24px" }}
        >
          <div className="card-header">
            <h2>💡 Ideas y Propuestas Enviadas</h2>

            <span className="badge-contador">
              {listaPropuestas.length} propuestas
            </span>
          </div>

          {cargandoPropuestas ? (
            <p className="cargando-texto">
              Cargando propuestas...
            </p>
          ) : (
            <div className="tabla-responsive">
              <table className="tabla-usuarios">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Usuario</th>
                    <th>Título</th>
                    <th>Descripción</th>
                    <th>Análisis y viabilidad</th>
                    <th>Fecha</th>
                  </tr>
                </thead>

                <tbody>
                  {listaPropuestas.length > 0 ? (
                    listaPropuestas.map((prop, idx) => (
                      <tr key={prop.id || idx}>
                        <td>#{prop.id || idx + 1}</td>

                        <td className="columna-nombre">
                          <div className="user-avatar-mini">👤</div>
                          {prop.usuario_nombre ||
                            prop.nombre_usuario ||
                            prop.usuario ||
                            prop.nombre ||
                            "Anónimo"}
                        </td>

                        <td>
                          <strong>
                            {prop.titulo || prop.title || "Sin título"}
                          </strong>
                        </td>

                        <td>
                          {prop.descripcion ||
                            prop.description ||
                            prop.contenido ||
                            "Sin descripción"}
                        </td>

                        <td>
                          <button
                            className="btn-analizar"
                            onClick={() => abrirModalViabilidad(prop)}
                          >
                            <i className="bi bi-stars me-2"></i>
                            Analizar
                          </button>
                        </td>

                        <td>
                          {prop.fecha ||
                          prop.created_at ||
                          prop.fecha_creacion
                            ? new Date(
                                prop.fecha ||
                                prop.created_at ||
                                prop.fecha_creacion
                              ).toLocaleDateString()
                            : "—"}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan="6"
                        style={{
                          textAlign: "center",
                          padding: "16px"
                        }}
                      >
                        No hay propuestas registradas aún.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {mostrarModal && (
        <div className="modal-overlay">
          <div className="modal-contenido">
            <div className="modal-header">
              <h2>➕ Registrar Nuevo Usuario</h2>

              <button
                type="button"
                className="btn-cerrar-modal"
                onClick={() => setMostrarModal(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRegistrar} className="modal-form">
              <div className="form-grupo">
                <label>Nombre Completo *</label>
                <input
                  type="text"
                  name="nombre"
                  value={nuevoUsuario.nombre}
                  onChange={handleChange}
                  required
                  placeholder="Ej. María López"
                />
              </div>

              <div className="form-grupo">
                <label>Correo Electrónico *</label>
                <input
                  type="email"
                  name="email"
                  value={nuevoUsuario.email}
                  onChange={handleChange}
                  required
                  placeholder="ejemplo@empresa.com"
                />
              </div>

              <div className="form-grupo">
                <label>Contraseña *</label>
                <input
                  type="password"
                  name="password"
                  value={nuevoUsuario.password}
                  onChange={handleChange}
                  required
                  placeholder="••••••••"
                />
              </div>

              <div className="form-grupo">
                <label>Rol de Usuario *</label>
                <select
                  name="rol"
                  value={nuevoUsuario.rol}
                  onChange={handleChange}
                >
                  <option value="usuario">Usuario / Colaborador</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>

              <div className="form-grupo">
                <label>Puesto</label>
                <input
                  type="text"
                  name="puesto"
                  value={nuevoUsuario.puesto}
                  onChange={handleChange}
                  placeholder="Ej. Analista de RH"
                />
              </div>

              <div className="form-grupo">
                <label>Departamento</label>
                <input
                  type="text"
                  name="departamento"
                  value={nuevoUsuario.departamento}
                  onChange={handleChange}
                  placeholder="Ej. Recursos Humanos"
                />
              </div>

              <div className="form-grupo">
                <label>Teléfono</label>
                <input
                  type="text"
                  name="telefono"
                  value={nuevoUsuario.telefono}
                  onChange={handleChange}
                  placeholder="Ej. 555 123 4567"
                />
              </div>

              <div className="modal-acciones">
                <button
                  type="button"
                  className="btn-cancelar"
                  onClick={() => setMostrarModal(false)}
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="btn-guardar"
                  disabled={guardando}
                >
                  {guardando ? "Registrando..." : "Registrar Usuario"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {mostrarModalPassword && usuarioSeleccionado && (
        <div className="modal-overlay">
          <div
            className="modal-contenido"
            style={{ maxWidth: "420px" }}
          >
            <div className="modal-header">
              <h2>🔑 Cambiar Contraseña</h2>

              <button
                type="button"
                className="btn-cerrar-modal"
                onClick={() => setMostrarModalPassword(false)}
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={handleCambiarPassword}
              className="modal-form"
            >
              <p
                style={{
                  margin: "0 0 15px 0",
                  color: "#6b7280",
                  fontSize: "0.95rem"
                }}
              >
                Actualizar clave para:{" "}
                <strong>{usuarioSeleccionado.nombre}</strong>{" "}
                ({usuarioSeleccionado.email})
              </p>

              <div className="form-grupo">
                <label>Nueva Contraseña *</label>
                <input
                  type="password"
                  value={nuevaPassword}
                  onChange={(e) => setNuevaPassword(e.target.value)}
                  required
                  minLength={8}
                  placeholder="Ingresa la nueva contraseña"
                />
              </div>

              <div className="modal-acciones">
                <button
                  type="button"
                  className="btn-cancelar"
                  onClick={() => setMostrarModalPassword(false)}
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="btn-guardar"
                  disabled={cambiandoPassword}
                >
                  {cambiandoPassword
                    ? "Guardando..."
                    : "Actualizar Contraseña"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {mostrarModalViabilidad && propuestaSeleccionada && (
        <div
          className="modal-overlay"
          onClick={() => setMostrarModalViabilidad(false)}
        >
          <div
            className="modal-contenido modal-viabilidad"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2>
                <i className="bi bi-stars me-2"></i>
                Resumen de viabilidad
              </h2>

              <button
                type="button"
                className="btn-cerrar-modal"
                onClick={() => setMostrarModalViabilidad(false)}
              >
                ✕
              </button>
            </div>

            <div className="modal-form">
              <span className="etiqueta-ia">
                <i className="bi bi-lightbulb me-2"></i>
                Análisis de propuesta
              </span>

              <h3>
                {propuestaSeleccionada.titulo ||
                  propuestaSeleccionada.title ||
                  "Propuesta sin título"}
              </h3>

              <div className="viabilidad-seccion">
                <h4>Descripción</h4>
                <p>
                  {propuestaSeleccionada.descripcion ||
                    propuestaSeleccionada.description ||
                    propuestaSeleccionada.contenido ||
                    "No hay descripción disponible."}
                </p>
              </div>

              <div className="viabilidad-seccion">
                <h4>
                  <i className="bi bi-graph-up me-2"></i>
                  Resumen de viabilidad
                </h4>

                {cargandoViabilidad ? (
                  <p className="cargando-texto">
                    Generando análisis de viabilidad con IA...
                  </p>
                ) : (
                  <p>{resumenViabilidadIA}</p>
                )}
              </div>

              <div className="modal-acciones">
                <button
                  type="button"
                  className="btn-cancelar"
                  onClick={() => setMostrarModalViabilidad(false)}
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL INDEPENDIENTE DE ALERTAS */}
{mostrarModalAlerta && (
  <div className="alerta-overlay">
    <div
      className="alerta-contenido"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="titulo-alerta"
    >
      <div className="alerta-icono">!</div>

      <h2 id="titulo-alerta">Aviso</h2>

      <p>{mensajeAlerta}</p>

      <button
        type="button"
        onClick={cerrarModalAlerta}
        autoFocus
      >
        Entendido
      </button>
    </div>
  </div>
)}
    </div>
  );
}

export default Configuracion;
