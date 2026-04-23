import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChatAPI, Conversation, Message } from '../services/chatApi';
import { format, isToday, isYesterday, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Send, RefreshCw, Bot, User, UserCheck, MessageSquare, Phone, ChevronLeft, RotateCcw } from 'lucide-react';

function formatTime(iso: string): string {
  try {
    const d = parseISO(iso);
    if (isToday(d)) return format(d, 'HH:mm');
    if (isYesterday(d)) return 'Ontem ' + format(d, 'HH:mm');
    return format(d, 'dd/MM HH:mm', { locale: ptBR });
  } catch {
    return '';
  }
}

function statusBadge(status: Conversation['status']) {
  if (status === 'transferred') return <span className="text-[10px] bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-bold">Humano</span>;
  if (status === 'closed') return <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Encerrado</span>;
  return <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold">Serena</span>;
}

function senderIcon(msg: Message) {
  if (msg.direction === 'in') return <User size={12} className="text-gray-400" />;
  if (msg.sender_type === 'human') return <UserCheck size={12} className="text-blue-500" />;
  return <Bot size={12} className="text-green-600" />;
}

interface ConversationsListProps {
  conversations: Conversation[];
  selectedId: string | null;
  onSelect: (c: Conversation) => void;
}

const ConversationsList: React.FC<ConversationsListProps> = ({ conversations, selectedId, onSelect }) => (
  <div className="flex flex-col h-full">
    <div className="p-4 border-b border-gray-100">
      <h2 className="font-bold text-gray-800 flex items-center gap-2">
        <MessageSquare size={18} className="text-green-600" /> Conversas
      </h2>
    </div>
    <div className="overflow-y-auto flex-1">
      {conversations.length === 0 && (
        <div className="p-8 text-center text-gray-400 text-sm">
          Nenhuma conversa ainda
        </div>
      )}
      {conversations.map(conv => (
        <button
          key={conv.id}
          onClick={() => onSelect(conv)}
          className={`w-full text-left px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors flex gap-3 items-start ${selectedId === conv.id ? 'bg-green-50 border-l-4 border-l-green-500' : ''}`}
        >
          <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center shrink-0 mt-0.5">
            <Phone size={16} className="text-gray-500" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-start gap-1">
              <span className="font-semibold text-sm text-gray-800 truncate">{conv.name || conv.phone}</span>
              <span className="text-[10px] text-gray-400 shrink-0">{conv.last_message_at ? formatTime(conv.last_message_at) : ''}</span>
            </div>
            <div className="flex justify-between items-center gap-1 mt-0.5">
              <span className="text-xs text-gray-500 truncate">{conv.last_message_text || '—'}</span>
              <div className="flex items-center gap-1 shrink-0">
                {statusBadge(conv.status)}
                {conv.unread_count > 0 && (
                  <span className="bg-green-500 text-white text-[10px] rounded-full w-5 h-5 flex items-center justify-center font-bold">
                    {conv.unread_count > 9 ? '9+' : conv.unread_count}
                  </span>
                )}
              </div>
            </div>
          </div>
        </button>
      ))}
    </div>
  </div>
);

