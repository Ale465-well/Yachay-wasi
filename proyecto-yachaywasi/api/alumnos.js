// api/alumnos.js
// Devuelve la lista de alumnos inscritos con el código de clase de un profesor,
// junto con cuántas partes de historias ha completado cada uno.

import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Método no permitido' });
  }

  const { profesorId } = req.query;

  if (!profesorId) {
    return res.status(400).json({ ok: false, error: 'Falta profesorId' });
  }

  const usuarios = (await kv.get('usuarios')) || [];
  const progreso = (await kv.get('progreso')) || [];

  const alumnos = usuarios
    .filter(u => u.tipo === 'estudiante' && u.profesorId === profesorId)
    .map(alumno => {
      const partesCompletadas = progreso.filter(
        p => p.usuario_id === alumno.id && p.completada
      ).length;

      return {
        id: alumno.id,
        nombre: alumno.nombre,
        partesCompletadas
      };
    });

  return res.status(200).json({ ok: true, alumnos });
}
