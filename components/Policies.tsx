import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CalendarCheck, CreditCard, Clock, Home, Shield, Volume2,
  Users, Banknote, AlertTriangle, ChevronDown, Leaf,
} from 'lucide-react';

interface PolicySection {
  id: number;
  icon: React.ReactNode;
  title: string;
  content: React.ReactNode;
}

const sections: PolicySection[] = [
  {
    id: 1,
    icon: <CalendarCheck size={22} />,
    title: 'Política de Reserva',
    content: (
      <ul className="space-y-3 text-gray-600 text-sm leading-relaxed">
        <li className="flex gap-3"><span className="text-serra-accent mt-0.5 flex-shrink-0">›</span>Reservas podem ser feitas até <strong>duas horas antes</strong> do check-in (padrão 14h00).</li>
        <li className="flex gap-3"><span className="text-serra-accent mt-0.5 flex-shrink-0">›</span>É necessário pagamento de <strong>50% do valor total</strong> para confirmação. Pagamentos via cartão devem ser <strong>integrais (100%)</strong> — os juros da operadora ficam a cargo do hóspede.</li>
        <li className="flex gap-3"><span className="text-serra-accent mt-0.5 flex-shrink-0">›</span>O saldo restante deve ser quitado no <strong>check-in, antes da entrada no chalé</strong>. Pode ser feito via PIX, sem necessidade de parar na portaria.</li>
      </ul>
    ),
  },
  {
    id: 2,
    icon: <CreditCard size={22} />,
    title: 'Política de Cancelamento',
    content: (
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { prazo: 'Até 7 dias após a compra', reembolso: '100%', cor: 'green' },
            { prazo: 'Mais de 10 dias antes do check-in', reembolso: '100%', cor: 'green' },
            { prazo: 'Entre 5 e 9 dias antes do check-in', reembolso: '50%', cor: 'yellow' },
            { prazo: 'Menos de 5 dias antes do check-in', reembolso: 'Sem reembolso', cor: 'red' },
            { prazo: 'No-show (não comparecimento)', reembolso: 'Sem reembolso', cor: 'red' },
          ].map((item) => (
            <div key={item.prazo} className={`p-3 rounded-lg border text-sm ${
              item.cor === 'green' ? 'bg-green-50 border-green-200' :
              item.cor === 'yellow' ? 'bg-amber-50 border-amber-200' :
              'bg-red-50 border-red-200'
            }`}>
              <p className="font-semibold text-gray-700 mb-0.5">{item.prazo}</p>
              <p className={`font-bold text-base ${
                item.cor === 'green' ? 'text-green-700' :
                item.cor === 'yellow' ? 'text-amber-700' :
                'text-red-700'
              }`}>{item.reembolso}</p>
            </div>
          ))}
        </div>
        <ul className="space-y-2 text-gray-600 text-sm leading-relaxed">
          <li className="flex gap-3"><span className="text-serra-accent mt-0.5 flex-shrink-0">›</span><strong>Reagendamento:</strong> permitido 1 vez sem custo, com pelo menos 48h de antecedência, sujeito à disponibilidade.</li>
          <li className="flex gap-3"><span className="text-serra-accent mt-0.5 flex-shrink-0">›</span>Solicitações de alteração com <strong>menos de 48h</strong> estão sujeitas a taxa administrativa de <strong>R$ 75,00</strong>.</li>
          <li className="flex gap-3"><span className="text-serra-accent mt-0.5 flex-shrink-0">›</span>Encargos de operadora de cartão parcelado <strong>não são reembolsáveis</strong>.</li>
          <li className="flex gap-3"><span className="text-serra-accent mt-0.5 flex-shrink-0">›</span>Em caso de força maior (clima extremo, problema estrutural, interrupção de serviços essenciais), poderá ser oferecida remarcação ou reembolso conforme análise.</li>
          <li className="flex gap-3"><span className="text-serra-accent mt-0.5 flex-shrink-0">›</span>Reembolsos realizados em até <strong>7 dias úteis</strong>, pelo mesmo meio de pagamento.</li>
        </ul>
      </div>
    ),
  },
  {
    id: 3,
    icon: <Clock size={22} />,
    title: 'Horários de Check-in e Check-out',
    content: (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-serra-light border border-gray-200 rounded-xl p-5 text-center">
          <p className="text-xs uppercase tracking-widest text-gray-400 font-bold mb-2">Check-in</p>
          <p className="text-3xl font-serif font-bold text-serra-dark">14h00</p>
          <p className="text-sm text-gray-500 mt-1">até às 20h00</p>
        </div>
        <div className="bg-serra-light border border-gray-200 rounded-xl p-5 text-center">
          <p className="text-xs uppercase tracking-widest text-gray-400 font-bold mb-2">Check-out</p>
          <p className="text-3xl font-serif font-bold text-serra-dark">até 12h00</p>
          <p className="text-sm text-gray-500 mt-1">saída improrrogável</p>
        </div>
        <div className="sm:col-span-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">
          Check-out após 12h00 somente com autorização prévia da administração, podendo haver cobrança de taxa extra.
        </div>
      </div>
    ),
  },
  {
    id: 4,
    icon: <Home size={22} />,
    title: 'Política de Hospedagem',
    content: (
      <div className="space-y-4">
        <ul className="space-y-2 text-gray-600 text-sm leading-relaxed">
          <li className="flex gap-3"><span className="text-red-400 mt-0.5 flex-shrink-0">✕</span>Não é permitido fumar dentro dos chalés.</li>
          <li className="flex gap-3"><span className="text-green-500 mt-0.5 flex-shrink-0">✓</span>Animais de estimação são aceitos mediante aviso prévio e possível cobrança adicional.</li>
          <li className="flex gap-3"><span className="text-serra-accent mt-0.5 flex-shrink-0">›</span>Visitantes externos: cobrança de <strong>R$ 100,00</strong> por visita.</li>
          <li className="flex gap-3"><span className="text-serra-accent mt-0.5 flex-shrink-0">›</span>Hóspede adicional além da capacidade: <strong>R$ 100,00</strong> + colchão extra (deve ser informado na reserva).</li>
        </ul>
        <div>
          <p className="text-xs uppercase tracking-widest text-gray-400 font-bold mb-3">Capacidade por chalé</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {[
              { nome: 'Chalé da Montanha', cap: '2 pessoas (+1 com colchão extra)' },
              { nome: 'Chalé do Mirante', cap: '2 pessoas (+1 com colchão extra)' },
              { nome: 'Chalé do Horizonte', cap: '2 pessoas (+1 com colchão extra)' },
              { nome: 'Chalé da Floresta', cap: '2 pessoas (+1 com colchão extra)' },
              { nome: 'Chalé Pôr do Sol', cap: '4 pessoas (+1 com colchão extra)' },
            ].map((c) => (
              <div key={c.nome} className="flex items-center gap-3 bg-gray-50 border border-gray-100 rounded-lg px-4 py-2.5 text-sm">
                <Users size={14} className="text-serra-accent flex-shrink-0" />
                <div>
                  <p className="font-semibold text-gray-700">{c.nome}</p>
                  <p className="text-gray-500 text-xs">{c.cap}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 5,
    icon: <Shield size={22} />,
    title: 'Política de Danos e Responsabilidades',
    content: (
      <ul className="space-y-3 text-gray-600 text-sm leading-relaxed">
        <li className="flex gap-3"><span className="text-serra-accent mt-0.5 flex-shrink-0">›</span>Qualquer dano causado à propriedade será <strong>cobrado do hóspede responsável</strong>, no valor do item danificado.</li>
        <li className="flex gap-3"><span className="text-serra-accent mt-0.5 flex-shrink-0">›</span>Não é permitido retirar objetos, móveis ou utensílios dos chalés.</li>
        <li className="flex gap-3"><span className="text-serra-accent mt-0.5 flex-shrink-0">›</span>Itens esquecidos serão guardados por até <strong>30 dias</strong>. Após esse prazo, serão descartados.</li>
        <li className="flex gap-3"><span className="text-serra-accent mt-0.5 flex-shrink-0">›</span>O Recanto da Serra não se responsabiliza por objetos esquecidos, perdas ou furtos.</li>
      </ul>
    ),
  },
  {
    id: 6,
    icon: <Volume2 size={22} />,
    title: 'Política de Silêncio',
    content: (
      <div className="flex items-start gap-4">
        <div className="bg-serra-dark text-white rounded-xl px-6 py-4 text-center flex-shrink-0">
          <p className="text-xs uppercase tracking-widest text-white/60 mb-1">Silêncio</p>
          <p className="text-xl font-bold">22h00 – 07h00</p>
        </div>
        <p className="text-gray-600 text-sm leading-relaxed pt-2">
          Pedimos respeito ao horário de silêncio em consideração aos vizinhos e demais hóspedes do Recanto da Serra Eco Park.
        </p>
      </div>
    ),
  },
  {
    id: 7,
    icon: <Leaf size={22} />,
    title: 'Política de Uso das Áreas Comuns',
    content: (
      <ul className="space-y-3 text-gray-600 text-sm leading-relaxed">
        <li className="flex gap-3"><span className="text-serra-accent mt-0.5 flex-shrink-0">›</span>As áreas comuns devem ser utilizadas de forma <strong>responsável e respeitosa</strong>.</li>
        <li className="flex gap-3"><span className="text-red-400 mt-0.5 flex-shrink-0">✕</span>Não é permitida a realização de festas sem <strong>autorização prévia</strong> dos responsáveis pelo Recanto da Serra.</li>
      </ul>
    ),
  },
  {
    id: 8,
    icon: <Banknote size={22} />,
    title: 'Política de Pagamento',
    content: (
      <ul className="space-y-3 text-gray-600 text-sm leading-relaxed">
        <li className="flex gap-3"><span className="text-serra-accent mt-0.5 flex-shrink-0">›</span>A reserva é confirmada mediante pagamento antecipado, <strong>total ou parcial (50%)</strong>.</li>
        <li className="flex gap-3"><span className="text-serra-accent mt-0.5 flex-shrink-0">›</span>Pagamentos via cartão de crédito devem ser <strong>integrais</strong> — os encargos da operadora ficam a cargo do hóspede.</li>
        <li className="flex gap-3"><span className="text-red-400 mt-0.5 flex-shrink-0">✕</span>O não pagamento pode resultar em <strong>cancelamento automático</strong> da reserva.</li>
      </ul>
    ),
  },
  {
    id: 9,
    icon: <AlertTriangle size={22} />,
    title: 'Força Maior e Segurança',
    content: (
      <ul className="space-y-3 text-gray-600 text-sm leading-relaxed">
        <li className="flex gap-3"><span className="text-serra-accent mt-0.5 flex-shrink-0">›</span>Em situações imprevistas (clima extremo, falta de energia, problemas estruturais) poderá ser oferecida <strong>remarcação ou reembolso parcial/total</strong>, conforme análise.</li>
        <li className="flex gap-3"><span className="text-gray-400 mt-0.5 flex-shrink-0">›</span>O Recanto da Serra não se responsabiliza por objetos esquecidos, perdas ou furtos dentro das dependências.</li>
      </ul>
    ),
  },
];

const Policies: React.FC = () => {
  const [openId, setOpenId] = useState<number | null>(null);

  const toggle = (id: number) => setOpenId(prev => prev === id ? null : id);

  return (
    <div className="min-h-screen bg-serra-light animate-fade-in">
      {/* Hero */}
      <div className="bg-serra-dark pt-32 pb-16 px-4 text-center">
        <span className="inline-block py-1 px-4 mb-4 rounded-full border border-white/20 bg-white/10 text-white text-xs font-bold tracking-[0.3em] uppercase">
          Transparência
        </span>
        <h2 className="font-serif text-4xl md:text-5xl text-white mb-4">Políticas do Recanto</h2>
        <div className="h-0.5 w-16 bg-serra-accent mx-auto rounded-full mb-4" />
        <p className="text-white/60 max-w-xl mx-auto text-sm font-light">
          Para garantir uma experiência justa e agradável a todos os hóspedes, pedimos que leia atentamente nossas políticas antes de realizar sua reserva.
        </p>
      </div>

      {/* Accordion */}
      <div className="max-w-3xl mx-auto px-4 py-16 space-y-3">
        {sections.map((section) => {
          const isOpen = openId === section.id;
          return (
            <div
              key={section.id}
              className={`bg-white rounded-xl border transition-all duration-200 overflow-hidden ${
                isOpen ? 'border-serra-accent shadow-lg' : 'border-gray-200 shadow-sm'
              }`}
            >
              <button
                onClick={() => toggle(section.id)}
                className="w-full flex items-center justify-between px-6 py-5 text-left group"
              >
                <div className="flex items-center gap-4">
                  <div className={`p-2 rounded-lg transition-colors ${
                    isOpen ? 'bg-serra-accent text-white' : 'bg-gray-100 text-gray-500 group-hover:bg-serra-accent/10 group-hover:text-serra-accent'
                  }`}>
                    {section.icon}
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">
                      Seção {section.id}
                    </span>
                    <span className="font-semibold text-gray-800 text-base">{section.title}</span>
                  </div>
                </div>
                <ChevronDown
                  size={20}
                  className={`text-gray-400 flex-shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-180 text-serra-accent' : ''}`}
                />
              </button>

              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: 'easeInOut' }}
                  >
                    <div className="px-6 pb-6 border-t border-gray-100 pt-5">
                      {section.content}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      {/* Footer note */}
      <div className="max-w-3xl mx-auto px-4 pb-16 text-center">
        <p className="text-xs text-gray-400">
          Dúvidas? Entre em contato conosco pelo WhatsApp antes de realizar sua reserva.
        </p>
      </div>
    </div>
  );
};

export default Policies;
