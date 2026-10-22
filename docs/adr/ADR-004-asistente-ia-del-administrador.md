# ADR-004 · Asistente de IA del administrador (agente de solo lectura)

- **Estado:** Aceptada (falta la prueba con una clave real de la API)
- **Fecha:** 22/10/2026
- **Responsables:** Manuela Córdoba Robledo, Davier Andrés Quinto Bejarano

## Contexto

En T5 le contamos al instructor que el proyecto iba a tener un agente de IA y lo aceptó, con la advertencia de que había que saberlo usar. Además de usar IA como herramienta para construir (P00, sección 6), decidimos agregar una función real: que el administrador de una academia pueda preguntar en sus palabras cosas como "¿qué salón estuvo más vacío este mes?" o "¿a quién se le vence la membresía esta semana?", sin tener que buscar en cada reporte.

Un agente de IA trae riesgos propios que hay que controlar desde el diseño: que invente cifras, que alguien lo engañe para hacer cosas que no debe (inyección de instrucciones), que vea datos de otra academia, que mande datos personales de más a un tercero o que el costo se dispare.

## Decisión

- **Un agente pequeño y de solo lectura.** El modelo recibe la pregunta y 5 herramientas que **solo consultan**: ocupación por salón, ingresos, asistencia, membresías y clases programadas. No existe ninguna herramienta que cree, cambie o borre datos, así que aunque alguien intente engañarlo no puede modificar nada (OWASP LLM06, agencia excesiva).
- **Las mismas cuentas que ve el administrador.** Las herramientas usan los cálculos de `utils/reportes.js`, que también usa la pantalla de reportes. El asistente no hace SQL ni cálculos propios.
- **La academia la pone el servidor, no el modelo.** Cada herramienta recibe el cliente aislado `req.db` y el `tenantId` del token (RN-04). El modelo no puede pedir datos de otra academia.
- **Datos mínimos.** Las herramientas devuelven nombres y cifras; nunca correos, teléfonos ni identificadores (Ley 1581 de 2012, principio de necesidad; SIC, Circular Externa 002 de 2024). La pregunta no se guarda en la bitácora: solo queda "Consultó al asistente de IA".
- **Modelo y API.** Claude (`claude-opus-5-5`, configurable con `ASISTENTE_MODELO`) con el SDK oficial `@anthropic-ai/sdk`, esfuerzo bajo (`effort: "low"`) porque son preguntas cortas, y el respaldo automático del servidor si el modelo rechaza una consulta (`fallbacks: "default"`).
- **Bucle propio con límites.** Se programa el bucle a mano en `utils/asistente/asistente.js` (y no con el ayudante del SDK, que está en beta) para controlar cada paso: máximo 6 vueltas, rechazos, respuestas demasiado largas y errores. Las herramientas tienen esquema estricto (`strict: true`) y validan las fechas; si fallan, el error vuelve al modelo para que corrija.
- **Límite de uso.** 20 preguntas por hora por usuario y preguntas de máximo 500 caracteres (OWASP LLM10, consumo sin límite).
- **Opcional.** Sin `ANTHROPIC_API_KEY` el asistente queda apagado y el resto de la app funciona igual; la pantalla lo avisa.
- **Transparencia.** La pantalla dice que la respuesta la genera una IA, muestra qué reportes consultó y recomienda revisar las cifras importantes en Reportes.

## Alternativas consideradas

| Alternativa | Por qué no se eligió |
|---|---|
| Dejar que el modelo escriba consultas SQL | Puede leer tablas que no debe, saltarse el aislamiento por academia o escribir consultas lentas. Con herramientas cerradas el servidor decide qué se consulta. |
| Darle herramientas que cambian datos (registrar pagos, cancelar clases) | Un error o un engaño tendría consecuencias reales. Esas acciones ya tienen sus pantallas con validaciones. |
| Usar un framework de agentes | Agrega capas que esconden lo que se le manda al modelo; para 5 herramientas basta el SDK oficial. |
| Mandar la tabla completa de estudiantes al modelo | Más datos personales de los necesarios y más costo. |

## Consecuencias

**Positivas**

- El administrador obtiene respuestas rápidas con las mismas cifras de los reportes.
- El riesgo está acotado: no puede cambiar nada, no ve otras academias y no recibe correos ni teléfonos.
- Se prueba sin gastar dinero: las 10 pruebas del backend (CP-183 a CP-192) usan un modelo simulado, y las 3 de la pantalla (CP-193 a CP-195) una API falsa.

**Negativas / riesgos aceptados**

- Tiene costo por uso (se paga en console.anthropic.com) y depende de un servicio externo; si falla, la pantalla lo explica y los reportes siguen disponibles.
- Los nombres de los estudiantes salen hacia un proveedor en Estados Unidos. Antes de usarlo con una academia real hay que actualizar la política de tratamiento de datos para nombrar a Anthropic como encargado y la transferencia internacional (pendiente).
- Una IA puede equivocarse al redactar. Por eso las cifras salen de herramientas, se dice qué se consultó y se pide verificar.
- Falta probar con una clave real: hasta ahora la petición llegó a la API y fue rechazada por la clave de prueba, como se esperaba.

## Referencias

- Anthropic, *Building effective agents*: https://www.anthropic.com/research/building-effective-agents
- OWASP Top 10 for LLM Applications 2025 (LLM01 inyección de instrucciones, LLM02 datos sensibles, LLM06 agencia excesiva, LLM10 consumo sin límite).
- SIC, Circular Externa 002 de 2024 (tratamiento de datos personales en sistemas de IA). Ley 1581 de 2012.
- RF-23 · HU-24 · CC-15. P00, sección 6 (uso de IA como herramienta de desarrollo).
