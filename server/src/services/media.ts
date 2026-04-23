import OpenAI, { toFile } from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function transcribeAudio(audioBase64: string): Promise<string> {
  const buffer = Buffer.from(audioBase64, 'base64');
  const file = await toFile(buffer, 'audio.ogg', { type: 'audio/ogg' });

  const transcription = await openai.audio.transcriptions.create({
    model: 'whisper-1',
    file,
    language: 'pt'
  });

  return transcription.text || '[Áudio não compreendido]';
}

export async function describeImage(imageBase64: string, caption?: string): Promise<string> {
  const userText = caption
    ? `O cliente enviou uma imagem com a legenda: "${caption}". Descreva o que vê na imagem de forma útil para o contexto de reservas de chalé (comprovante de pagamento, foto, documento, etc).`
    : 'O cliente enviou uma imagem. Descreva o que vê de forma útil para o contexto de reservas de chalé (comprovante de pagamento, foto, documento, etc).';

  const response = await openai.chat.completions.create({
    model: 'gpt-4.1',
    max_tokens: 400,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: userText },
          { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${imageBase64}`, detail: 'low' } }
        ]
      }
    ]
  });

  return response.choices[0]?.message?.content || '[Imagem não interpretada]';
}
