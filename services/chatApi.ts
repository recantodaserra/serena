const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export interface Conversation {
  id: string;
  phone: string;
  name?: string;
  status: 'active' | 'transferred' | 'closed';
  unread_count: number;
  last_message_at?: string;
  last_message_text?: string;
  transfer_reason?: string;
  created_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  direction: 'in' | 'out';
  content?: string;
  type: string;
  media_url?: string;
  sender_type: 'client' | 'agent' | 'human';
  timestamp: string;
}

export const ChatAPI = {
  async getConversations(): Promise<Conversation[]> {
    const res = await fetch(`${API_BASE}/api/conversations`);
    if (!res.ok) throw new Error('Erro ao carregar conversas');
    return res.json();
  },

  async getMessages(conversationId: string): Promise<Message[]> {
    const res = await fetch(`${API_BASE}/api/conversations/${conversationId}/messages`);
    if (!res.ok) throw new Error('Erro ao carregar mensagens');
    return res.json();
  },

  async sendMessage(conversationId: string, text: string): Promise<Message> {
    const res = await fetch(`${API_BASE}/api/conversations/${conversationId}/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    });
    if (!res.ok) throw new Error('Erro ao enviar mensagem');
    return res.json();
  },

  async reactivate(conversationId: string): Promise<void> {
    await fetch(`${API_BASE}/api/conversations/${conversationId}/reactivate`, { method: 'POST' });
  },

  async markRead(conversationId: string): Promise<void> {
    await fetch(`${API_BASE}/api/conversations/${conversationId}/read`, { method: 'POST' });
  }
};
