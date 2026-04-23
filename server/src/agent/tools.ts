import { ReservationDB } from '../services/supabase.js';
import { WhatsApp } from '../services/whatsapp.js';

function parseDate(str: string): string {
  // Accepts DD/MM/YYYY → YYYY-MM-DD
  const parts = str.trim().split('/');
  if (parts.length === 3) return `${parts[2]}-${parts[1].padStart(2,'0')}-${parts[0].padStart(2,'0')}`;
  return str;
}

function chaletNameToId(name: string, chalets: { id: string; name: string }[]): string | null {
  const normalized = name.toLowerCase().trim();
  const found = chalets.find(c => c.name.toLowerCase().includes(normalized) || normalized.includes(c.name.toLowerCase().replace('chalé ', '').replace('chale ', '')));
  return found?.id || null;
}

function dayOfWeek(dateStr: string): number {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

function addDays(dateStr: string, n: number): string {
  // Use UTC explicitly to avoid off-by-one issues across server timezones
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d + n));
  return date.toISOString().split('T')[0];
}

function dateDiff(start: string, end: string): number {
  const s = new Date(start), e = new Date(end);
  return Math.round((e.getTime() - s.getTime()) / 86400000);
}

function toCurrency(val: number): string {
  return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export type ToolInput = {
  name: string;
  input: Record<string, unknown>;
};

export type ToolResult =
  | { type: 'text'; text: string }
  | { type: 'transfer'; reason: string; text: string };

export async function executeTool(tool: ToolInput, phone: string): Promise<ToolResult> {
  try {
    switch (tool.name) {
      case 'verificar_disponibilidade':
        return await toolVerificarDisponibilidade(tool.input);
      case 'calcular_orcamento':
        return await toolCalcularOrcamento(tool.input);
      case 'processar_reserva':
        return await toolProcessarReserva(tool.input, phone);
      case 'transferir_para_humano':
        return { type: 'transfer', reason: String(tool.input.motivo || 'Solicitação do cliente'), text: String(tool.input.mensagem || 'Vou chamar um atendente para você. Um momento!') };
      default:
        console.error(`[tools] Ferramenta desconhecida chamada: ${tool.name}`);
        return { type: 'text', text: `Ferramenta desconhecida: ${tool.name}` };
    }
  } catch (err: any) {
    console.error(`[tools] Erro em ${tool.name}:`, err.message);
    return { type: 'text', text: `Erro ao executar ${tool.name}: ${err.message}` };
  }
}

// Retorna true se o período contém segunda-feira (dia fechado, preço=0)
function hasMondayInRange(start: string, end: string): boolean {
  let curr = start;
  while (curr < end) {
    if (dayOfWeek(curr) === 1) return true;
    curr = addDays(curr, 1);
  }
  return false;
}

async function toolVerificarDisponibilidade(input: Record<string, unknown>): Promise<ToolResult> {
  const entrada = parseDate(String(input.dataDeEntrada));
  const saida = parseDate(String(input.dataDeSaida));

  if (!entrada || !saida || entrada >= saida) {
    return { type: 'text', text: 'Datas inválidas. Por favor, verifique as datas informadas.' };
  }

  const nights = dateDiff(entrada, saida);
  if (nights < 1) return { type: 'text', text: 'O mínimo é 1 diária.' };

  if (hasMondayInRange(entrada, saida)) {
    return { type: 'text', text: `O período de ${input.dataDeEntrada} a ${input.dataDeSaida} inclui uma segunda-feira, e o Recanto da Serra não recebe hóspedes às segundas. Que tal ajustar as datas? 😊` };
  }

  const chalets = await ReservationDB.getChalets();
  const results: string[] = [];

  for (const chalet of chalets) {
    const available = await ReservationDB.checkAvailability(chalet.id, entrada, saida);
    if (available) results.push(chalet.name);
  }

  if (results.length === 0) {
    return { type: 'text', text: `Infelizmente todos os chalés estão ocupados de ${input.dataDeEntrada} a ${input.dataDeSaida}. Deseja verificar outras datas?` };
  }

  return {
    type: 'text',
    text: `Chalés disponíveis de ${input.dataDeEntrada} a ${input.dataDeSaida} (${nights} diária${nights > 1 ? 's' : ''}):\n${results.map(n => `✅ ${n}`).join('\n')}`
  };
}

async function toolCalcularOrcamento(input: Record<string, unknown>): Promise<ToolResult> {
  const entrada = parseDate(String(input.dataDeEntrada));
  const saida = parseDate(String(input.dataDeSaida));
  const nomesChales = String(input.nomeDoChale);

  const allChalets = await ReservationDB.getChalets();
  const lines: string[] = [];

  const nomes = nomesChales.split(',').map(n => n.trim());

  for (const nome of nomes) {
    const chaletId = chaletNameToId(nome, allChalets);
    const chalet = allChalets.find(c => c.id === chaletId);
    if (!chalet) continue;

    const customPrices = await ReservationDB.getCustomPrices(chalet.id, entrada, saida);
    const priceMap = Object.fromEntries(customPrices.map(p => [p.date, Number(p.price)]));

    let total = 0;
    let curr = entrada;
    while (curr < saida) {
      let price = priceMap[curr];
      if (!price) {
        const dow = dayOfWeek(curr);
        if (dow === 1) price = 0;
        else if (dow >= 2 && dow <= 4) price = Number(chalet.base_price) * 0.85;
        else price = Number(chalet.base_price);
      }
      total += price;
      curr = addDays(curr, 1);
    }

    const noites = dateDiff(entrada, saida);
    const pix50 = total * 0.5;
    lines.push(`*${chalet.name}*\n${noites} diária${noites > 1 ? 's' : ''}: *${toCurrency(total)}*\nEntrada PIX (50%): ${toCurrency(pix50)}\nRestante no check-in: ${toCurrency(pix50)}`);
  }

  if (lines.length === 0) return { type: 'text', text: 'Não encontrei o chalé informado. Por favor, verifique o nome.' };

  return { type: 'text', text: lines.join('\n\n') };
}

async function toolProcessarReserva(input: Record<string, unknown>, phone: string): Promise<ToolResult> {
  const entrada = parseDate(String(input.dataDeEntrada));
  const saida = parseDate(String(input.dataDeSaida));
  const allChalets = await ReservationDB.getChalets();
  const chaletId = chaletNameToId(String(input.nomeDoChale), allChalets);
  const chalet = allChalets.find(c => c.id === chaletId);

  if (!chalet) return { type: 'text', text: 'Chalé não encontrado. Não foi possível criar a reserva.' };

  const reserva = await ReservationDB.createReservation({
    chaletId: chalet.id,
    guestName: String(input.nomeHospede),
    guestCpf: String(input.cpfHospede),
    guestPhone: phone,
    startDate: entrada,
    endDate: saida,
    totalValue: Number(input.valorTotal),
    observations: input.observacoes ? String(input.observacoes) : undefined
  });

  const teamMsg = `🏡 *Nova Reserva Criada!*\n\nHóspede: ${input.nomeHospede}\nCPF: ${input.cpfHospede}\nChalé: ${chalet.name}\nEntrada: ${input.dataDeEntrada}\nSaída: ${input.dataDeSaida}\nValor: ${toCurrency(Number(input.valorTotal))}\nTelefone: ${phone}\n\n⚠️ Aguarda validação do comprovante PIX.`;

  await WhatsApp.notifyTeam(teamMsg);

  return {
    type: 'text',
    text: `Reserva criada com sucesso! ID: ${reserva.id}`
  };
}

// Definições das ferramentas para o Anthropic SDK
export const TOOL_DEFINITIONS = [
  {
    name: 'verificar_disponibilidade',
    description: 'Verifica quais chalés estão disponíveis para um período. Chame SEMPRE que o cliente perguntar sobre disponibilidade, mesmo que já tenha perguntado antes.',
    input_schema: {
      type: 'object' as const,
      properties: {
        dataDeEntrada: { type: 'string', description: 'Data de entrada no formato DD/MM/AAAA' },
        dataDeSaida: { type: 'string', description: 'Data de saída no formato DD/MM/AAAA' }
      },
      required: ['dataDeEntrada', 'dataDeSaida']
    }
  },
  {
    name: 'calcular_orcamento',
    description: 'Calcula o valor total da hospedagem para um ou mais chalés. Só chame após confirmar disponibilidade.',
    input_schema: {
      type: 'object' as const,
      properties: {
        dataDeEntrada: { type: 'string', description: 'Data de entrada no formato DD/MM/AAAA' },
        dataDeSaida: { type: 'string', description: 'Data de saída no formato DD/MM/AAAA' },
        nomeDoChale: { type: 'string', description: 'Nome do chalé ou lista separada por vírgula para múltiplos' }
      },
      required: ['dataDeEntrada', 'dataDeSaida', 'nomeDoChale']
    }
  },
  {
    name: 'processar_reserva',
    description: 'Cria a reserva no sistema e notifica a equipe. Só chame quando o cliente REALMENTE anexar o comprovante de pagamento PIX.',
    input_schema: {
      type: 'object' as const,
      properties: {
        dataDeEntrada: { type: 'string', description: 'Data de entrada DD/MM/AAAA' },
        dataDeSaida: { type: 'string', description: 'Data de saída DD/MM/AAAA' },
        nomeDoChale: { type: 'string', description: 'Nome exato do chalé escolhido' },
        nomeHospede: { type: 'string', description: 'Nome completo do hóspede' },
        cpfHospede: { type: 'string', description: 'CPF do titular da reserva' },
        valorTotal: { type: 'number', description: 'Valor total da reserva' },
        observacoes: { type: 'string', description: 'Observações opcionais' }
      },
      required: ['dataDeEntrada', 'dataDeSaida', 'nomeDoChale', 'nomeHospede', 'cpfHospede', 'valorTotal']
    }
  },
  {
    name: 'transferir_para_humano',
    description: 'Transfere o atendimento para um humano. Use quando: (1) hóspede já chegou ou está no check-in, (2) cliente quer decoração/ornamentação, (3) pagamento por cartão, (4) ferramenta processar_reserva falhar, (5) dúvida que não tem resposta.',
    input_schema: {
      type: 'object' as const,
      properties: {
        motivo: {
          type: 'string',
          enum: ['hospede_chegou', 'decoracao', 'pagamento_cartao', 'falha_reserva', 'sem_resposta'],
          description: 'Motivo da transferência'
        },
        mensagem: { type: 'string', description: 'Mensagem a enviar ao cliente antes de transferir' }
      },
      required: ['motivo', 'mensagem']
    }
  }
];
