import OpenAI, { toFile } from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Modelo de transcrição: gpt-4o-mini-transcribe é MUITO melhor que whisper-1 pra
// PT-BR (captura sotaques, gírias e termos de domínio). Fallback pra whisper-1
// se por algum motivo o modelo novo der erro (ex: quota, indisponibilidade).
const PRIMARY_MODEL = 'gpt-4o-mini-transcribe';
const FALLBACK_MODEL = 'whisper-1';

// Prompt de contexto — o Whisper/GPT-4o usa isso como "vocabulário" pra
// transcrever termos específicos do domínio. Sem isso, "Chalé da Floresta"
// vira "chá da floresta", "Pedro II" vira "pedrinho", "PIX" vira "picks", etc.
const TRANSCRIPTION_PROMPT = [
  'Transcrição de áudio em português brasileiro de uma mensagem de WhatsApp',
  'para reserva de chalé no Recanto da Serra em Pedro II, Piauí.',
  'Termos comuns: Chalé da Floresta, Chalé do Horizonte, Chalé do Mirante,',
  'Chalé da Montanha, Chalé Pôr do Sol, diária, hóspede, check-in, check-out,',
  'reserva, PIX, comprovante, CPF, piscina, banheira, churrasqueira, deck,',
  'final de semana, feriado, pacote, orçamento, Serena.'
].join(' ');

// Detecta se o payload base64 tem o prefixo "data:audio/..;base64," (alguns
// webhooks da Evolution mandam com prefixo, outros não).
function stripDataUrlPrefix(b64: string): string {
  const match = b64.match(/^data:[^;]+;base64,(.+)$/);
  return match ? match[1] : b64;
}

async function transcribeWithModel(
  file: Awaited<ReturnType<typeof toFile>>,
  model: string
): Promise<string> {
  const transcription = await openai.audio.transcriptions.create({
    model,
    file,
    language: 'pt',
    prompt: TRANSCRIPTION_PROMPT,
    // temperature baixo reduz alucinação do Whisper em trechos de silêncio
    temperature: 0
  });
  return (transcription.text || '').trim();
}

export async function transcribeAudio(audioBase64: string): Promise<string> {
  const started = Date.now();
  const cleanB64 = stripDataUrlPrefix(audioBase64);
  const buffer = Buffer.from(cleanB64, 'base64');

  console.log(
    `[media] transcribe start: b64=${audioBase64.length} chars, buffer=${buffer.length} bytes`
  );

  if (buffer.length < 500) {
    // Menos de 500 bytes não é áudio válido — Whisper vai dar erro ou retornar
    // texto vazio. Melhor abortar cedo com log claro.
    throw new Error(`audio buffer muito pequeno (${buffer.length} bytes) — provável base64 corrompido`);
  }

  // WhatsApp PTT é sempre audio/ogg com codec opus.
  const file = await toFile(buffer, 'audio.ogg', { type: 'audio/ogg' });

  try {
    const text = await transcribeWithModel(file, PRIMARY_MODEL);
    const elapsed = Date.now() - started;
    console.log(
      `[media] transcribe ok (${PRIMARY_MODEL}) em ${elapsed}ms: "${text.slice(0, 120)}"${text.length > 120 ? '…' : ''}`
    );
    return text || '[Áudio sem fala detectada]';
  } catch (err: any) {
    console.warn(
      `[media] ${PRIMARY_MODEL} falhou (${err?.status || '?'} ${err?.message || err}). Tentando ${FALLBACK_MODEL}…`
    );
    // Recria o file (streams consumidos não podem ser reutilizados)
    const retryFile = await toFile(buffer, 'audio.ogg', { type: 'audio/ogg' });
    try {
      const text = await transcribeWithModel(retryFile, FALLBACK_MODEL);
      const elapsed = Date.now() - started;
      console.log(
        `[media] transcribe ok (fallback ${FALLBACK_MODEL}) em ${elapsed}ms: "${text.slice(0, 120)}"${text.length > 120 ? '…' : ''}`
      );
      return text || '[Áudio sem fala detectada]';
    } catch (err2: any) {
      const elapsed = Date.now() - started;
      console.error(
        `[media] transcribe FALHOU em ${elapsed}ms. Ambos modelos erraram. Último erro:`,
        err2?.status, err2?.message
      );
      throw err2;
    }
  }
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
