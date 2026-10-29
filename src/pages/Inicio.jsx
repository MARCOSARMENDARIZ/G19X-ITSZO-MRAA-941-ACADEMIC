import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiFetch } from "../api";

const API_URL = "http://localhost:5000";

function Inicio() {
  const [usuario, setUsuario] = useState(null);
  const [metricas, setMetricas] = useState(null);
  const [actividad, setActividad] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  const navigate = useNavigate();

  useEffect(() => {
    const usuarioGuardado = localStorage.getItem("usuario");

    if (usuarioGuardado) {
      try {
        setUsuario(JSON.parse(usuarioGuardado));
      } catch {
        localStorage.removeItem("usuario");
      }
    }

    cargarTablero();
  }, []);

  const cargarTablero = async () => {
    try {
      setCargando(true);
      setError("");

      const respuesta = await apiFetch(`${API_URL}/api/tablero`);
      const datos = await respuesta.json();

      if (!respuesta.ok || !datos.exito) {
        throw new Error(
          datos.mensaje || "No se pudieron cargar los datos."
        );
      }

      setMetricas(datos.metricas);
      setActividad(datos.actividad || []);
    } catch (err) {
      console.error("Error al cargar el tablero:", err);
      setError(
        "No se pudieron cargar los datos reales. Verifica que el backend esté funcionando."
      );
    } finally {
      setCargando(false);
    }
  };

  const cerrarSesion = () => {
    localStorage.removeItem("usuario");
    localStorage.removeItem("token");
    setUsuario(null);
    navigate("/", { replace: true });
  };

  const formatearFecha = (fecha) => {
    if (!fecha) return "Fecha no disponible";

    const fechaValida = new Date(fecha);

    if (Number.isNaN(fechaValida.getTime())) {
      return "Fecha no disponible";
    }

    return fechaValida.toLocaleString("es-MX", {
      dateStyle: "medium",
      timeStyle: "short"
    });
  };

  const valor = (dato) => {
    if (cargando) return "...";
    if (!metricas) return "—";
    return dato ?? 0;
  };

  return (
    <div className="inicio-container">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <h2>Bienestar IA</h2>
        </div>

        <nav className="sidebar-menu">
          <Link to="/inicio" className="menu-item active">
            <i className="bi bi-house-fill"></i>
            <span>Tablero</span>
          </Link>

          <Link to="/chat" className="menu-item">
            <i
              className="bi bi-chat-left-dots-fill"
              style={{ color: "#1ED760" }}
            ></i>
            <span>Chat de ayuda</span>
          </Link>

          <Link to="/bienestar" className="menu-item">
            <i
              className="bi bi-heart-pulse-fill"
              style={{ color: "#DE0011" }}
            ></i>
            <span>Bienestar</span>
          </Link>

          <Link to="/evaluaciones" className="menu-item">
            <i
              className="bi bi-card-checklist"
              style={{ color: "#7740ff" }}
            ></i>
            <span>Evaluaciones</span>
          </Link>

          <Link to="/perfil" className="menu-item">
            <i className="bi bi-people-fill icono-menu"></i>
            <span>Mi perfil</span>
          </Link>
        </nav>

        <div className="sidebar-bottom">
          {usuario?.rol === "admin" && (
            <Link to="/configuracion" className="menu-item">
              <i className="bi bi-gear-fill"></i>
              <span>Configuración</span>
            </Link>
          )}

          <button
            type="button"
            className="menu-item logout"
            onClick={cerrarSesion}
          >
            <i
              className="bi bi-door-closed-fill"
              style={{ color: "#DE0011" }}
            ></i>
            <span>Cerrar sesión</span>
          </button>
        </div>
      </aside>

      <main className="main-content">
        <div className="top-bar">
          <div>
            <h1>Tablero Ejecutivo</h1>
            <p className="subtitle">
              Resumen general del estado de bienestar organizacional
            </p>
          </div>

          <button
            type="button"
            onClick={cargarTablero}
            disabled={cargando}
            className="btn btn-outline-primary"
          >
            <i className="bi bi-arrow-clockwise"></i>{" "}
            {cargando ? "Actualizando..." : "Actualizar tablero"}
          </button>
        
        </div>

        {error && (
          <div className="alert alert-danger" role="alert">
            {error}
            <button
              type="button"
              className="btn btn-sm btn-outline-danger ms-3"
              onClick={cargarTablero}
            >
              Reintentar
            </button>
          </div>
        )}

        <section className="kpi-grid">
          {usuario?.rol === "admin" && (
            <div className="kpi-card">
              <div className="kpi-icon icon-blue"><i class="bi bi-people-fill"></i></div>
              <div className="kpi-data">
                <span className="kpi-title">Usuarios registrados</span>
                <h3 className="kpi-value">
                  {valor(metricas?.usuariosRegistrados)}
                </h3>
                <span className="kpi-trend neutral">
                  Total de cuentas registradas
                </span>
              </div>
            </div>
          )}

          <div className="kpi-card">
            <div className="kpi-icon icon-green"> <i
              className="bi bi-card-checklist"
            ></i></div>
            <div className="kpi-data">
              <span className="kpi-title">Encuestas creadas</span>
              <h3 className="kpi-value">
                {valor(metricas?.encuestas)}
              </h3>
              <span className="kpi-trend neutral">
                Total de encuestas registradas
              </span>
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-icon icon-orange"><i class="bi bi-award-fill"></i></div>
            <div className="kpi-data">
              <span className="kpi-title">Participaciones</span>
              <h3 className="kpi-value">
                {valor(metricas?.participaciones)}
              </h3>
              <span className="kpi-trend neutral">
                Registros de respuestas recibidos
              </span>
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-icon icon-purple">💡</div>
            <div className="kpi-data">
              <span className="kpi-title">Propuestas recibidas</span>
              <h3 className="kpi-value">
                {valor(metricas?.propuestas)}
              </h3>
              <span className="kpi-trend neutral">
                Total de propuestas registradas
              </span>
            </div>
          </div>
        </section>

        <div className="dashboard-grid">
          <section className="dashboard-card">
            <h3>
              <i
                className="bi bi-bell-fill"
                style={{ color: "#FDD55B" }}
              ></i>{" "}
              Actividad y Novedades
            </h3>

            <p className="card-description">
              Encuestas y propuestas recientes registradas en la plataforma
            </p>

            {cargando ? (
              <p>Cargando actividad...</p>
            ) : actividad.length === 0 ? (
              <p>No hay actividad registrada todavía.</p>
            ) : (
              <ul className="activity-list">
                {actividad.map((item) => (
                  <li className="activity-item" key={item.id}>
                    <span
                      className={`activity-badge ${
                        item.tipo === "Encuesta"
                          ? "badge-green"
                          : "badge-blue"
                      }`}
                    >
                      {item.tipo}
                    </span>

                    <div>
                      <p>{item.titulo}</p>
                      <small>{item.descripcion}</small>
                      <br />
                      <small>{formatearFecha(item.fecha)}</small>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

export default Inicio;