interface ChatWindowProps {
  conversation: Conversation;
  onBack: () => void;
  onUpdate: () => void;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ conversation, onBack, onUpdate }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  const loadMessages = useCallback(async () => {
    try {
      const msgs = await ChatAPI.getMessages(conversation.id);
      setMessages(msgs);
    } finally {
      setLoading(false);
    }
  }, [conversation.id]);

  useEffect(() => {
    setLoading(true);
    loadMessages();
    ChatAPI.markRead(conversation.id);
    const interval = setInterval(loadMessages, 5000);
    return () => clearInterval(interval);
  }, [conversation.id, loadMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async () => {
    if (!input.trim() || sending) return;
    const text = input.trim();
    setInput('');
    setSending(true);
    try {
      const msg = await ChatAPI.sendMessage(conversation.id, text);
      setMessages(prev => [...prev, msg]);
      onUpdate();
    } finally {
      setSending(false);
    }
  };

  const reactivate = async () => {
    await ChatAPI.reactivate(conversation.id);
    onUpdate();
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-100 flex items-center gap-3 bg-white">
        <button onClick={onBack} className="md:hidden text-gray-500 hover:text-gray-700">
          <ChevronLeft size={20} />
        </button>
        <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center">
          <Phone size={15} className="text-gray-500" />
        </div>
        <div className="flex-1">
          <div className="font-semibold text-sm text-gray-800">{conversation.name || conversation.phone}</div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">{conversation.phone}</span>
            {statusBadge(conversation.status)}
          </div>
        </div>
        {conversation.status === 'transferred' && (
          <button
            onClick={reactivate}
            title="Reativar Serena"
            className="flex items-center gap-1 text-xs bg-green-100 hover:bg-green-200 text-green-700 px-3 py-1.5 rounded-full font-bold transition-colors"
          >
            <RotateCcw size={13} /> Reativar Serena
          </button>
        )}
      </div>

      {/* Alerta de transferência */}
      {conversation.status === 'transferred' && (
        <div className="bg-orange-50 border-b border-orange-100 px-4 py-2 text-xs text-orange-700 flex items-center gap-2">
          <UserCheck size={13} /> <strong>Atendimento humano ativo</strong> — Motivo: {conversation.transfer_reason || 'não informado'}. A Serena está pausada.
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-[#f0f2f5]">
        {loading && <div className="text-center text-gray-400 text-sm py-8">Carregando...</div>}
        {!loading && messages.length === 0 && (
          <div className="text-center text-gray-400 text-sm py-8">Nenhuma mensagem ainda</div>
        )}
        {messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.direction === 'out' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm shadow-sm ${
                msg.direction === 'out'
                  ? msg.sender_type === 'human'
                    ? 'bg-blue-500 text-white rounded-br-sm'
                    : 'bg-green-500 text-white rounded-br-sm'
                  : 'bg-white text-gray-800 rounded-bl-sm'
              }`}
            >
              {msg.type !== 'text' && (
                <div className="text-[10px] opacity-70 mb-1 uppercase tracking-wide">[{msg.type}]</div>
              )}
              <div className="whitespace-pre-wrap break-words">{msg.content}</div>
              <div className={`flex items-center justify-end gap-1 mt-1 ${msg.direction === 'out' ? 'text-white/70' : 'text-gray-400'}`}>
                {senderIcon(msg)}
                <span className="text-[10px]">{formatTime(msg.timestamp)}</span>
              </div>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-gray-100 bg-white flex gap-2">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
          placeholder={conversation.status === 'transferred' ? 'Responder como humano...' : 'Responder como humano (Serena ativa)...'}
          className="flex-1 bg-gray-100 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-300"
        />
        <button
          onClick={send}
          disabled={!input.trim() || sending}
          className="w-10 h-10 bg-green-500 hover:bg-green-600 disabled:bg-gray-200 text-white rounded-full flex items-center justify-center transition-colors"
        >
          {sending ? <RefreshCw size={16} className="animate-spin" /> : <Send size={16} />}
        </button>
      </div>
    </div>
  );
};

interface ChatPageProps {
  embedded?: boolean;
}

const ChatPage: React.FC<ChatPageProps> = ({ embedded = false }) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showChat, setShowChat] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await ChatAPI.getConversations();
      setConversations(data);
      setError(null);
      if (selected) {
        const updated = data.find(c => c.id === selected.id);
        if (updated) setSelected(updated);
      }
    } catch (err: any) {
      setError(err?.message || 'Falha de conexão com o servidor');
    } finally {
      setLoading(false);
    }
  }, [selected]);

  useEffect(() => {
    load();
    const interval = setInterval(load, 8000);
    return () => clearInterval(interval);
  }, [load]);

  const handleSelect = (conv: Conversation) => {
    setSelected(conv);
    setShowChat(true);
  };

  const heightClass = embedded ? 'h-screen' : 'h-[calc(100vh-80px)]';

  return (
    <div className={`${heightClass} flex bg-white rounded-xl overflow-hidden shadow-sm border border-gray-200`}>
      {/* Lista de conversas */}
      <div className={`w-full md:w-80 border-r border-gray-100 flex-shrink-0 ${showChat ? 'hidden md:flex md:flex-col' : 'flex flex-col'}`}>
        {loading ? (
          <div className="p-8 text-center text-gray-400">Carregando...</div>
        ) : error ? (
          <div className="p-6">
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <p className="text-sm font-bold text-red-800 mb-1">Falha ao carregar conversas</p>
              <p className="text-xs text-red-600 break-all mb-3">{error}</p>
              <p className="text-xs text-red-700 mb-3">
                Verifique se o backend está no ar em <code className="bg-white px-1 rounded">{import.meta.env.VITE_API_URL || 'http://localhost:3001'}/health</code>
              </p>
              <button
                onClick={load}
                className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white text-xs px-3 py-1.5 rounded-md font-semibold"
              >
                <RefreshCw size={12} /> Tentar novamente
              </button>
            </div>
          </div>
        ) : (
          <ConversationsList
            conversations={conversations}
            selectedId={selected?.id || null}
            onSelect={handleSelect}
          />
        )}
      </div>

      {/* Janela de chat */}
      <div className={`flex-1 flex flex-col ${!showChat ? 'hidden md:flex' : 'flex'}`}>
        {selected ? (
          <ChatWindow
            conversation={selected}
            onBack={() => setShowChat(false)}
            onUpdate={load}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400 flex-col gap-3">
            <MessageSquare size={48} className="opacity-20" />
            <p className="text-sm">Selecione uma conversa</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatPage;
