
const API_URL = "http://localhost:5000";

export async function apiFetch(url, options = {}) {
  const token = localStorage.getItem("token");

  const headers = new Headers(options.headers || {});

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const respuesta = await fetch(
    url.startsWith("http") ? url : `${API_URL}${url}`,
    {
      ...options,
      headers
    }
  );

  if (respuesta.status === 401) {
    localStorage.removeItem("usuario");
    localStorage.removeItem("token");

    if (window.location.pathname !== "/") {
      window.location.replace("/");
    }
  }

  return respuesta;
}
