import { useState, useEffect } from "react";
import { Link } from "react-router-dom";

function Perfil() {
  const [perfil, setPerfil] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    // 1. Obtener el usuario guardado en el login
    const usuarioSesion = JSON.parse(localStorage.getItem("usuario"));

    if (usuarioSesion && usuarioSesion.id) {
      // 2. Traer los datos del perfil desde la base de datos
      fetch(`http://localhost:5000/api/perfil/${usuarioSesion.id}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.exito) {
            setPerfil(data.perfil);
          }
        })
        .catch((err) => console.error("Error al cargar datos del perfil:", err))
        .finally(() => setCargando(false));
    } else {
      setCargando(false);
    }
  }, []);

  // Función para formatear la fecha que viene de PostgreSQL
  const formatearFecha = (fechaStr) => {
    if (!fechaStr) return "Sin registrar";
    const fecha = new Date(fechaStr);
    return fecha.toLocaleDateString("es-ES", {
      day: "numeric",
      month: "long",
      year: "numeric"
    });
  };

  if (cargando) return <div className="perfil-container"><p>Cargando perfil...</p></div>;

  return (
    <div className="perfil-container"> 
      <div className="perfil-header">
        <Link to="/inicio" className="menu-item5">
         <i class="bi bi-arrow-left"></i>
        </Link>
        <div className="perfil-foto"> <i class="bi bi-person-fill"></i> </div> 
        <div className="perfil-titulo"> 
          <h1>{perfil ? perfil.nombre : "Usuario"}</h1> 
          <p>{perfil ? (perfil.puesto || perfil.rol) : "Colaborador"}</p>
        </div> 
      </div> 

      <div className="perfil-contenido"> 
        <div className="perfil-card"> 
          <h2>Información personal</h2> 

          <div className="dato"> 
            <span>Nombre completo</span> 
            <strong>{perfil ? perfil.nombre : "—"}</strong>
          </div> 

          <div className="dato"> 
            <span>Correo electrónico</span> 
            <strong>{perfil ? perfil.email : "—"}</strong>
          </div> 

          <div className="dato"> 
            <span>Teléfono</span> 
            <strong>{perfil?.telefono || "Sin registrar"}</strong>
          </div> 
        </div> 

        <div className="perfil-card"> 
          <h2>Información laboral</h2> 

          <div className="dato"> 
            <span>Puesto</span> 
            <strong>{perfil?.puesto || perfil?.rol || "Sin asignar"}</strong>
          </div> 

          <div className="dato"> 
            <span>Departamento</span> 
            <strong>{perfil?.departamento || "Sin asignar"}</strong>
          </div> 

          <div className="dato"> 
            <span>Fecha de ingreso</span> 
            <strong>{perfil ? formatearFecha(perfil.fecha_ingreso) : "—"}</strong>
          </div> 
        </div> 
      </div> 
    </div>
  );
}

export default Perfil;