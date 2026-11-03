// Foto de perfil (HU-07) o, si la persona no ha subido una, sus iniciales.
function inicialesDe(nombre) {
  return (nombre || '?')
    .split(' ')
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

export default function Avatar({ nombre, foto, tamano = 'h-8 w-8 text-xs' }) {
  if (foto) {
    return <img src={foto} alt={`Foto de ${nombre || 'perfil'}`} className={`${tamano} shrink-0 rounded-full object-cover`} />
  }
  return (
    <div
      className={`${tamano} flex shrink-0 items-center justify-center rounded-full bg-indigo-100 font-semibold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300`}
    >
      {inicialesDe(nombre)}
    </div>
  )
}
