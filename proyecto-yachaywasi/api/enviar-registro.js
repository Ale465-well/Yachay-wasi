// api/enviar-registro.js
// Envía al correo del profesor/a un resumen de sus alumnos inscritos y su
// progreso, usando su propia cuenta de Gmail (con contraseña de aplicación)
// a través de nodemailer. No se necesita ningún servicio externo aparte de
// Gmail, OpenAI y Vercel.

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

  const profesor = usuarios.find(u => u.id === profesorId && u.tipo === 'profesor');

  if (!profesor) {
    return res.status(404).json({ ok: false, error: 'No se encontró el profesor/a.' });
  }

  if (!profesor.correo) {
    return res.status(400).json({ ok: false, error: 'Este profesor/a no tiene un correo guardado.' });
  }

  const alumnos = usuarios.filter(u => u.tipo === 'estudiante' && u.profesorId === profesorId);

  const filas = alumnos.map(a => {
    const partes = progreso.filter(p => p.usuario_id === a.id && p.completada).length;
    return (
      '<tr>' +
      '<td style="padding:6px 10px;border:1px solid #ddd;">' + escaparHtml(a.nombre) + '</td>' +
      '<td style="padding:6px 10px;border:1px solid #ddd;text-align:center;">' + partes + '</td>' +
      '</tr>'
    );
  }).join('');

  const html =
    '<div style="font-family:Arial,sans-serif;color:#2B241C;">' +
    '<h2 style="color:#1B2A4A;">Registro de alumnos — Yachay Wasi</h2>' +
    '<p>Hola ' + escaparHtml(profesor.nombre) + ', este es el registro de tus alumnos inscritos con el código de clase ' +
    '<strong>' + escaparHtml(profesor.codigoClase) + '</strong>:</p>' +
    '<table style="border-collapse:collapse;margin-top:10px;">' +
    '<thead><tr>' +
    '<th style="padding:6px 10px;border:1px solid #ddd;background:#F0CE84;">Alumno</th>' +
    '<th style="padding:6px 10px;border:1px solid #ddd;background:#F0CE84;">Partes completadas</th>' +
    '</tr></thead><tbody>' +
    (filas || '<tr><td colspan="2" style="padding:10px;">Aún no tienes alumnos inscritos.</td></tr>') +
    '</tbody></table>' +
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
