// api/enviar-registro.js
// Envía al correo del profesor/a un resumen detallado de sus alumnos:
// qué cuento leyó cada uno, qué parte, cuántos intentos usó y si acertó.

import { kv } from '@vercel/kv';
import nodemailer from 'nodemailer';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Método no permitido' });
  }

  const { profesorId } = req.body || {};

  if (!profesorId) {
    return res.status(400).json({ ok: false, error: 'Falta profesorId' });
  }

  const gmailUser = process.env.GMAIL_USER;
  const gmailPass = process.env.GMAIL_APP_PASSWORD;

  if (!gmailUser || !gmailPass) {
    return res.status(500).json({ ok: false, error: 'Falta configurar GMAIL_USER / GMAIL_APP_PASSWORD en el servidor.' });
  }

  const usuarios = (await kv.get('usuarios')) || [];
  const progreso = (await kv.get('progreso')) || [];
  const publicaciones = (await kv.get('publicaciones')) || [];

  const profesor = usuarios.find(u => u.id === profesorId && u.tipo === 'profesor');

  if (!profesor) {
    return res.status(404).json({ ok: false, error: 'No se encontró el profesor/a.' });
  }

  if (!profesor.correo) {
    return res.status(400).json({ ok: false, error: 'Este profesor/a no tiene un correo guardado.' });
  }

  const alumnos = usuarios.filter(u => u.tipo === 'estudiante' && u.profesorId === profesorId);

  const borde = 'padding:6px 10px;border:1px solid #ddd;';
  const cabecera = 'padding:6px 10px;border:1px solid #ddd;background:#F0CE84;text-align:left;';

  let bloques = '';

  alumnos
    .slice()
    .sort((a, b) => String(a.nombre).localeCompare(String(b.nombre)))
    .forEach(a => {
      const suyo = progreso
        .filter(p => p.usuario_id === a.id && p.completada)
        .sort((x, y) => {
          const t = String(x.historia_titulo || '').localeCompare(String(y.historia_titulo || ''));
          return t !== 0 ? t : (x.parte - y.parte);
        });

      bloques +=
        '<h3 style="margin:22px 0 6px;color:#1B2A4A;">' + escaparHtml(a.nombre) + '</h3>';

      if (suyo.length === 0) {
        bloques += '<p style="margin:0;color:#666;">Todavía no ha leído ninguna historia.</p>';
        return;
      }

      bloques +=
        '<table style="border-collapse:collapse;margin-top:4px;">' +
        '<thead><tr>' +
        '<th style="' + cabecera + '">Cuento</th>' +
        '<th style="' + cabecera + '">Parte</th>' +
        '<th style="' + cabecera + '">Intentos</th>' +
        '<th style="' + cabecera + '">Resultado</th>' +
        '</tr></thead><tbody>' +
        suyo.map(p => {
          const intentos = Number(p.intentos) > 0 ? Number(p.intentos) : 1;
          const acerto = p.acerto !== false;
          return '<tr>' +
            '<td style="' + borde + '">' + escaparHtml(p.historia_titulo || p.historia_id) + '</td>' +
            '<td style="' + borde + 'text-align:center;">' + ((Number(p.parte) || 0) + 1) + '</td>' +
            '<td style="' + borde + 'text-align:center;">' + intentos + '</td>' +
            '<td style="' + borde + '">' + (acerto ? '✅ Acertó' : '❌ Agotó los intentos') + '</td>' +
            '</tr>';
        }).join('') +
        '</tbody></table>';

      const misPubs = publicaciones.filter(pub => pub.usuario_id === a.id);
      if (misPubs.length > 0) {
        bloques +=
          '<p style="margin:8px 0 0;color:#444;">📝 Historias publicadas en el tablón: ' +
          misPubs.map(pub => '<em>' + escaparHtml(pub.title) + '</em>').join(', ') +
          '</p>';
      }
    });

  const html =
    '<div style="font-family:Arial,sans-serif;color:#2B241C;">' +
    '<h2 style="color:#1B2A4A;">Registro de alumnos — Yachay Wasi</h2>' +
    '<p>Hola ' + escaparHtml(profesor.nombre) + ', este es el registro detallado de tus alumnos inscritos con el código de clase ' +
    '<strong>' + escaparHtml(profesor.codigoClase) + '</strong>:</p>' +
    (bloques || '<p>Aún no tienes alumnos inscritos.</p>') +
    '</div>';

  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: gmailUser,
        pass: gmailPass
      }
    });

    await transporter.sendMail({
      from: '"Yachay Wasi" <' + gmailUser + '>',
      to: profesor.correo,
      subject: 'Registro de alumnos — Yachay Wasi',
      html
    });

    return res.status(200).json({ ok: true });

  } catch (err) {
    console.error('Error enviando correo:', err);
    return res.status(500).json({ ok: false, error: 'No se pudo enviar el correo.' });
  }
}

function escaparHtml(texto) {
  return String(texto)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
