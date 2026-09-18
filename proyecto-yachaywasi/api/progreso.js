// api/progreso.js
// Consulta y guarda el progreso de cada alumno en las historias, usando
// Vercel KV como base de datos compartida (así funciona entre dispositivos).

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
    const { usuario_id, historia_id, parte, completada } = req.body || {};

    if (!usuario_id || !historia_id || parte === undefined || parte === null) {
      return res.status(400).json({ ok: false, error: 'Faltan datos de progreso.' });
    }

    const progreso = (await kv.get('progreso')) || [];

    const existente = progreso.find(
      p =>
        p.usuario_id === usuario_id &&
        p.historia_id === historia_id &&
        p.parte === parte
    );

    if (!existente) {
      progreso.push({
        usuario_id,
        historia_id,
        parte,
        completada: completada !== false,
        fecha: new Date().toISOString()
      });

      await kv.set('progreso', progreso);
    }

    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ ok: false, error: 'Método no permitido' });
}
