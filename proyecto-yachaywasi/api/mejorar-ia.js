// Esta función corre en el SERVIDOR de Vercel, nunca en el navegador del usuario.
// Por eso la API key (guardada como variable de entorno) nunca queda expuesta.

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const { content } = req.body || {};

  if (!content || !content.trim()) {
    return res.status(400).json({ error: 'Falta el texto a corregir' });
  }

  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'No se configuró OPENAI_API_KEY en el servidor' });
  }

  try {
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + apiKey
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'Eres un corrector de textos académico en español, riguroso y minucioso. Tu tarea es corregir TODOS los errores del texto que te den, incluyendo: ortografía y tildes; puntuación; concordancia de género y número; conjugación de verbos; uso incorrecto de artículos antes de nombres propios (ejemplo: "la Luciana" debe quedar como "Luciana"); palabras mal escritas o inexistentes en español; y coherencia y cohesión (que las ideas se conecten bien y el texto se entienda con claridad). Corrige cualquier error por pequeño que sea, incluso en textos muy cortos o simples — no asumas que un texto corto no tiene errores. Mantén el sentido, la intención y la voz del autor; no agregues contenido nuevo ni cambies el significado. Responde ÚNICAMENTE con el texto corregido, sin explicaciones, sin comillas y sin comentarios adicionales.'
          },
          { role: 'user', content: content }
        ],
        temperature: 0.2,
        max_tokens: 800
      })
    });

    if (!openaiResponse.ok) {
      const errText = await openaiResponse.text();
      console.error('Error de OpenAI:', errText);
      return res.status(502).json({ error: 'Error al consultar la IA' });
    }

    const data = await openaiResponse.json();
    const improved = data.choices[0].message.content.trim();

    return res.status(200).json({ improved });

  } catch (err) {
    console.error('Error en el servidor:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}
