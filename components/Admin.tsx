
import React, { useState, useEffect, useRef } from 'react';
import { ReservationService, Reservation, PricingService, ChaletService, SiteService, GalleryService, CustomPrice } from '../services/storage';
import { Chalet, GalleryItem } from '../types';
import { processImageFile } from '../utils/imageCompression';
import {
  Trash2, Calendar as CalendarIcon, Plus, LogOut, BarChart3, LayoutDashboard, ListTodo,
  AlertCircle, CheckCircle2, Edit, User, X, ChevronLeft, ChevronRight, Hammer,
  DollarSign, Home as HomeIcon, MapPin, Wallet, Image as ImageIcon, Save,
  RefreshCw, DownloadCloud, FileText, Upload, Camera, Settings, Search, Filter, Ban,
  PenLine, List, TrendingUp, Video, PlayCircle, FileInput, MoreVertical, XCircle, AlertTriangle,
  FileSpreadsheet, ArrowUpFromLine, Info, MessageSquare, Bot
} from 'lucide-react';
import { Link } from 'react-router-dom';
import ChatPage from './Chat';
import AgentConfigManager from './AgentConfig';
import { 
  format, addDays, endOfMonth, eachDayOfInterval, isSameDay, addMonths, 
  getDay, isWithinInterval, parseISO, startOfMonth, subMonths 
} from 'date-fns';
import { ptBR } from 'date-fns/locale';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

// --- MODAL COM CONFIRMAÇÃO VISUAL (SEM window.confirm) ---
interface ReservationDetailModalProps {
  reservation: Reservation;
  chalets: Chalet[];
  onClose: () => void;
  onDelete: (id: string) => void;
  onEdit: (res: Reservation) => void;
  onSettle: (res: Reservation) => void;
}

