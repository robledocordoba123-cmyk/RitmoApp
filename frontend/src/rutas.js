// Un solo lugar que sabe a qué panel pertenece cada rol, para no repetir
// este mapeo en el login, en las rutas protegidas y en los redirects.
export function rutaInicioPara(rol) {
  switch (rol) {
    case "SUPERADMIN":
      return "/superadmin/inicio";
    case "ADMIN_ACADEMIA":
      return "/admin/inicio";
    case "PROFESOR":
      return "/profesor/inicio";
    case "ESTUDIANTE":
      return "/estudiante/inicio";
    default:
      return "/login";
  }
}
