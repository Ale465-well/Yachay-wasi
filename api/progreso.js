// api/progreso.js
// Consulta y guarda el progreso de cada alumno en las historias, usando
// Vercel KV como base de datos compartida (así funciona entre dispositivos).
//
// Ahora guarda además:
//   - historia_titulo : el nombre del cuento (para mostrarlo al profesor/a)
//   - intentos        : cuántos intentos usó el alumno en esa pregunta
//   - acerto          : true si respondió bien, false si agotó los intentos

import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const { usuarioId, historiaId } = req.query;

    if (!usuarioId) {
      return res.status(400).json({ ok: false, error: 'Falta usuarioId' });
    }

    const progreso = (await kv.get('progreso')) || [];

    let resultado = progreso.filter(p => p.usuario_id === usuarioId);
    if (historiaId) {
      resultado = resultado.filter(p => p.historia_id === historiaId);
    }

    return res.status(200).json({ ok: true, progreso: resultado });
  }

  if (req.method === 'POST') {
    const {
      usuario_id,
      historia_id,
      historia_titulo,
      parte,
      completada,
      intentos,
      acerto
    } = req.body || {};

    if (!usuario_id || !historia_id || parte === undefined || parte === null) {
      return res.status(400).json({ ok: false, error: 'Faltan datos de progreso.' });
    }

    const progreso = (await kv.get('progreso')) || [];

    const registro = {
      usuario_id,
      historia_id,
      historia_titulo: historia_titulo || historia_id,
      parte,
      completada: completada !== false,
      intentos: Number(intentos) > 0 ? Number(intentos) : 1,
      acerto: acerto !== false,
      fecha: new Date().toISOString()
    };

    const indice = progreso.findIndex(
      p =>
        p.usuario_id === usuario_id &&
        p.historia_id === historia_id &&
        p.parte === parte
    );

    if (indice === -1) {
      progreso.push(registro);
    } else {
      // Se conserva la primera fecha, pero se actualizan los datos nuevos
      // (por ejemplo si el registro antiguo no tenía intentos ni título).
      registro.fecha = progreso[indice].fecha || registro.fecha;
      progreso[indice] = registro;
    }

    await kv.set('progreso', progreso);

    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ ok: false, error: 'Método no permitido' });
}
