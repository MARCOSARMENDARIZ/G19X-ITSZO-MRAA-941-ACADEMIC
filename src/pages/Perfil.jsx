import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";

function Perfil() {
  const [perfil, setPerfil] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [subiendoFoto, setSubiendoFoto] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const usuarioSesion = JSON.parse(localStorage.getItem("usuario"));

    if (usuarioSesion && usuarioSesion.id) {
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

  const formatearFecha = (fechaStr) => {
    if (!fechaStr) return "Sin registrar";
    const fecha = new Date(fechaStr);
    return fecha.toLocaleDateString("es-ES", {
      day: "numeric",
      month: "long",
      year: "numeric"
    });
  };

  // 1. Abrir selector de archivos al hacer clic en el contenedor de la foto
  const handleFotoClick = () => {
    fileInputRef.current.click();
  };

  // 2. Enviar la imagen seleccionada al backend
  const handleCambiarFoto = async (e) => {
    const archivo = e.target.files[0];
    if (!archivo) return;

    const usuarioSesion = JSON.parse(localStorage.getItem("usuario"));
    if (!usuarioSesion || !usuarioSesion.id) return;

    const formData = new FormData();
    formData.append("foto", archivo);

    setSubiendoFoto(true);

    try {
      const respuesta = await fetch(`http://localhost:5000/api/perfil/${usuarioSesion.id}/foto`, {
        method: "POST",
        body: formData,
      });

      const data = await respuesta.json();

      if (data.exito) {
        // Actualizamos la URL de la foto en el estado local
        setPerfil((prev) => ({ ...prev, foto_url: data.foto_url }));
      } else {
        alert(data.mensaje || "Error al subir la foto");
      }
    } catch (error) {
      console.error("Error al subir la imagen:", error);
      alert("Hubo un error al intentar subir la foto.");
    } finally {
      setSubiendoFoto(false);
    }
  };

  if (cargando) return <div className="perfil-container"><p>Cargando perfil...</p></div>;

  return (
    <div className="perfil-container"> 
      <div className="perfil-header">
        <Link to="/inicio" className="menu-item5">
          <i className="bi bi-arrow-left"></i>
        </Link>

        {/* Contenedor interactivo para la foto */}
        <div 
          className="perfil-foto" 
          onClick={handleFotoClick} 
          style={{ cursor: "pointer", position: "relative" }}
          title="Haz clic para cambiar tu foto"
        >
          {perfil?.foto_url ? (
            <img 
              src={perfil.foto_url.startsWith("http") ? perfil.foto_url : `http://localhost:5000${perfil.foto_url}`} 
              alt="Foto de perfil" 
              style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }}
            />
          ) : (
            <i className="bi bi-person-fill"></i>
          )}

          {subiendoFoto && <div className="foto-overlay">Subiendo...</div>}
        </div>

        {/* Input tipo archivo oculto */}
        <input 
          type="file" 
          ref={fileInputRef} 
          style={{ display: "none" }} 
          accept="image/*"
          onChange={handleCambiarFoto} 
        />

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