import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const url = process.env.SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_KEY!;

export const supabase = createClient(url, key);

export interface Conversation {
  id: string;
  phone: string;
  name?: string;
  status: 'active' | 'transferred' | 'closed';
  unread_count: number;
  last_message_at?: string;
  last_message_text?: string;
  transferred_at?: string;
  transfer_reason?: string;
  created_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  direction: 'in' | 'out';
  content?: string;
  type: 'text' | 'image' | 'audio' | 'document' | 'video';
  media_url?: string;
  sender_type: 'client' | 'agent' | 'human';
  timestamp: string;
  read_at?: string;
}

export interface MemoryEntry {
  role: 'user' | 'assistant';
  content: string;
}

export const ConversationService = {
  async upsert(phone: string, name?: string): Promise<Conversation> {
    // First try to find existing conversation to avoid overwriting name
    const { data: existing } = await supabase
      .from('conversations')
      .select()
      .eq('phone', phone)
      .single();

    if (existing) return existing;

    const { data, error } = await supabase
      .from('conversations')
      .insert({ phone, name: name || null, status: 'active', unread_count: 0 })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async getByPhone(phone: string): Promise<Conversation | null> {
    const { data } = await supabase
      .from('conversations')
      .select()
      .eq('phone', phone)
      .single();
    return data;
  },

  async updateLastMessage(phone: string, text: string) {
    await supabase
      .from('conversations')
      .update({ last_message_at: new Date().toISOString(), last_message_text: text.slice(0, 120) })
      .eq('phone', phone);
  },

  async incrementUnread(phone: string) {
    const { data } = await supabase
      .from('conversations')
      .select('unread_count')
      .eq('phone', phone)
      .single();
    if (data) {
      await supabase
        .from('conversations')
        .update({ unread_count: data.unread_count + 1 })
        .eq('phone', phone);
    }
  },

  async markTransferred(phone: string, reason: string) {
    await supabase
      .from('conversations')
      .update({ status: 'transferred', transferred_at: new Date().toISOString(), transfer_reason: reason })
      .eq('phone', phone);
  },

  async reactivate(phone: string) {
    await supabase
      .from('conversations')
      .update({ status: 'active', unread_count: 0, transfer_reason: null })
      .eq('phone', phone);
  }
};

export const MessageService = {
  async save(msg: Omit<Message, 'id'>): Promise<Message> {
    const { data, error } = await supabase
      .from('messages')
      .insert(msg)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async getByConversation(conversationId: string, limit = 50): Promise<Message[]> {
    const { data } = await supabase
      .from('messages')
      .select()
      .eq('conversation_id', conversationId)
      .order('timestamp', { ascending: true })
      .limit(limit);
    return data || [];
  }
};

export const MemoryService = {
  async get(conversationId: string, windowSize = 10): Promise<MemoryEntry[]> {
    const { data } = await supabase
      .from('agent_memory')
      .select('role, content')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(windowSize);
    return (data || []).reverse() as MemoryEntry[];
  },

  async append(conversationId: string, role: 'user' | 'assistant', content: string) {
    await supabase.from('agent_memory').insert({ conversation_id: conversationId, role, content });
  },

  async trim(conversationId: string, keepLast = 20) {
    const { data } = await supabase
      .from('agent_memory')
      .select('id')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false });

    if (data && data.length > keepLast) {
      const toDelete = data.slice(keepLast).map((r: any) => r.id);
      await supabase.from('agent_memory').delete().in('id', toDelete);
    }
  }
};

export const ReservationDB = {
  async checkAvailability(chaletId: string, startDate: string, endDate: string): Promise<boolean> {
    const { data } = await supabase
      .from('reservations')
      .select('id')
      .eq('chalet_id', chaletId)
      .lt('start_date', endDate)
      .gt('end_date', startDate);
    return !data || data.length === 0;
  },

  async getChalets() {
    const { data } = await supabase.from('chalets').select('id, name, base_price');
    return data || [];
  },

  async getCustomPrices(chaletId: string, startDate: string, endDate: string) {
    const { data } = await supabase
      .from('custom_prices')
      .select('date, price')
      .eq('chalet_id', chaletId)
      .gte('date', startDate)
      .lte('date', endDate);
    return data || [];
  },

  async createReservation(params: {
    chaletId: string;
    guestName: string;
    guestCpf: string;
    guestPhone: string;
    startDate: string;
    endDate: string;
    totalValue: number;
    observations?: string;
  }) {
    // Re-check availability inside the insert to prevent race-condition overbooking
    const available = await ReservationDB.checkAvailability(params.chaletId, params.startDate, params.endDate);
    if (!available) {
      throw new Error('O chalé não está mais disponível para as datas selecionadas.');
    }

    const { data, error } = await supabase
      .from('reservations')
      .insert({
        chalet_id: params.chaletId,
        type: 'guest',
        guest1_name: params.guestName,
        guest1_cpf: params.guestCpf,
        guest1_phone: params.guestPhone,
        start_date: params.startDate,
        end_date: params.endDate,
        total_value: params.totalValue,
        payment_method: 'PIX',
        payment_type: 'Parcial',
        amount_paid: params.totalValue * 0.5,
        observations: params.observations || '',
        origin: 'WhatsApp',
        created_at: Date.now()
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  }
};
