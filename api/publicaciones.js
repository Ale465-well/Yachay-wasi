// api/publicaciones.js
// Tablón de la comunidad guardado en Vercel KV (antes vivía en localStorage,
// por eso el profesor/a nunca veía las historias de sus alumnos).
//
// GET  /api/publicaciones?profesorId=XXX  -> historias de esa clase
// POST /api/publicaciones                 -> publica una historia nueva

import { kv } from '@vercel/kv';

const LIMITE = 500; // tope para que la lista no crezca sin control

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const { profesorId } = req.query;

    const publicaciones = (await kv.get('publicaciones')) || [];

    const resultado = profesorId
      ? publicaciones.filter(p => p.profesorId === profesorId)
      : publicaciones;

    // Más recientes primero
    const ordenadas = resultado
      .slice()
      .sort((a, b) => String(b.fecha || '').localeCompare(String(a.fecha || '')));

    return res.status(200).json({ ok: true, publicaciones: ordenadas });
  }

  if (req.method === 'POST') {
    const { usuario_id, nombre, profesorId, title, category, content } = req.body || {};

    if (!usuario_id || !nombre) {
      return res.status(400).json({ ok: false, error: 'Falta identificar al autor/a.' });
    }

    if (!content || !content.trim()) {
      return res.status(400).json({ ok: false, error: 'La historia está vacía.' });
    }

    const publicaciones = (await kv.get('publicaciones')) || [];

    const nueva = {
      id: 'pub_' + Date.now() + '_' + Math.floor(Math.random() * 10000),
      usuario_id,
      nombre,
      profesorId: profesorId || null,
      title: (title && title.trim()) || 'Sin título',
      category: category || 'Cuento',
      content: content.trim(),
      fecha: new Date().toISOString()
    };

    publicaciones.push(nueva);

    while (publicaciones.length > LIMITE) {
      publicaciones.shift();
    }

    await kv.set('publicaciones', publicaciones);

    return res.status(200).json({ ok: true, publicacion: nueva });
  }

  return res.status(405).json({ ok: false, error: 'Método no permitido' });
}
