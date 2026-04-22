import OpenAI from 'openai';
import { MemoryService } from '../services/supabase.js';
import { getAgentConfig } from '../services/agent_config.js';
import { buildSystemPrompt } from './prompt.js';
import { executeTool, TOOL_DEFINITIONS, ToolResult } from './tools.js';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface SerenaResponse {
  text: string;
  transfer?: { reason: string };
}

export async function runSerena(
  conversationId: string,
  phone: string,
  userMessage: string,
  imageBase64?: string
): Promise<SerenaResponse> {
  const history = await MemoryService.get(conversationId, 10);

  // Monta o conteúdo da mensagem do usuário (texto + imagem opcional)
  type ContentPart =
    | { type: 'text'; text: string }
    | { type: 'image_url'; image_url: { url: string; detail: 'low' } };

  const userContent: ContentPart[] = [{ type: 'text', text: userMessage }];
  if (imageBase64) {
    userContent.push({
      type: 'image_url',
      image_url: { url: `data:image/jpeg;base64,${imageBase64}`, detail: 'low' }
    });
  }

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    ...history.map(h => ({ role: h.role as 'user' | 'assistant', content: h.content })),
    { role: 'user', content: userContent as any }
  ];

  let transfer: { reason: string } | undefined;
  let finalText = '';

  const config = await getAgentConfig();

  // Agentic loop
  for (let step = 0; step < 8; step++) {
    const response = await openai.chat.completions.create({
      model: 'gpt-4.1',
      max_tokens: 1500,
      tools: TOOL_DEFINITIONS.map(t => ({
        type: 'function' as const,
        function: {
          name: t.name,
          description: t.description,
          parameters: t.input_schema
        }
      })),
      tool_choice: 'auto',
      messages: [
        { role: 'system', content: buildSystemPrompt(config) },
        ...messages
      ]
    });

    const choice = response.choices[0];

    if (choice.finish_reason === 'stop' || choice.finish_reason === 'length') {
      finalText = choice.message.content || '';
      break;
    }

    if (choice.finish_reason === 'tool_calls' && choice.message.tool_calls) {
      messages.push(choice.message as any);

      for (const toolCall of choice.message.tool_calls) {
        let input: Record<string, unknown> = {};
        try { input = JSON.parse(toolCall.function.arguments); } catch {}

        const result: ToolResult = await executeTool(
          { name: toolCall.function.name, input },
          phone
        );

        if (result.type === 'transfer') {
          transfer = { reason: result.reason };
        }

        messages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: result.text
        });
      }
      continue;
    }

    // fallback
    finalText = choice.message.content || 'Estou com uma dificuldade técnica. Um momento!';
    break;
  }

  if (!finalText) finalText = 'Estou com uma dificuldade técnica. Um momento!';

  await MemoryService.append(conversationId, 'user', userMessage);
  await MemoryService.append(conversationId, 'assistant', finalText);
  await MemoryService.trim(conversationId, 20);

  return { text: finalText, transfer };
}
