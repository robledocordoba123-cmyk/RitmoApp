// Un solo lugar que sabe a qué panel pertenece cada rol, para no repetir
// este mapeo en el login, en las rutas protegidas y en los redirects.
export function rutaInicioPara(rol) {
  switch (rol) {
    case "SUPERADMIN":
      return "/superadmin/academias";
    case "ADMIN_ACADEMIA":
      return "/admin/clases";
    case "PROFESOR":
      return "/profesor/clases";
    case "ESTUDIANTE":
      return "/estudiante/catalogo";
    default:
      return "/login";
  }
}
