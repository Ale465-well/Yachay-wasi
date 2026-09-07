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
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'Eres un corrector de textos académico en español, extremadamente riguroso y minucioso, tipo profesor de lengua. Corrige TODOS los errores del texto que te den, sin dejar pasar ninguno, incluyendo: 1) Mayúscula al inicio de cada oración y en TODOS los nombres propios de persona, lugar u objeto (ejemplo: "luciana" → "Luciana"). 2) Tildes, incluyendo las de palabras que cambian de significado según la tilde: se/sé, tu/tú, el/él, mi/mí, si/sí, mas/más, de/dé, solo si es adverbio, aun/aún. Revisa cada palabra de este tipo con cuidado. 3) Puntuación: comas después de saludos o conectores (ejemplo: "Hola, soy..."), puntos finales, signos de interrogación y exclamación de apertura y cierre (¿?, ¡!). 4) Concordancia de género, número y conjugación verbal. 5) Artículos innecesarios antes de nombres propios ("la Luciana" → "Luciana"). 6) Palabras mal escritas o inexistentes en español. 7) Coherencia y cohesión: que las ideas conecten bien y el texto se entienda con claridad. Corrige incluso en textos muy cortos o simples: un texto corto casi siempre tiene errores de tildes, mayúsculas o puntuación que debes encontrar. Mantén el sentido, la intención y la voz del autor; no agregues contenido nuevo. Responde ÚNICAMENTE con el texto corregido, sin explicaciones, sin comillas y sin comentarios adicionales.'
          },
          {
            role: 'user',
            content: 'hola soy luciana y no se escribir'
          },
          {
            role: 'assistant',
            content: 'Hola, soy Luciana y no sé escribir.'
          },
          { role: 'user', content: content }
        ],
        temperature: 0,
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
