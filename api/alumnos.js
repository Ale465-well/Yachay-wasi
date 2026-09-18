// api/alumnos.js
// Devuelve la lista de alumnos inscritos con el código de clase de un profesor,
// con el detalle de QUÉ cuento leyó cada uno, qué parte, cuántos intentos usó
// en cada pregunta y si acertó o no.

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
      const suyo = progreso.filter(p => p.usuario_id === alumno.id && p.completada);

      // Agrupar por cuento
      const mapa = new Map();

      suyo.forEach(p => {
        if (!mapa.has(p.historia_id)) {
          mapa.set(p.historia_id, {
            historia_id: p.historia_id,
            historia_titulo: p.historia_titulo || p.historia_id,
            partes: []
          });
        }
        mapa.get(p.historia_id).partes.push({
          parte: p.parte,
          numero: (Number(p.parte) || 0) + 1,
          intentos: Number(p.intentos) > 0 ? Number(p.intentos) : 1,
          acerto: p.acerto !== false,
          fecha: p.fecha || null
        });
      });

      const historias = Array.from(mapa.values()).map(h => {
        h.partes.sort((a, b) => a.parte - b.parte);
        return {
          ...h,
          partesCompletadas: h.partes.length,
          totalIntentos: h.partes.reduce((s, x) => s + x.intentos, 0),
          aciertos: h.partes.filter(x => x.acerto).length
        };
      });

      historias.sort((a, b) =>
        String(a.historia_titulo).localeCompare(String(b.historia_titulo))
      );

      return {
        id: alumno.id,
        nombre: alumno.nombre,
        partesCompletadas: suyo.length,
        totalIntentos: historias.reduce((s, h) => s + h.totalIntentos, 0),
        aciertos: historias.reduce((s, h) => s + h.aciertos, 0),
        historias
      };
    });

  alumnos.sort((a, b) => String(a.nombre).localeCompare(String(b.nombre)));

  return res.status(200).json({ ok: true, alumnos });
}