const ReservationDetailModal: React.FC<ReservationDetailModalProps> = ({ reservation, chalets, onClose, onDelete, onEdit, onSettle }) => {
  const [confirmMode, setConfirmMode] = useState<'none' | 'delete' | 'settle'>('none');
  const getChaletName = (id: string) => chalets.find(c => c.id === id)?.name || 'Desconhecido';
  
  const handleInnerClick = (e: React.MouseEvent) => e.stopPropagation();

  const safeDate = (d: string) => { try { return parseISO(d) } catch { return new Date() } };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-200" onClick={handleInnerClick}>
        
        {/* Header */}
        <div className={`${confirmMode === 'delete' ? 'bg-red-600' : (confirmMode === 'settle' ? 'bg-green-600' : 'bg-serra-dark')} p-6 text-white relative transition-colors duration-300`}>
          <button type="button" onClick={onClose} className="absolute top-4 right-4 text-white/70 hover:text-white"><X size={24} /></button>
          
          {confirmMode === 'delete' ? (
             <h3 className="font-bold text-xl flex items-center gap-2"><AlertTriangle /> Confirmar Exclusão</h3>
          ) : confirmMode === 'settle' ? (
             <h3 className="font-bold text-xl flex items-center gap-2"><CheckCircle2 /> Confirmar Quitação</h3>
          ) : (
             <h3 className="font-serif text-xl font-bold">{getChaletName(reservation.chaletId)}</h3>
          )}

          <p className="text-white/80 text-sm font-medium mt-1 uppercase tracking-wider">
            {confirmMode === 'none' && (
                reservation.type === 'maintenance' ? 'BLOQUEIO DE MANUTENÇÃO' : 
                `${format(safeDate(reservation.startDate), "dd 'de' MMMM", { locale: ptBR })} - ${format(safeDate(reservation.endDate), "dd 'de' MMMM", { locale: ptBR })}`
            )}
            {confirmMode === 'delete' && "Esta ação é irreversível."}
            {confirmMode === 'settle' && "O saldo será zerado."}
          </p>
        </div>

        <div className="p-6 space-y-6">
          {confirmMode === 'none' ? (
            // VISUALIZAÇÃO PADRÃO
            reservation.type === 'guest' ? (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-xs text-gray-400 font-bold uppercase flex gap-1"><User size={12}/> Titular</p>
                    <p className="font-bold text-gray-800 truncate">{reservation.guest1Name}</p>
                    <p className="text-sm text-gray-600">{reservation.guest1Phone || '-'}</p>
                  </div>
                  {reservation.guest2Name && (
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-xs text-gray-400 font-bold uppercase flex gap-1"><User size={12}/> Acompanhante</p>
                      <p className="font-bold text-gray-800 truncate">{reservation.guest2Name}</p>
                    </div>
                  )}
                  <div className="bg-gray-50 p-3 rounded-lg col-span-2">
                    <p className="text-xs text-gray-400 font-bold uppercase flex gap-1"><MapPin size={12}/> Origem / Obs</p>
                    <p className="font-bold text-gray-800">{reservation.origin || 'Direto'}</p>
                  </div>
                </div>
                <div className="border-t border-gray-100 pt-4">
                  <h4 className="font-bold text-gray-700 mb-3 flex items-center gap-2"><Wallet size={18} className="text-serra-accent" /> Detalhes Financeiros ({reservation.paymentMethod})</h4>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-gray-50 p-2 rounded"><span className="block text-xs text-gray-400 uppercase">Total</span><span className="font-bold text-gray-800">{formatCurrency(reservation.totalValue)}</span></div>
                    <div className="bg-green-50 p-2 rounded"><span className="block text-xs text-green-600 uppercase">Pago</span><span className="font-bold text-green-700">{formatCurrency(reservation.amountPaid || 0)}</span></div>
                    <div className="bg-red-50 p-2 rounded"><span className="block text-xs text-red-500 uppercase">Falta</span><span className="font-bold text-red-600">{formatCurrency(reservation.totalValue - (reservation.amountPaid || 0))}</span></div>
                  </div>
                </div>
              </>
            ) : <p className="text-gray-600 italic text-center py-4">Bloqueio manual (Manutenção/Outros)</p>
          ) : (
            // ÁREA DE CONFIRMAÇÃO
            <div className="text-center py-4 animate-fade-in">
                {confirmMode === 'delete' ? (
                   <p className="text-gray-600 text-lg">Tem certeza que deseja <b className="text-red-600">excluir permanentemente</b> esta reserva?<br/>Esta ação não pode ser desfeita.</p>
                ) : (
                   <p className="text-gray-600 text-lg">Confirmar o recebimento do valor restante de <b className="text-green-600">{formatCurrency(reservation.totalValue - (reservation.amountPaid || 0))}</b>?</p>
                )}
            </div>
          )}
        </div>

        {/* Botoes de Ação */}
        <div className="p-4 bg-gray-50 border-t border-gray-200 flex flex-col gap-2">
          {confirmMode === 'none' ? (
             <>
               {reservation.type === 'guest' && (reservation.totalValue - (reservation.amountPaid || 0)) > 0.01 && (
                 <button 
                     type="button" 
                     onClick={() => setConfirmMode('settle')} 
                     className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-colors active:scale-95"
                 >
                     <CheckCircle2 size={18} /> Quitar Saldo
                 </button>
               )}
               <div className="flex gap-2">
                 {reservation.type === 'guest' && (
                     <button type="button" onClick={() => onEdit(reservation)} className="flex-1 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-colors active:scale-95">
                         <Edit size={18} /> Editar
                     </button>
                 )}
                 <button 
                     type="button" 
                     onClick={() => setConfirmMode('delete')} 
                     className="flex-1 bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-colors active:scale-95"
                 >
                     <Trash2 size={18} /> Excluir
                 </button>
               </div>
             </>
          ) : (
             <div className="flex gap-3">
                <button 
                  onClick={() => setConfirmMode('none')}
                  className="flex-1 py-3 border border-gray-300 rounded-lg font-bold text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={() => confirmMode === 'delete' ? onDelete(reservation.id) : onSettle(reservation)}
                  className={`flex-1 py-3 rounded-lg font-bold text-white transition-colors shadow-lg active:scale-95 flex items-center justify-center gap-2 ${confirmMode === 'delete' ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}
                >
                  {confirmMode === 'delete' ? <><Trash2 size={18}/> Confirmar Exclusão</> : <><CheckCircle2 size={18}/> Confirmar Quitação</>}
                </button>
             </div>
          )}
        </div>
      </div>
    </div>
  );
};

const normalizeChaletName = (name: string, chalets: Chalet[]): string | null => {
  const key = name.toLowerCase().trim()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // remove acentos
    .replace(/[^a-z0-9 ]/g, '').trim();
    
  // 1. Tentar encontrar por nome real do banco
  for (const chalet of chalets) {
      const normalizedChaletName = chalet.name.toLowerCase().trim()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9 ]/g, '').trim();
        
      if (key.includes(normalizedChaletName) || normalizedChaletName.includes(key)) {
          return chalet.id;
      }
  }

  // 2. Fallback manual por palavras-chave
  if (key.includes('floresta')) return chalets.find(c => c.name.toLowerCase().includes('floresta'))?.id || null;
  if (key.includes('horizonte')) return chalets.find(c => c.name.toLowerCase().includes('horizonte'))?.id || null;
  if (key.includes('mirante')) return chalets.find(c => c.name.toLowerCase().includes('mirante'))?.id || null;
  if (key.includes('montanha')) return chalets.find(c => c.name.toLowerCase().includes('montanha'))?.id || null;
  if (key.includes('sol')) return chalets.find(c => c.name.toLowerCase().includes('sol'))?.id || null;

  return null;
};

// Converte data DD/MM/YYYY → YYYY-MM-DD
const parseSheetDate = (raw: string): string | null => {
  if (!raw) return null;
  const parts = raw.split('/');
  if (parts.length !== 3) return null;
  const [d, m, y] = parts.map(s => s.trim().padStart(2, '0'));
  if (!d || !m || !y || y.length < 4) return null;
  return `${y}-${m}-${d}`;
};

// Remove R$, pontos de milhar, converte para número
const parseMoneyValue = (raw: string): number => {
  if (!raw) return 0;
  const clean = raw.replace(/R\$|\./g, '').replace(',', '.').trim();
  const n = parseFloat(clean);
  return isNaN(n) ? 0 : n;
};

// Mapeia forma de pagamento da planilha para o sistema
const parsePaymentMethod = (raw: string): string => {
  const r = raw.toLowerCase().trim();
  if (r.includes('pix')) return 'Pix';
  if (r.includes('crédito') || r.includes('credito') || r.includes('créd') || r.includes('cred')) return 'Crédito';
  if (r.includes('débito') || r.includes('debito') || r.includes('déb') || r.includes('deb')) return 'Débito';
  if (r.includes('link') || r.includes('cartão') || r.includes('cartao') || r.includes('card')) return 'Cartão (Link)';
  if (r.includes('misto') || r.includes('dinheiro+') || r.includes('+cartão') || r.includes('+cartao')) return 'Misto';
  if (r.includes('dinheiro') || r.includes('espécie') || r.includes('especie')) return 'Dinheiro';
  return raw || 'Pix';
};

// Mapeia status do pagamento
const parsePaymentType = (raw: string): 'Integral' | 'Parcial' => {
  const r = raw.toLowerCase();
  return r.includes('integral') || r.includes('100') ? 'Integral' : 'Parcial';
};

// Parseia uma linha CSV respeitando campos entre aspas
const parseCSVLine = (line: string): string[] => {
  const cols: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      cols.push(current.trim()); current = '';
    } else if (ch === ';' && !inQuotes) {
      cols.push(current.trim()); current = '';
    } else {
      current += ch;
    }
  }
  cols.push(current.trim());
  return cols;
};

interface ParsedRow {
  index: number;
  rawChaletName: string;
  chaletId: string | null;
  startDate: string | null;
  endDate: string | null;
  origin: string;
  guest1Name: string;
  guest1Cpf: string;
  guest1Phone: string;
  guest2Name: string;
  totalValue: number;
  paymentMethod: string;
  paymentType: 'Integral' | 'Parcial';
  amountPaid: number;
  observations: string;
  type: 'guest' | 'maintenance';
  errors: string[];
}

const parseCSVToReservations = (csvText: string, chalets: Chalet[]): ParsedRow[] => {
  const lines = csvText.split('\n').map(l => l.replace(/\r/g, ''));
  // Detecta se há linha de cabeçalho (primeira célula não parece uma data ou chalé)
  let startLine = 0;
  if (lines.length > 0) {
    const firstCell = lines[0].split(',')[0].split(';')[0].toLowerCase();
    if (firstCell.includes('chalé') || firstCell.includes('chale') || firstCell.includes('chalet') || firstCell.trim() === 'a' || firstCell.trim() === 'chalé') {
      startLine = 1;
    }
  }

  const rows: ParsedRow[] = [];
  for (let i = startLine; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const cols = parseCSVLine(line);
    if (cols.length < 3) continue;

    // Colunas: A=Chalé, B=Entrada, C=Saída, D=Origem, E=Titular, F=CPF, G=Telefone,
    //          H=Acompanhante, I=Valor, J=Forma Pgto, K=Status Pgto, L=Observações
    const rawChalet = cols[0] || '';
    const rawStart  = cols[1] || '';
    const rawEnd    = cols[2] || '';
    const origin    = cols[3] || 'WhatsApp';
    const guest1Name = cols[4] || '';
    const guest1Cpf  = cols[5] || '';
    const guest1Phone= cols[6] || '';
    const guest2Name = cols[7] || '';
    const rawValue   = cols[8] || '0';
    const rawMethod  = cols[9] || 'Pix';
    const rawStatus  = cols[10] || 'Parcial';
    const observations = cols[11] || '';

    const errors: string[] = [];
    const chaletId = normalizeChaletName(rawChalet, chalets);
    if (!chaletId && rawChalet) errors.push(`Chalé não reconhecido: "${rawChalet}"`);

    const startDate = parseSheetDate(rawStart);
    if (!startDate && rawStart) errors.push(`Data de entrada inválida: "${rawStart}"`);

    const endDate = parseSheetDate(rawEnd);
    if (!endDate && rawEnd) errors.push(`Data de saída inválida: "${rawEnd}"`);

    if (!guest1Name.trim() && rawChalet) errors.push('Nome do titular em branco');

    const totalValue = parseMoneyValue(rawValue);
    const paymentType = parsePaymentType(rawStatus);
    const amountPaid = paymentType === 'Integral' ? totalValue : 0;

    // Detecta manutenção
    const isMaintenace = guest1Name.toUpperCase().includes('REFORMA') || 
                         guest1Name.toUpperCase().includes('MANUTENÇÃO') ||
                         guest1Name.toUpperCase().includes('MANUTENCAO') ||
                         origin.toUpperCase().includes('BLOQUEIO');

    rows.push({
      index: i + 1,
      rawChaletName: rawChalet,
      chaletId,
      startDate,
      endDate,
      origin: origin || 'WhatsApp',
      guest1Name: guest1Name.trim(),
      guest1Cpf: guest1Cpf.trim(),
      guest1Phone: guest1Phone.trim(),
      guest2Name: guest2Name.trim(),
      totalValue,
      paymentMethod: parsePaymentMethod(rawMethod),
      paymentType,
      amountPaid,
      observations: observations.trim(),
      type: isMaintenace ? 'maintenance' : 'guest',
      errors
    });
  }
  return rows;
};

// ─── MODAL DE IMPORTAÇÃO DE PLANILHA ────────────────────────────────────────
interface ImportSpreadsheetModalProps {
  chalets: Chalet[];
  onClose: () => void;
  onSuccess: () => void;
}

const ImportSpreadsheetModal: React.FC<ImportSpreadsheetModalProps> = ({ chalets, onClose, onSuccess }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [step, setStep] = useState<'upload' | 'preview' | 'importing' | 'done'>('upload');
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<{ success: number; errors: string[] } | null>(null);
  const [fileName, setFileName] = useState('');

  const validRows = rows.filter(r => r.errors.length === 0 && r.chaletId && r.startDate && r.endDate && r.guest1Name);
  const invalidRows = rows.filter(r => r.errors.length > 0);

  const getChaletNameById = (id: string | null) => {
    if (!id) return '?';
    const name = chalets.find(c => c.id === id)?.name;
    return name ? `${name} (ID: ${id})` : id;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const parsed = parseCSVToReservations(text, chalets);
      setRows(parsed);
      setStep('preview');
    };
    reader.readAsText(file, 'UTF-8');
  };

  const handleImport = async () => {
    if (validRows.length === 0) return;
    setStep('importing');
    setProgress(0);

    const reservations = validRows.map(r => ({
      chaletId: r.chaletId!,
      startDate: r.startDate!,
      endDate: r.endDate!,
      origin: r.origin,
      guest1Name: r.guest1Name,
      guest1Cpf: r.guest1Cpf,
      guest1Phone: r.guest1Phone,
      guest2Name: r.guest2Name,
      guest2Cpf: '',
      totalValue: r.totalValue,
      paymentMethod: r.paymentMethod,
      paymentType: r.paymentType,
      amountPaid: r.amountPaid,
      observations: r.observations,
      type: r.type,
    }));

    try {
      const res = await ReservationService.bulkInsert(reservations, (done, total) => {
        setProgress(Math.round((done / total) * 100));
      });
      setResult(res);
      setStep('done');
      if (res.success > 0) onSuccess();
    } catch (e: any) {
      setResult({ success: 0, errors: [e.message] });
      setStep('done');
    }
  };

  const handleInnerClick = (e: React.MouseEvent) => e.stopPropagation();

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden border border-gray-200 flex flex-col" onClick={handleInnerClick}>
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-700 to-blue-500 p-5 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <FileSpreadsheet size={28} className="text-blue-200" />
            <div>
              <h3 className="font-bold text-xl">Importar Planilha de Reservas</h3>
              <p className="text-blue-200 text-sm">Arquivo CSV com as colunas da planilha original</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white"><X size={24} /></button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">

          {/* STEP: UPLOAD */}
          {step === 'upload' && (
            <div className="p-8 flex flex-col items-center gap-6">
              <div className="bg-blue-50 border-2 border-dashed border-blue-300 rounded-2xl p-10 flex flex-col items-center gap-4 w-full cursor-pointer hover:bg-blue-100 transition-colors" onClick={() => fileInputRef.current?.click()}>
                <ArrowUpFromLine size={48} className="text-blue-400" />
                <div className="text-center">
                  <p className="font-bold text-lg text-blue-700">Clique para selecionar o arquivo CSV</p>
                  <p className="text-sm text-gray-500 mt-1">Exporte sua planilha como <strong>.csv</strong> (Arquivo → Salvar como → CSV)</p>
                </div>
                <input ref={fileInputRef} type="file" accept=".csv,.txt" className="hidden" onChange={handleFileChange} />
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 w-full">
                <p className="text-xs font-bold text-amber-700 uppercase mb-2 flex items-center gap-1"><Info size={14}/> Formato esperado das colunas (na ordem):</p>
                <div className="grid grid-cols-4 gap-1 text-xs text-amber-800">
                  {['A: Chalé', 'B: Entrada (DD/MM/AAAA)', 'C: Saída (DD/MM/AAAA)', 'D: Origem',
                    'E: Titular (Hóspede 1)', 'F: CPF Titular', 'G: Telefone', 'H: Acompanhante',
                    'I: Valor Total (R$)', 'J: Forma de Pagamento', 'K: Status do Pagamento', 'L: Observações'
                  ].map(col => <span key={col} className="bg-amber-100 px-2 py-0.5 rounded font-mono">{col}</span>)}
                </div>
              </div>
            </div>
          )}

          {/* STEP: PREVIEW */}
          {step === 'preview' && (
            <div className="p-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex-1 bg-green-50 border border-green-200 rounded-lg px-4 py-2 text-center">
                  <span className="block text-2xl font-bold text-green-700">{validRows.length}</span>
                  <span className="text-xs text-green-600 font-bold uppercase">Prontas para importar</span>
                </div>
                <div className="flex-1 bg-red-50 border border-red-200 rounded-lg px-4 py-2 text-center">
                  <span className="block text-2xl font-bold text-red-700">{invalidRows.length}</span>
                  <span className="text-xs text-red-600 font-bold uppercase">Com erros (serão puladas)</span>
                </div>
                <div className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 text-center">
                  <span className="block text-sm font-bold text-gray-600 truncate">{fileName}</span>
                  <span className="text-xs text-gray-400">{rows.length} linhas lidas</span>
                </div>
              </div>

              <div className="overflow-x-auto rounded-xl border border-gray-200 max-h-80">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 font-bold text-gray-500 uppercase">#</th>
                      <th className="px-3 py-2 font-bold text-gray-500 uppercase">Status</th>
                      <th className="px-3 py-2 font-bold text-gray-500 uppercase">Chalé</th>
                      <th className="px-3 py-2 font-bold text-gray-500 uppercase">Entrada</th>
                      <th className="px-3 py-2 font-bold text-gray-500 uppercase">Saída</th>
                      <th className="px-3 py-2 font-bold text-gray-500 uppercase">Titular</th>
                      <th className="px-3 py-2 font-bold text-gray-500 uppercase">Valor</th>
                      <th className="px-3 py-2 font-bold text-gray-500 uppercase">Pagamento</th>
                      <th className="px-3 py-2 font-bold text-gray-500 uppercase">Erro</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(r => (
                      <tr key={r.index} className={`border-b border-gray-50 ${r.errors.length > 0 ? 'bg-red-50' : 'hover:bg-green-50/40'}`}>
                        <td className="px-3 py-2 text-gray-400">{r.index}</td>
                        <td className="px-3 py-2">
                          {r.errors.length === 0
                            ? <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-green-100 text-green-700 rounded-full font-bold"><CheckCircle2 size={10}/> OK</span>
                            : <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-red-100 text-red-700 rounded-full font-bold"><AlertTriangle size={10}/> Erro</span>
                          }
                        </td>
                        <td className="px-3 py-2 font-medium text-gray-700">{getChaletNameById(r.chaletId) || r.rawChaletName}</td>
                        <td className="px-3 py-2 text-gray-600">{r.startDate || '—'}</td>
                        <td className="px-3 py-2 text-gray-600">{r.endDate || '—'}</td>
                        <td className="px-3 py-2 font-medium text-gray-800 max-w-[120px] truncate">{r.guest1Name || '—'}</td>
                        <td className="px-3 py-2 text-gray-700">R$ {r.totalValue.toFixed(2)}</td>
                        <td className="px-3 py-2">
                          <span className={`px-1.5 py-0.5 rounded-full font-bold ${r.paymentType === 'Integral' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                            {r.paymentType}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-red-600 max-w-[180px]">{r.errors.join(', ')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* STEP: IMPORTING */}
          {step === 'importing' && (
            <div className="p-12 flex flex-col items-center gap-6">
              <div className="relative w-24 h-24">
                <svg className="animate-spin" viewBox="0 0 100 100" fill="none">
                  <circle cx="50" cy="50" r="40" stroke="#e5e7eb" strokeWidth="10"/>
                  <circle cx="50" cy="50" r="40" stroke="#2563eb" strokeWidth="10"
                    strokeDasharray={`${progress * 2.51} 251`} strokeLinecap="round" transform="rotate(-90 50 50)"
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center font-bold text-xl text-blue-700">{progress}%</span>
              </div>
              <div className="text-center">
                <p className="font-bold text-gray-700 text-lg">Importando reservas...</p>
                <p className="text-gray-400 text-sm mt-1">Não feche esta janela</p>
              </div>
            </div>
          )}

          {/* STEP: DONE */}
          {step === 'done' && result && (
            <div className="p-10 flex flex-col items-center gap-5">
              {result.success > 0 ? (
                <CheckCircle2 size={64} className="text-green-500" />
              ) : (
                <AlertTriangle size={64} className="text-red-500" />
              )}
              <div className="text-center">
                <p className="font-bold text-2xl text-gray-800">
                  {result.success} reserva{result.success !== 1 ? 's' : ''} importada{result.success !== 1 ? 's' : ''} com sucesso!
                </p>
                {result.errors.length > 0 && (
                  <div className="mt-3 text-left bg-red-50 border border-red-200 rounded-xl p-3">
                    <p className="text-xs font-bold text-red-700 uppercase mb-1">Erros:</p>
                    {result.errors.map((e, i) => <p key={i} className="text-sm text-red-600">{e}</p>)}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between gap-3 shrink-0">
          {step === 'done' ? (
            <button onClick={onClose} className="flex-1 bg-serra-dark text-white py-3 rounded-xl font-bold hover:bg-serra-accent transition-colors">Fechar</button>
          ) : step === 'preview' ? (
            <>
              <button onClick={() => { setStep('upload'); setRows([]); setFileName(''); }} className="py-3 px-5 border border-gray-300 rounded-xl font-bold text-gray-600 hover:bg-gray-100 transition-colors">
                ← Voltar
              </button>
              <button 
                onClick={handleImport}
                disabled={validRows.length === 0}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors"
              >
                <ArrowUpFromLine size={18} /> Confirmar Importação de {validRows.length} Reservas
              </button>
            </>
          ) : step === 'upload' ? (
            <button onClick={onClose} className="py-3 px-5 border border-gray-300 rounded-xl font-bold text-gray-600 hover:bg-gray-100 transition-colors">Cancelar</button>
          ) : null}
        </div>
      </div>
    </div>
  );
};

const ReservationManager = () => {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [chalets, setChalets] = useState<Chalet[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRes, setSelectedRes] = useState<Reservation | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);

  const [filterStartDate, setFilterStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [filterEndDate, setFilterEndDate] = useState(format(addMonths(new Date(), 1), 'yyyy-MM-dd'));

  const initialFormState = {
    chaletId: '',
    startDate: '',
    endDate: '',
    origin: 'WhatsApp',
    guest1Name: '',
    guest1Cpf: '',
    guest1Phone: '',
    guest2Name: '',
    guest2Cpf: '',
    totalValue: 0,
    amountPaid: 0,
    paymentMethod: 'Pix',
    paymentType: 'Integral',
    observations: ''
  };

  const [formData, setFormData] = useState(initialFormState);

  const loadData = async () => {
    setLoading(true);
    try {
        const [r, c] = await Promise.all([ReservationService.getAll(), ChaletService.getAll()]);
        setReservations(r);
        setChalets(c);
        
        if (c.length > 0 && !formData.chaletId) {
          setFormData(prev => ({ ...prev, chaletId: c[0].id }));
        }
    } catch(e) {
        console.error("Erro ao carregar dados", e);
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleRadioChange = (type: string) => {
    setFormData(prev => ({ ...prev, paymentType: type }));
  };

  const handleSave = async () => {
    if (!formData.chaletId || !formData.startDate || !formData.endDate || !formData.guest1Name) {
      alert("Preencha os campos obrigatórios (*)");
      return;
    }

    try {
      const finalAmountPaid = formData.paymentType === 'Integral' 
        ? Number(formData.totalValue) 
        : Number(formData.amountPaid);

      const payload = {
        chaletId: formData.chaletId,
        startDate: formData.startDate,
        endDate: formData.endDate,
        origin: formData.origin,
        guest1Name: formData.guest1Name,
        guest1Cpf: formData.guest1Cpf,
        guest1Phone: formData.guest1Phone,
        guest2Name: formData.guest2Name,
        guest2Cpf: formData.guest2Cpf,
        totalValue: Number(formData.totalValue),
        paymentMethod: formData.paymentMethod,
        paymentType: formData.paymentType as 'Integral' | 'Parcial',
        amountPaid: finalAmountPaid,
        observations: formData.observations,
        type: 'guest' as const
      };

      if (editingId) {
        await ReservationService.update({
          id: editingId,
          ...payload,
          createdAt: 0
        });
        alert("Reserva atualizada com sucesso!");
      } else {
        await ReservationService.add(payload);
        alert("Reserva criada com sucesso!");
      }
      
      await loadData();
      
      setEditingId(null);
      setFormData({
        ...initialFormState,
        chaletId: chalets.length > 0 ? chalets[0].id : ''
      });

    } catch (error: any) {
      alert("Erro ao salvar: " + error.message);
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setFormData({
      ...initialFormState,
      chaletId: chalets.length > 0 ? chalets[0].id : ''
    });
  };

  const handleDelete = async (id: string) => {
    try {
      await ReservationService.remove(id);
      setSelectedRes(null); 
      await loadData(); 
    } catch (e: any) {
      alert("ERRO: " + e.message);
    }
  };

  const handleSettle = async (res: Reservation) => {
    try {
      const updatedRes: Reservation = {
        ...res,
        amountPaid: Number(res.totalValue),
        paymentType: 'Integral'
      };
      
      await ReservationService.update(updatedRes);
      setSelectedRes(null);
      await loadData();
    } catch (e: any) {
      alert("ERRO: " + e.message);
    }
  };

  const handleEdit = (res: Reservation) => {
    setFormData({
      chaletId: res.chaletId,
      startDate: res.startDate,
      endDate: res.endDate,
      origin: res.origin || 'WhatsApp',
      guest1Name: res.guest1Name,
      guest1Cpf: res.guest1Cpf || '',
      guest1Phone: res.guest1Phone || '',
      guest2Name: res.guest2Name || '',
      guest2Cpf: res.guest2Cpf || '',
      totalValue: res.totalValue,
      amountPaid: res.amountPaid || 0,
      paymentMethod: res.paymentMethod || 'Pix',
      paymentType: res.paymentType || 'Integral',
      observations: res.observations || ''
    });
    setEditingId(res.id);
    setSelectedRes(null);
  };

  const filteredReservations = reservations.filter(r => {
    return r.startDate >= filterStartDate && r.startDate <= filterEndDate;
  });

  const remainingBalance = Number(formData.totalValue) - Number(formData.amountPaid);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in h-auto lg:h-[calc(100vh-100px)]">
      <div className={`lg:col-span-1 bg-white rounded-xl shadow-lg border flex flex-col overflow-hidden h-auto lg:h-full transition-colors ${editingId ? 'border-serra-accent/50 ring-1 ring-serra-accent/20' : 'border-gray-200'}`}>
        <div className={`p-4 border-b flex items-center justify-between ${editingId ? 'bg-serra-accent/5 border-serra-accent/20' : 'border-gray-100'}`}>
          <div className="flex items-center gap-2">
            {editingId ? <Edit className="text-serra-accent" size={20} /> : <Plus className="text-green-600" size={20} />}
            <h2 className={`font-bold text-lg ${editingId ? 'text-serra-accent' : 'text-gray-800'}`}>
              {editingId ? 'Editar Reserva' : 'Nova Reserva'}
            </h2>
          </div>
          {editingId && (
            <button onClick={handleCancelEdit} className="text-xs font-bold text-red-500 hover:text-red-700 flex items-center gap-1 bg-white px-2 py-1 rounded border border-red-100">
               <XCircle size={14}/> Cancelar
            </button>
          )}
        </div>
        
        <div className="p-6 overflow-y-auto flex-1 space-y-6 scrollbar-thin scrollbar-thumb-gray-200">
          <div>
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 border-b border-gray-100 pb-1">1. Estadia</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Chalé</label>
                <select 
                  name="chaletId" 
                  value={formData.chaletId} 
                  onChange={handleInputChange}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:border-serra-accent transition-colors"
                >
                  {chalets.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">Entrada</label>
                  <input 
                    type="date" 
                    name="startDate"
                    value={formData.startDate}
                    onChange={handleInputChange}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:border-serra-accent" 
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">Saída</label>
                  <input 
                    type="date" 
                    name="endDate"
                    value={formData.endDate}
                    onChange={handleInputChange}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:border-serra-accent" 
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Origem da Reserva</label>
                <select 
                  name="origin" 
                  value={formData.origin} 
                  onChange={handleInputChange}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:border-serra-accent"
                >
                  <option value="WhatsApp">WhatsApp</option>
                  <option value="Instagram">Instagram</option>
                  <option value="Airbnb">Airbnb</option>
                  <option value="Booking">Booking</option>
                  <option value="Indicação">Indicação</option>
                  <option value="Outro">Outro</option>
                </select>
              </div>
            </div>
          </div>

          <div>
             <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 border-b border-gray-100 pb-1">2. Dados dos Hóspedes</h3>
             <div className="space-y-3">
               <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">Titular (Hóspede 1) *</label>
                  <input 
                    type="text" 
                    name="guest1Name"
                    placeholder="Nome Completo *" 
                    value={formData.guest1Name}
                    onChange={handleInputChange}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:border-serra-accent placeholder-gray-400"
                  />
               </div>
               <div className="grid grid-cols-2 gap-3">
                  <input 
                    type="text" 
                    name="guest1Cpf"
                    placeholder="CPF" 
                    value={formData.guest1Cpf}
                    onChange={handleInputChange}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:border-serra-accent placeholder-gray-400"
                  />
                  <input 
                    type="text" 
                    name="guest1Phone"
                    placeholder="Telefone" 
                    value={formData.guest1Phone}
                    onChange={handleInputChange}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:border-serra-accent placeholder-gray-400"
                  />
               </div>

               <div className="pt-2">
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">Acompanhante (Hóspede 2) - Opcional</label>
                  <input 
                    type="text" 
                    name="guest2Name"
                    placeholder="Nome Completo" 
                    value={formData.guest2Name}
                    onChange={handleInputChange}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:border-serra-accent placeholder-gray-400 mb-2"
                  />
                  <input 
                    type="text" 
                    name="guest2Cpf"
                    placeholder="CPF" 
                    value={formData.guest2Cpf}
                    onChange={handleInputChange}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:border-serra-accent placeholder-gray-400"
                  />
               </div>
             </div>
          </div>

          <div>
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 border-b border-gray-100 pb-1">3. Financeiro</h3>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">Valor Total (R$)</label>
                  <input 
                    type="number" 
                    name="totalValue"
                    placeholder="0.00"
                    value={formData.totalValue}
                    onChange={handleInputChange}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:border-serra-accent font-bold text-gray-700"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">Forma Pagto</label>
                  <select 
                    name="paymentMethod" 
                    value={formData.paymentMethod} 
                    onChange={handleInputChange}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:border-serra-accent"
                  >
                    <option value="Pix">Pix</option>
                    <option value="Crédito">Crédito</option>
                    <option value="Débito">Débito</option>
                    <option value="Dinheiro">Dinheiro</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-600 mb-2 block">Status do Pagamento</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input 
                      type="radio" 
                      name="paymentType" 
                      checked={formData.paymentType === 'Integral'}
                      onChange={() => handleRadioChange('Integral')}
                      className="text-serra-accent focus:ring-serra-accent"
                    />
                    <span className="text-gray-700">Integral (100%)</span>
                  </label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input 
                      type="radio" 
                      name="paymentType" 
                      checked={formData.paymentType === 'Parcial'}
                      onChange={() => handleRadioChange('Parcial')}
                      className="text-serra-accent focus:ring-serra-accent"
                    />
                    <span className="text-gray-700">Parcial (Sinal)</span>
                  </label>
                </div>

                {formData.paymentType === 'Parcial' && (
                  <div className="mt-3 p-3 bg-yellow-50 rounded-lg border border-yellow-100 animate-fade-in">
                     <div className="flex justify-between items-center mb-2">
                        <label className="text-xs font-bold text-yellow-700 uppercase">Valor do Sinal (R$)</label>
                     </div>
                     <input 
                       type="number" 
                       name="amountPaid"
                       value={formData.amountPaid}
                       onChange={handleInputChange}
                       className="w-full p-2 bg-white border border-yellow-200 rounded-lg text-sm outline-none focus:border-yellow-400 font-bold text-gray-700 mb-2"
                       placeholder="0.00"
                     />
                     <div className="flex justify-between items-center text-xs border-t border-yellow-200 pt-2 mt-1">
                        <span className="text-gray-500 font-medium">Falta Pagar:</span>
                        <span className="font-bold text-red-500 text-sm">{formatCurrency(remainingBalance < 0 ? 0 : remainingBalance)}</span>
                     </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 border-b border-gray-100 pb-1">4. Observações</h3>
            <textarea 
              name="observations"
              rows={3}
              placeholder="Ex: Hóspede solicitou berço extra. Alérgico a camarão."
              value={formData.observations}
              onChange={handleInputChange}
              className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:border-serra-accent resize-none placeholder-gray-400"
            ></textarea>
          </div>

          <button 
            onClick={handleSave}
            className={`w-full font-bold py-3 rounded-lg shadow-md transition-colors flex items-center justify-center gap-2 text-white ${editingId ? 'bg-serra-accent hover:bg-serra-copper' : 'bg-green-600 hover:bg-green-700'}`}
          >
             {editingId ? <Save size={18}/> : <Plus size={18}/>}
             {editingId ? 'Atualizar Reserva' : 'Salvar Reserva'}
          </button>
        </div>
      </div>

      <div className="lg:col-span-2 flex flex-col h-[600px] lg:h-full space-y-4">
         
         <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
               <h2 className="font-serif text-2xl font-bold text-serra-dark flex items-center gap-2">
                 <ListTodo size={24} className="text-serra-accent" /> Histórico de Reservas
               </h2>
               <p className="text-gray-500 text-sm mt-1">Acompanhe os check-ins da semana.</p>
            </div>
            <div className="flex gap-2">
               <button 
                 onClick={() => setShowImportModal(true)}
                 className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg flex items-center gap-2 transition-colors shadow-sm active:scale-95"
               >
                 <FileSpreadsheet size={16}/> Importar Planilha
               </button>
            </div>
         </div>

         <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex items-center gap-4">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Filtro:</span>
            <div className="flex items-center gap-2">
               <input 
                 type="date" 
                 value={filterStartDate}
                 onChange={(e) => setFilterStartDate(e.target.value)}
                 className="bg-gray-50 border border-gray-200 rounded px-2 py-1 text-sm outline-none text-gray-600 focus:border-serra-accent"
               />
               <span className="text-gray-400">-</span>
               <input 
                 type="date" 
                 value={filterEndDate}
                 onChange={(e) => setFilterEndDate(e.target.value)}
                 className="bg-gray-50 border border-gray-200 rounded px-2 py-1 text-sm outline-none text-gray-600 focus:border-serra-accent"
               />
            </div>
         </div>

         <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden relative">
            {filteredReservations.length === 0 ? (
               <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-300">
                  <div className="border-4 border-gray-100 rounded-xl p-6 mb-4">
                    <CalendarIcon size={64} className="text-gray-200" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-400">Nenhuma reserva encontrada</h3>
                  <p className="text-sm">Utilize o botão "Importar Lote" ou "Importar Texto" para começar.</p>
               </div>
            ) : (
               <div className="overflow-x-auto overflow-y-auto h-full scrollbar-thin scrollbar-thumb-gray-200">
                  <table className="w-full text-left border-collapse min-w-[600px]">
                    <thead className="bg-gray-50 border-b border-gray-100 sticky top-0 z-10 shadow-sm">
                      <tr>
                        <th className="p-4 text-xs font-bold text-gray-500 uppercase">Hóspede</th>
                        <th className="p-4 text-xs font-bold text-gray-500 uppercase">Chalé</th>
                        <th className="p-4 text-xs font-bold text-gray-500 uppercase">Período</th>
                        <th className="p-4 text-xs font-bold text-gray-500 uppercase text-center">Status</th>
                        <th className="p-4 text-xs font-bold text-gray-500 uppercase text-right">Ação</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredReservations.map(res => {
                         const isPaid = (res.amountPaid || 0) >= res.totalValue;
                         return (
                           <tr key={res.id} className="border-b border-gray-50 hover:bg-blue-50/30 transition-colors group cursor-pointer" onClick={() => setSelectedRes(res)}>
                             <td className="p-4">
                                <p className="font-bold text-gray-800">{res.guest1Name}</p>
                                <div className="flex items-center gap-2 text-[10px] text-gray-400 mt-0.5">
                                   <User size={10} /> <span>{res.guest2Name ? '+1 Acompanhante' : 'Sozinho(a)'}</span>
                                </div>
                             </td>
                             <td className="p-4 text-sm text-gray-600 font-medium">
                                {chalets.find(c => c.id === res.chaletId)?.name}
                             </td>
                             <td className="p-4 text-sm text-gray-600">
                                <div className="flex flex-col">
                                  <span className="font-bold text-xs">{format(parseISO(res.startDate), 'dd/MM/yyyy')}</span>
                                  <span className="text-[10px] text-gray-400">até {format(parseISO(res.endDate), 'dd/MM/yyyy')}</span>
                                </div>
                             </td>
                             <td className="p-4 text-center">
                                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold uppercase ${isPaid ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                   {isPaid ? <CheckCircle2 size={10}/> : <AlertCircle size={10}/>}
                                   {isPaid ? 'Pago' : 'Pendente'}
                                </span>
                             </td>
                             <td className="p-4 text-right">
                                <button onClick={(e) => { e.stopPropagation(); setSelectedRes(res); }} className="p-2 bg-white border border-gray-200 text-gray-500 rounded hover:bg-serra-accent hover:text-white hover:border-serra-accent transition-all shadow-sm">
                                   <MoreVertical size={16} />
                                </button>
                             </td>
                           </tr>
                         );
                      })}
                    </tbody>
                  </table>
               </div>
            )}
         </div>
      </div>

      {selectedRes && (
        <ReservationDetailModal 
            reservation={selectedRes} 
            chalets={chalets} 
            onClose={() => setSelectedRes(null)}
            onDelete={handleDelete}
            onEdit={handleEdit}
            onSettle={handleSettle}
        />
      )}

      {showImportModal && (
        <ImportSpreadsheetModal
          chalets={chalets}
          onClose={() => setShowImportModal(false)}
          onSuccess={() => { loadData(); setShowImportModal(false); }}
        />
      )}
    </div>
  );
};

const CalendarManager = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [chalets, setChalets] = useState<Chalet[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [prices, setPrices] = useState<CustomPrice[]>([]);
  const [selectedChaletId, setSelectedChaletId] = useState('');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [newPrice, setNewPrice] = useState('');
  const [selectedRes, setSelectedRes] = useState<Reservation | null>(null);

  const loadData = async () => {
     const [c, r, p] = await Promise.all([ChaletService.getAll(), ReservationService.getAll(), PricingService.getAll()]);
     setChalets(c);
     setReservations(r);
     setPrices(p);
     if(c.length > 0 && !selectedChaletId) setSelectedChaletId(c[0].id);
  };

  useEffect(() => { loadData(); }, []);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  
  const startDayOfWeek = getDay(monthStart); 
  const paddingDays = Array.from({ length: startDayOfWeek });

  const handleSetPrice = async () => {
      if (!selectedDate || !selectedChaletId || !newPrice) return;
      await PricingService.setPrice(selectedChaletId, [selectedDate], Number(newPrice));
      setNewPrice('');
      setSelectedDate(null);
      loadData();
  };

  return (
    <div className="space-y-6">
       <div className="flex justify-between items-center">
          <h2 className="font-serif text-3xl font-bold text-serra-dark">Calendário & Tarifas</h2>
          <div className="flex items-center gap-4">
             <button onClick={() => setCurrentDate(subMonths(currentDate, 1))} className="p-2 hover:bg-gray-200 rounded-full"><ChevronLeft /></button>
             <span className="font-bold text-lg w-40 text-center capitalize">{format(currentDate, 'MMMM yyyy', { locale: ptBR })}</span>
             <button onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="p-2 hover:bg-gray-200 rounded-full"><ChevronRight /></button>
          </div>
       </div>

       <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
          <label className="text-xs font-bold text-gray-500 uppercase">Visualizar Chalé</label>
          <select value={selectedChaletId} onChange={(e) => setSelectedChaletId(e.target.value)} className="w-full mt-1 p-2 bg-gray-50 border border-gray-200 rounded outline-none">
              {chalets.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
       </div>

       <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="grid grid-cols-7 gap-2 mb-2">
             {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
                 <div key={d} className="text-center text-xs font-bold text-gray-400 uppercase">{d}</div>
             ))}
          </div>
          <div className="grid grid-cols-7 gap-2">
             {paddingDays.map((_, i) => <div key={`pad-${i}`} />)}
             {daysInMonth.map(day => {
                 const dateStr = format(day, 'yyyy-MM-dd');
                 const res = reservations.find(r => 
                     r.chaletId === selectedChaletId && 
                     isWithinInterval(day, { start: parseISO(r.startDate), end: addDays(parseISO(r.endDate), -1) })
                 );
                 const customPrice = prices.find(p => p.chaletId === selectedChaletId && p.date === dateStr);
                 const basePrice = chalets.find(c => c.id === selectedChaletId)?.basePrice || 0;
                 const finalPrice = customPrice ? customPrice.price : (getDay(day) === 1 ? 0 : (getDay(day) >= 2 && getDay(day) <= 4 ? basePrice * 0.85 : basePrice));
                 
                 const isSelected = selectedDate === dateStr;

                 return (
                     <div
                        key={dateStr}
                        onClick={() => res ? setSelectedRes(res) : setSelectedDate(dateStr)}
                        className={`min-h-[80px] border rounded-lg p-2 cursor-pointer transition-all relative ${isSelected ? 'ring-2 ring-serra-accent border-transparent' : 'border-gray-100 hover:border-serra-accent'} ${res ? (res.type === 'maintenance' ? 'bg-gray-100' : 'bg-red-50') : 'bg-white'}`}
                     >
                        <span className="text-xs font-bold text-gray-700">{format(day, 'd')}</span>
                        <div className="mt-1">
                            {res ? (
                                <span className="block text-[10px] bg-white/50 px-1 rounded truncate text-gray-600">
                                    {res.type === 'maintenance' ? 'Manut.' : res.guest1Name}
                                </span>
                            ) : (
                                <span className={`block text-xs font-medium ${customPrice ? 'text-blue-600' : 'text-green-600'}`}>
                                    R$ {Math.round(finalPrice)}
                                </span>
                            )}
                        </div>
                     </div>
                 );
             })}
          </div>
       </div>

       {selectedDate && (
           <div className="fixed bottom-0 left-0 right-0 bg-white p-4 shadow-2xl border-t border-gray-200 flex items-center justify-center gap-4 z-50 animate-slide-up">
               <span className="font-bold text-gray-700">Editar dia {format(parseISO(selectedDate), 'dd/MM/yyyy')}</span>
               <input
                 type="number"
                 placeholder="Novo Preço"
                 value={newPrice}
                 onChange={(e) => setNewPrice(e.target.value)}
                 className="p-2 border rounded w-32"
               />
               <button onClick={handleSetPrice} className="bg-serra-accent text-white px-4 py-2 rounded font-bold hover:bg-serra-dark">Salvar Preço</button>
               <button onClick={() => setSelectedDate(null)} className="text-gray-500 hover:text-gray-700">Cancelar</button>
           </div>
       )}

       {selectedRes && (
         <ReservationDetailModal
           reservation={selectedRes}
           chalets={chalets}
           onClose={() => setSelectedRes(null)}
           onDelete={async (id) => { await ReservationService.delete(id); setSelectedRes(null); loadData(); }}
           onEdit={() => { setSelectedRes(null); loadData(); }}
           onSettle={async (res) => { await ReservationService.update({ ...res, amountPaid: Number(res.totalValue), paymentType: 'Integral' }); setSelectedRes(null); loadData(); }}
         />
       )}
    </div>
  );
};

const FinancialManager = () => {
    const [reservations, setReservations] = useState<Reservation[]>([]);
    const [chalets, setChalets] = useState<Chalet[]>([]);
    const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
    const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
    
    useEffect(() => {
        Promise.all([ReservationService.getAll(), ChaletService.getAll()])
            .then(([r, c]) => {
                setReservations(r);
                setChalets(c);
            });
    }, []);

    const filteredReservations = reservations.filter(r => {
        if (r.type !== 'guest') return false;
        return r.startDate >= startDate && r.startDate <= endDate;
    });

    const totalRevenue = filteredReservations.reduce((acc, r) => acc + r.totalValue, 0);
    const totalReceived = filteredReservations.reduce((acc, r) => acc + (r.amountPaid || 0), 0);
    const totalPending = totalRevenue - totalReceived;
    const totalCount = filteredReservations.length;

    return (
        <div className="space-y-8 animate-fade-in">
            <div>
                <h2 className="font-serif text-3xl font-bold text-serra-dark">Relatórios Financeiros</h2>
                <p className="text-gray-500 mt-2">Acompanhe o desempenho financeiro do Recanto.</p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex flex-col md:flex-row items-center justify-between gap-4">
                <span className="font-bold text-gray-700 text-lg">Período de Análise</span>
                <div className="flex items-center gap-3 bg-gray-50 p-2 rounded-lg border border-gray-200">
                    <input 
                        type="date" 
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="bg-transparent text-gray-700 outline-none font-medium cursor-pointer"
                    />
                    <span className="text-gray-400">até</span>
                    <input 
                        type="date" 
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="bg-transparent text-gray-700 outline-none font-medium cursor-pointer"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 border-l-4 border-l-serra-accent">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Faturamento Total</p>
                    <p className="text-2xl font-bold text-gray-800">{formatCurrency(totalRevenue)}</p>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 border-l-4 border-l-blue-500">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Reservas</p>
                    <p className="text-2xl font-bold text-gray-800">{totalCount}</p>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 border-l-4 border-l-green-500">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Recebido (Caixa)</p>
                    <p className="text-2xl font-bold text-gray-800">{formatCurrency(totalReceived)}</p>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 border-l-4 border-l-red-500">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">A Receber</p>
                    <p className="text-2xl font-bold text-gray-800">{formatCurrency(totalPending)}</p>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
                <h3 className="font-bold text-lg text-gray-800 mb-6 flex items-center gap-2">
                    <BarChart3 size={20} className="text-serra-dark"/> Desempenho por Chalé
                </h3>
                <div className="space-y-4">
                    {chalets.map(chalet => {
                        const chaletRes = filteredReservations.filter(r => r.chaletId === chalet.id);
                        const revenue = chaletRes.reduce((sum, r) => sum + r.totalValue, 0);
                        const count = chaletRes.length;
                        
                        return (
                            <div key={chalet.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                                <span className="font-medium text-gray-700">{chalet.name}</span>
                                <div className="text-right">
                                    <span className="font-bold text-gray-800 block">{formatCurrency(revenue)}</span>
                                    <span className="text-xs text-gray-400">{count} res</span>
                                </div>
                            </div>
                        );
                    })}
                    {chalets.length === 0 && <p className="text-gray-400 text-sm">Nenhum chalé cadastrado.</p>}
                </div>
            </div>
        </div>
    );
};

const GalleryManager = () => {
  const [chalets, setChalets] = useState<Chalet[]>([]);
  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>([]);
  const [selectedChaletId, setSelectedChaletId] = useState<string>('general');
  const [uploading, setUploading] = useState(false);
  const [description, setDescription] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadData = async () => {
    const [c, g] = await Promise.all([ChaletService.getAll(), GalleryService.getAll()]);
    setChalets(c);
    setGalleryItems(g);
  };

  useEffect(() => { loadData(); }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    setUploading(true);

    try {
      const file = e.target.files[0];
      const isVideo = file.type.startsWith('video/');
      let url = '';

      if (isVideo) {
         url = await new Promise((resolve) => {
           const reader = new FileReader();
           reader.onloadend = () => resolve(reader.result as string);
           reader.readAsDataURL(file);
         });
      } else {
         url = await processImageFile(file);
      }

      await GalleryService.add({
        chaletId: selectedChaletId,
        type: isVideo ? 'video' : 'image',
        url: url,
        description: description
      });

      setDescription('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      await loadData();
    } catch (err) {
      alert('Erro ao fazer upload.');
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Excluir este item da galeria?")) {
      await GalleryService.remove(id);
      await loadData();
    }
  };

  const filteredItems = galleryItems.filter(item => item.chaletId === selectedChaletId);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-serif text-3xl font-bold text-serra-dark">Galeria de Mídia</h2>
        <p className="text-gray-500 mt-2">Adicione fotos e vídeos para a galeria pública do site.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
             <label className="block text-sm font-bold text-gray-700 mb-2">Selecione o Chalé</label>
             <select 
               value={selectedChaletId} 
               onChange={(e) => setSelectedChaletId(e.target.value)}
               className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg outline-none mb-4"
             >
               <option value="general">Geral (Sem Chalé Específico)</option>
               {chalets.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
             </select>

             <div className="border-t border-gray-100 pt-4">
                <label className="block text-sm font-bold text-gray-700 mb-2">Novo Item</label>
                <textarea 
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Escreva uma descrição para a foto/vídeo..."
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg outline-none text-sm mb-3 h-24 resize-none"
                ></textarea>
                
                <input 
                  type="file" 
                  ref={fileInputRef}
                  className="hidden" 
                  accept="image/*,video/*"
                  onChange={handleFileUpload}
                />

                <button 
                  onClick={() => !uploading && fileInputRef.current?.click()}
                  disabled={uploading}
                  className="w-full py-3 bg-serra-accent hover:bg-serra-copper text-white font-bold rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                >
                  {uploading ? <RefreshCw className="animate-spin" size={20}/> : <Upload size={20}/>}
                  {uploading ? 'Enviando...' : 'Selecionar Foto/Vídeo'}
                </button>
             </div>
          </div>
        </div>

        <div className="lg:col-span-2">
           <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 min-h-[400px]">
              <h3 className="font-bold text-lg mb-6 text-gray-700 flex items-center justify-between">
                <span>Itens da Galeria ({filteredItems.length})</span>
                <span className="text-xs font-normal text-gray-400 bg-gray-100 px-2 py-1 rounded">
                   {selectedChaletId === 'general' ? 'Geral' : chalets.find(c => c.id === selectedChaletId)?.name}
                </span>
              </h3>
              
              {filteredItems.length === 0 ? (
                <div className="h-64 flex flex-col items-center justify-center text-gray-400 border-2 border-dashed border-gray-100 rounded-lg">
                  <ImageIcon size={48} className="mb-2 opacity-20"/>
                  <p>Nenhum item nesta galeria ainda.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {filteredItems.map(item => (
                    <div key={item.id} className="relative group bg-gray-50 rounded-lg overflow-hidden border border-gray-200">
                       <div className="aspect-square relative">
                          {item.type === 'video' ? (
                            <>
                              <video src={item.url} className="w-full h-full object-cover opacity-80" />
                              <div className="absolute inset-0 flex items-center justify-center">
                                <PlayCircle size={32} className="text-white drop-shadow-lg"/>
                              </div>
                              <div className="absolute top-2 left-2 bg-black/60 text-white text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1">
                                <Video size={10}/> VÍDEO
                              </div>
                            </>
                          ) : (
                            <img src={item.url} className="w-full h-full object-cover" />
                          )}
                          
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                             <button 
                               onClick={() => handleDelete(item.id)}
                               className="bg-red-600 text-white p-2 rounded-full hover:bg-red-700 transition-colors"
                             >
                               <Trash2 size={20} />
                             </button>
                          </div>
                       </div>
                       <div className="p-3">
                         <p className="text-xs text-gray-600 line-clamp-2 min-h-[2.5em]">
                           {item.description || <span className="italic text-gray-400">Sem descrição</span>}
                         </p>
                       </div>
                    </div>
                  ))}
                </div>
              )}
           </div>
        </div>
      </div>
    </div>
  );
};

const SiteConfigManager = () => {
  const [heroImages, setHeroImages] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { SiteService.getHeroImages().then(setHeroImages); }, []);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    setIsProcessing(true);
    try {
      const newImages = [...heroImages];
      for (let i = 0; i < e.target.files.length; i++) {
        newImages.push(await processImageFile(e.target.files[i]));
      }
      setHeroImages(newImages);
      await SiteService.saveHeroImages(newImages);
    } catch { alert("Erro ao processar."); } 
    finally { setIsProcessing(false); if(fileInputRef.current) fileInputRef.current.value = ''; }
  };

  const removeImage = async (index: number) => {
    const updated = [...heroImages];
    updated.splice(index, 1);
    setHeroImages(updated);
    await SiteService.saveHeroImages(updated);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-serif text-3xl font-bold text-serra-dark">Configurações do Site</h2>
        <p className="text-gray-500 mt-2">Gerencie imagens, banners e informações gerais do site.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 bg-white rounded-xl shadow-sm border border-gray-200 p-6 h-fit">
           <h3 className="font-bold text-lg text-serra-dark mb-4">Informações</h3>
           <p className="text-gray-600 mb-6 text-sm leading-relaxed">
             Gerencie as imagens que aparecem no topo da página inicial (Hero Banner).
           </p>
           
           <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
             <p className="text-blue-800 text-xs font-bold uppercase mb-1">Dica:</p>
             <p className="text-blue-600 text-sm">
               Utilize imagens horizontais de alta qualidade (ex: fotos panorâmicas dos chalés ou da paisagem).
             </p>
           </div>
        </div>

        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
           <h3 className="font-bold text-lg mb-6 flex items-center gap-2 text-serra-dark">
             <ImageIcon size={20} /> Imagens do Banner Principal
           </h3>
           
           <input type="file" multiple ref={fileInputRef} className="hidden" onChange={handleImageUpload} accept="image/*"/>
           
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {heroImages.map((url, idx) => (
                <div key={`${url}-${idx}`} className="relative aspect-video rounded-lg overflow-hidden group border border-gray-200">
                  <img 
                    src={url} 
                    className="w-full h-full object-cover"
                    onError={(e) => { e.currentTarget.src = 'https://placehold.co/600x400/f3f4f6/a3a3a3?text=Imagem+Quebrada'; }}
                  />
                  <div className="absolute top-3 left-3 bg-black/60 text-white text-[10px] font-bold px-2 py-1 rounded backdrop-blur-sm z-10">
                    Slide {idx + 1}
                  </div>
                  <button 
                    type="button"
                    onClick={(e) => { 
                      e.preventDefault();
                      e.stopPropagation(); 
                      removeImage(idx); 
                    }} 
                    className="absolute top-2 right-2 bg-white text-red-600 w-10 h-10 flex items-center justify-center rounded-full shadow-md z-50 cursor-pointer hover:bg-red-50 transition-colors"
                    title="Excluir imagem"
                  >
                    <Trash2 size={20} className="pointer-events-none"/>
                  </button>
                </div>
              ))}
              
              <button 
                onClick={() => fileInputRef.current?.click()} 
                disabled={isProcessing} 
                className="aspect-video border-2 border-dashed border-gray-200 rounded-lg flex flex-col items-center justify-center text-gray-400 hover:border-serra-accent hover:text-serra-accent hover:bg-gray-50 transition-all group"
              >
                {isProcessing ? <RefreshCw className="animate-spin mb-2"/> : <Upload className="mb-2 group-hover:scale-110 transition-transform" size={24}/>}
                <span className="text-sm font-bold">Adicionar Novas Fotos</span>
              </button>
           </div>
           
           <p className="text-right text-xs text-gray-400 mt-4">As alterações são salvas automaticamente.</p>
        </div>
      </div>
    </div>
  );
};

const ChaletManager = () => {
  const [chalets, setChalets] = useState<Chalet[]>([]);
  const [selectedChaletId, setSelectedChaletId] = useState('');
  const [formData, setFormData] = useState<Chalet | null>(null);
  const [isProcessingImg, setIsProcessingImg] = useState(false);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    ChaletService.getAll().then(loaded => {
        setChalets(loaded);
        if (loaded.length > 0) {
            setSelectedChaletId(loaded[0].id);
            setFormData(loaded[0]);
        }
    });
  }, []);

  const handleChaletSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    setSelectedChaletId(id);
    const chalet = chalets.find(c => c.id === id);
    if (chalet) setFormData(chalet);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (!formData) return;
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleAmenityChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (!formData) return;
    setFormData({ ...formData, amenities: e.target.value.split('\n').filter(l => l.trim()) });
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!formData || !e.target.files?.length) return;
    setIsProcessingImg(true);
    try {
      const base64 = await processImageFile(e.target.files[0]);
      setFormData({ ...formData, coverImage: base64 });
    } catch { alert("Erro na imagem."); } finally { setIsProcessingImg(false); }
  };

  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!formData || !e.target.files?.length) return;
    setIsProcessingImg(true);
    try {
      const newImages = [...formData.images];
      for (let i = 0; i < e.target.files.length; i++) newImages.push(await processImageFile(e.target.files[i]));
      setFormData({ ...formData, images: newImages });
    } catch { alert("Erro nas imagens."); } finally { setIsProcessingImg(false); }
  };

  const handleSave = async () => {
    if (formData) {
      try {
        await ChaletService.save(formData);
        alert('Salvo!');
        const updated = await ChaletService.getAll();
        setChalets(updated);
      } catch { alert('Erro ao salvar no banco.'); }
    }
  };

  if (!formData) return <div>Carregando...</div>;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
       <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-xl shadow p-6 border border-gray-200">
            <label className="block text-sm font-bold text-gray-700 mb-3">Selecione o Chalé para Editar</label>
            <div className="relative">
              <select value={selectedChaletId} onChange={handleChaletSelect} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-serra-accent appearance-none">
                {chalets.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <div className="absolute right-3 top-3.5 pointer-events-none text-gray-400">
                <ChevronRight size={16} className="rotate-90" />
              </div>
            </div>
            
            <div className="mt-8 border-t pt-6">
              <h4 className="font-bold text-gray-600 mb-4 text-sm">Resumo Atual</h4>
              <div className="space-y-3 text-sm text-gray-500">
                <div className="flex justify-between">
                  <span>Preço Base:</span>
                  <span className="font-medium text-gray-800">{formatCurrency(formData.basePrice)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Fotos Galeria:</span>
                  <span className="font-medium text-gray-800">{formData.images.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Comodidades:</span>
                  <span className="font-medium text-gray-800">{formData.amenities.length}</span>
                </div>
              </div>
            </div>
          </div>
       </div>

       <div className="lg:col-span-2 space-y-8">
          
          <div className="space-y-4">
             <div className="h-64 rounded-xl overflow-hidden shadow-lg relative bg-gray-100 group">
                <img src={formData.coverImage} className="w-full h-full object-cover" alt="Cover Preview" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-6">
                  <h2 className="text-white font-serif text-3xl font-bold">{formData.name}</h2>
                </div>
             </div>
             <div className="flex gap-4 overflow-x-auto pb-2 snap-x">
               {formData.images.map((img, i) => (
                 <div key={i} className="w-24 h-16 flex-shrink-0 rounded-lg overflow-hidden border border-gray-200 snap-start">
                   <img src={img} className="w-full h-full object-cover" />
                 </div>
               ))}
               <div className="w-24 h-16 flex-shrink-0 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400 bg-gray-50">
                  <Plus size={20} />
               </div>
             </div>
          </div>

          <div className="bg-white rounded-xl shadow p-8 border border-gray-200">
            <h3 className="font-bold text-lg mb-6 flex items-center gap-2 text-serra-dark">
              <PenLine size={20} className="text-serra-accent"/> Informações Principais
            </h3>
            <div className="space-y-5">
               <div>
                 <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nome do Chalé</label>
                 <input name="name" value={formData.name} onChange={handleInputChange} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-serra-accent" />
               </div>
               <div>
                 <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Descrição Completa</label>
                 <textarea name="description" rows={4} value={formData.description} onChange={handleInputChange} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-serra-accent resize-none"></textarea>
               </div>
               <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Preço Base (Fim de Semana)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-3 text-gray-500">R$</span>
                      <input name="basePrice" type="number" value={formData.basePrice} onChange={handleInputChange} className="w-full p-3 pl-10 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-serra-accent font-bold text-gray-700" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Capacidade</label>
                    <input name="capacity" value={formData.capacity} onChange={handleInputChange} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-serra-accent" />
                  </div>
               </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow p-8 border border-gray-200">
             <h3 className="font-bold text-lg mb-6 flex items-center gap-2 text-serra-dark">
               <List size={20} className="text-serra-accent"/> Comodidades
             </h3>
             <label className="block text-xs text-gray-400 mb-2">Digite uma comodidade por linha.</label>
             <textarea rows={6} value={formData.amenities.join('\n')} onChange={handleAmenityChange} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-serra-accent font-mono text-sm"></textarea>
          </div>

          <div className="bg-white rounded-xl shadow p-8 border border-gray-200">
             <h3 className="font-bold text-lg mb-6 flex items-center gap-2 text-serra-dark">
               <ImageIcon size={20} className="text-serra-accent"/> Gestão de Imagens
             </h3>
             
             <div className="mb-8">
               <label className="text-xs font-bold text-gray-500 uppercase mb-3 block">Foto de Capa</label>
               <input type="file" ref={coverInputRef} className="hidden" onChange={handleCoverUpload}/>
               <div className="h-48 bg-gray-50 border-2 border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer rounded-xl overflow-hidden hover:bg-gray-100 transition-colors group relative" onClick={() => coverInputRef.current?.click()}>
                 {formData.coverImage ? (
                   <>
                     <img src={formData.coverImage} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"/>
                     <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="text-white font-bold flex items-center gap-2"><Camera size={20}/> Alterar Capa</span>
                     </div>
                   </>
                 ) : (
                   <span className="text-gray-400 flex flex-col items-center gap-2"><ImageIcon size={32}/>Clique para definir capa</span>
                 )}
               </div>
             </div>

             <label className="text-xs font-bold text-gray-500 uppercase mb-3 block">Galeria de Fotos</label>
             <input type="file" multiple ref={galleryInputRef} className="hidden" onChange={handleGalleryUpload}/>
             <div className="grid grid-cols-4 gap-4">
                {formData.images.map((url, i) => (
                  <div key={i} className="relative aspect-square group rounded-lg overflow-hidden shadow-sm">
                    <img src={url} className="w-full h-full object-cover"/>
                    <button onClick={() => setFormData({...formData, images: formData.images.filter((_, x) => x !== i)})} className="absolute inset-0 bg-red-500/80 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                      <Trash2 size={24}/>
                    </button>
                  </div>
                ))}
                <button onClick={() => galleryInputRef.current?.click()} className="aspect-square border-2 border-dashed border-gray-300 bg-gray-50 hover:bg-gray-100 flex flex-col items-center justify-center text-gray-400 rounded-lg transition-colors">
                  <Plus size={24}/>
                  <span className="text-xs mt-1">Adicionar</span>
                </button>
             </div>
          </div>
          
          <button onClick={handleSave} disabled={isProcessingImg} className="w-full py-4 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl shadow-lg shadow-green-200 flex items-center justify-center gap-2 transition-all active:scale-95">
            <Save size={20}/> Salvar Alterações
          </button>
       </div>
    </div>
  );
};

const Admin = () => {
  const [activeTab, setActiveTab] = useState('reservas');
  
  return (
    <div className="flex min-h-screen bg-gray-100 font-sans">
      <aside className="w-64 bg-serra-dark text-white hidden md:flex flex-col p-4 space-y-2">
        <h1 className="text-xl font-bold mb-6 px-2">
           Recanto<span className="text-serra-accent">Admin</span>
           <span className="block text-[10px] text-gray-400 font-normal">Painel de Controle</span>
        </h1>
        
        <button onClick={() => setActiveTab('reservas')} className={`flex items-center gap-3 w-full text-left p-3 rounded-lg font-medium transition-colors ${activeTab==='reservas' ? 'bg-serra-accent text-white shadow-lg' : 'hover:bg-white/10 text-gray-300'}`}>
           <ListTodo size={18} /> Gestão de Reservas
        </button>
        <button onClick={() => setActiveTab('calendario')} className={`flex items-center gap-3 w-full text-left p-3 rounded-lg font-medium transition-colors ${activeTab==='calendario' ? 'bg-serra-accent text-white shadow-lg' : 'hover:bg-white/10 text-gray-300'}`}>
           <CalendarIcon size={18} /> Calendário & Tarifas
        </button>
        <button onClick={() => setActiveTab('chales')} className={`flex items-center gap-3 w-full text-left p-3 rounded-lg font-medium transition-colors ${activeTab==='chales' ? 'bg-serra-accent text-white shadow-lg' : 'hover:bg-white/10 text-gray-300'}`}>
           <HomeIcon size={18} /> Gestão de Acomodações
        </button>
        <button onClick={() => setActiveTab('galeria')} className={`flex items-center gap-3 w-full text-left p-3 rounded-lg font-medium transition-colors ${activeTab==='galeria' ? 'bg-serra-accent text-white shadow-lg' : 'hover:bg-white/10 text-gray-300'}`}>
           <ImageIcon size={18} /> Galeria de Mídia
        </button>
        <button onClick={() => setActiveTab('financeiro')} className={`flex items-center gap-3 w-full text-left p-3 rounded-lg font-medium transition-colors ${activeTab==='financeiro' ? 'bg-serra-accent text-white shadow-lg' : 'hover:bg-white/10 text-gray-300'}`}>
           <BarChart3 size={18} /> Relatórios Financeiros
        </button>
        <button onClick={() => setActiveTab('config')} className={`flex items-center gap-3 w-full text-left p-3 rounded-lg font-medium transition-colors ${activeTab==='config' ? 'bg-serra-accent text-white shadow-lg' : 'hover:bg-white/10 text-gray-300'}`}>
           <Settings size={18} /> Configurações do Site
        </button>

        <div className="border-t border-white/10 my-2" />

        <button onClick={() => setActiveTab('conversas')} className={`flex items-center gap-3 w-full text-left p-3 rounded-lg font-medium transition-colors ${activeTab==='conversas' ? 'bg-purple-600 text-white shadow-lg' : 'hover:bg-white/10 text-gray-300'}`}>
           <MessageSquare size={18} /> Conversas WhatsApp
        </button>
        <button onClick={() => setActiveTab('agente')} className={`flex items-center gap-3 w-full text-left p-3 rounded-lg font-medium transition-colors ${activeTab==='agente' ? 'bg-purple-600 text-white shadow-lg' : 'hover:bg-white/10 text-gray-300'}`}>
           <Bot size={18} /> Agente IA — Serena
        </button>

        <Link to="/" className="mt-auto flex items-center gap-3 p-3 text-red-300 hover:text-white transition-colors">
           <LogOut size={18} /> Sair do Sistema
        </Link>
      </aside>
      <main className="flex-1 p-8 overflow-y-auto h-screen">
         {activeTab === 'reservas' && <ReservationManager />}
         {activeTab === 'calendario' && <CalendarManager />}
         {activeTab === 'chales' && <ChaletManager />}
         {activeTab === 'galeria' && <GalleryManager />}
         {activeTab === 'financeiro' && <FinancialManager />}
         {activeTab === 'config' && <SiteConfigManager />}
         {activeTab === 'conversas' && <div className="-m-8"><ChatPage embedded /></div>}
         {activeTab === 'agente' && <AgentConfigManager />}
      </main>
    </div>
  );
};

export default Admin;
