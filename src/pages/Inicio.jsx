import { useEffect, useState } from "react";
import { Link } from "react-router-dom";


function Inicio() {
  const [usuario, setUsuario] = useState(null);

  useEffect(() => {
    const usuarioGuardado = localStorage.getItem("usuario");
    if (usuarioGuardado) {
      setUsuario(JSON.parse(usuarioGuardado));
    }
  }, []);

  return (
    <div className="inicio-container">

      {/* MENÚ LATERAL */}
      <aside className="sidebar">

        <div className="sidebar-logo">
          <h2>Bienestar IA</h2>
        </div>

        <nav className="sidebar-menu">

          <a href="#" className="menu-item active">
            <i class="bi bi-bar-chart-steps"></i> 
            <span>Tablero</span>
          </a>
          <Link to="/chat" className="menu-item">
           <i class="bi bi-chat-left-dots-fill" style={{ color: '#1ED760'}}></i> 
           <span>Chat de ayuda</span>
          </Link>

          <Link to="/bienestar" className="menu-item">
          <i className="bi bi-heart-pulse-fill" style={{ color: '#DE0011' }}></i>
           <span> Bienestar </span>
          </Link>

          <Link to="/evaluaciones" className="menu-item">
            <i class="bi bi-card-checklist" style={{ color: '#7740ff '}}></i> 
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
              <i class="bi bi-gear-fill"></i> <span> Configuración </span>
            </Link>
          )}

          <a href="/" className="menu-item logout">
           <i class="bi bi-door-closed-fill" style={{color: '#DE0011'}}></i> 
           <span>Cerrar sesión</span>
          </a>

        </div>

      </aside>


      {/* CONTENIDO PRINCIPAL - TABLERO EJECUTIVO */}
      <main className="main-content">

        {/* TOP BAR */}
        <div className="top-bar">
          <div>
            <h1>Tablero Ejecutivo</h1>
            <p className="subtitle">Resumen general del estado de bienestar organizacional</p>
          </div>

          <div className="user">
            👤 {usuario ? usuario.nombre : "Cargando..."}
          </div>
        </div>

        {/* METRICAS PRINCIPALES (KPIS) */}
        <section className="kpi-grid">

          <div className="kpi-card">
            <div className="kpi-icon icon-blue">📊</div>
            <div className="kpi-data">
              <span className="kpi-title">Índice del Bienestar</span>
              <h3 className="kpi-value">84%</h3>
              <span className="kpi-trend positive">↑ +3.2% este mes</span>
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-icon icon-green">📋</div>
            <div className="kpi-data">
              <span className="kpi-title">Evaluaciones Completadas</span>
              <h3 className="kpi-value">128</h3>
              <span className="kpi-trend positive">85% de participación</span>
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-icon icon-orange">⚡</div>
            <div className="kpi-data">
              <span className="kpi-title">Nivel de Estrés Promedio</span>
              <h3 className="kpi-value">Bajo</h3>
              <span className="kpi-trend neutral">Estable vs mes anterior</span>
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-icon icon-purple">👤</div>
            <div className="kpi-data">
              <span className="kpi-title">Usuarios Activos</span>
              <h3 className="kpi-value">45</h3>
              <span className="kpi-trend positive">↑ 5 nuevos esta semana</span>
            </div>
          </div>

        </section>


        {/* SECCIÓN DOS COLUMNAS: ACCESOS RÁPIDOS Y ACTIVIDAD RECIENTE */}
        <div className="dashboard-grid">


          {/* ACTIVIDAD Y ALERTAS RECIENTES */}
          <section className="dashboard-card">
            <h3><i class="bi bi-bell-fill" style={{color: '#FDD55B'}}></i> Actividad y Novedades</h3>
            <p className="card-description">Eventos recientes en la plataforma</p>

            <ul className="activity-list">
              <li className="activity-item">
                <span className="activity-badge badge-green">Novedad</span>
                <div>
                  <p>Nueva evaluación del clima organizacional disponible.</p>

                </div>
              </li>

              <li className="activity-item">
                <span className="activity-badge badge-blue">Recomendación</span>
                <div>
                  <p>Revisa tu reporte mensual de equilibrio laboral.</p>

                </div>
              </li>

              <li className="activity-item">
                <span className="activity-badge badge-orange">Recordatorio</span>
                <div>
                  <p>Próxima sesión de pausas activas grupales.</p>

                </div>
              </li>
            </ul>
          </section>

        </div>

      </main>

    </div>
  );
}

export default Inicio;