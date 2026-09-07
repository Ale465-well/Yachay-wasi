// api/usuarios.js
// Registro / ingreso de usuarios (profesor y estudiante) usando Vercel KV
// como base de datos compartida en la nube (no localStorage).

import { kv } from '@vercel/kv';

function generarCodigoClase() {
  // Sin caracteres confusos (0/O, 1/I, etc.)
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'YW-';
  for (let i = 0; i < 5; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Método no permitido' });
  }

  const { nombre, tipo, clave, correo, codigoClase } = req.body || {};

  if (!nombre || !nombre.trim() || nombre.trim().length < 2) {
    return res.status(400).json({ ok: false, error: 'El nombre debe tener al menos 2 caracteres.' });
  }

  if (tipo !== 'profesor' && tipo !== 'estudiante') {
    return res.status(400).json({ ok: false, error: 'Tipo de usuario inválido.' });
  }

  const nombreLimpio = nombre.trim();
  const usuarios = (await kv.get('usuarios')) || [];

  /* ---------- PROFESOR ---------- */
  if (tipo === 'profesor') {
    if (!clave || clave.length < 4) {
      return res.status(400).json({ ok: false, error: 'La clave de profesor/a debe tener al menos 4 caracteres.' });
    }
    if (!correo || !correo.includes('@')) {
      return res.status(400).json({ ok: false, error: 'Ingresa un correo válido.' });
    }

    let user = usuarios.find(
      u => u.tipo === 'profesor' && u.nombre.toLowerCase() === nombreLimpio.toLowerCase()
    );

    if (user) {
      if (user.clave !== clave) {
        return res.status(401).json({ ok: false, error: 'Clave incorrecta para este usuario de profesor/a.' });
      }
    } else {
      let codigo;
      do {
        codigo = generarCodigoClase();
      } while (usuarios.some(u => u.codigoClase === codigo));

      user = {
        id: 'p_' + Date.now() + '_' + Math.floor(Math.random() * 10000),
        nombre: nombreLimpio,
        tipo: 'profesor',
        clave,
        correo: correo.trim(),
        codigoClase: codigo
      };

      usuarios.push(user);
      await kv.set('usuarios', usuarios);
    }

    const { clave: _omit, ...userSinClave } = user;
    return res.status(200).json({ ok: true, usuario: userSinClave });
  }

  /* ---------- ESTUDIANTE ---------- */
  if (!codigoClase || !codigoClase.trim()) {
    return res.status(400).json({ ok: false, error: 'Ingresa el código de clase de tu profesor/a.' });
  }

  const codigoLimpio = codigoClase.trim().toUpperCase();

  const profesor = usuarios.find(
    u => u.tipo === 'profesor' && u.codigoClase === codigoLimpio
  );

  if (!profesor) {
    return res.status(404).json({ ok: false, error: 'No se encontró ningún profesor/a con ese código de clase.' });
  }

  let user = usuarios.find(
    u => u.tipo === 'estudiante' &&
         u.nombre.toLowerCase() === nombreLimpio.toLowerCase() &&
         u.profesorId === profesor.id
  );

  if (!user) {
    user = {
      id: 'e_' + Date.now() + '_' + Math.floor(Math.random() * 10000),
      nombre: nombreLimpio,
      tipo: 'estudiante',
      profesorId: profesor.id
    };

    usuarios.push(user);
    await kv.set('usuarios', usuarios);
  }

  return res.status(200).json({ ok: true, usuario: user });
}
