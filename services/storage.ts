
import { supabase } from '../supabaseClient';
import { Chalet, GalleryItem } from '../types';
import { CHALETS as DEFAULT_CHALETS } from '../constants';

// --- DEFINIÇÃO DE TIPOS ---
export interface Reservation {
  id: string;
  chaletId: string;
  type: 'guest' | 'maintenance'; 
  guest1Name: string;
  guest1Cpf?: string;
  guest1Phone?: string;
  guest2Name?: string;
  guest2Cpf?: string;
  startDate: string; // ISO String YYYY-MM-DD
  endDate: string;   // ISO String YYYY-MM-DD
  origin?: string;   
  totalValue: number;
  paymentMethod?: string; 
  paymentType?: 'Integral' | 'Parcial';
  amountPaid?: number; 
  observations?: string;
  createdAt: number;
}

export interface CustomPrice {
  id?: string;
  date: string; // YYYY-MM-DD
  chaletId: string;
  price: number;
}

// Imagens Padrão do Hero (Fallback)
const DEFAULT_HERO_IMAGES = [
  "https://alwqlbyjpagcdgbtnyxs.supabase.co/storage/v1/object/public/Chale%20da%20Floresta/floresta03.jpg",
  "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=1920&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1519681393784-d8e5b56524dd?q=80&w=1920&auto=format&fit=crop"
];

// --- HELPER DE DATAS ---
const parseLocalDay = (dateStr: string): Date => {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day, 12, 0, 0);
};

// --- MAPPERS (DB <-> APP) ---
const mapChaletFromDB = (c: any): Chalet => ({
  id: c.id,
  slug: c.slug,
  name: c.name,
  description: c.description,
  capacity: c.capacity,
  amenities: c.amenities || [],
  basePrice: Number(c.base_price),
  coverImage: c.cover_image,
  images: c.images || []
});

const mapChaletToDB = (c: Partial<Chalet>) => ({
  id: c.id,
  slug: c.slug,
  name: c.name,
  description: c.description,
  capacity: c.capacity,
  amenities: c.amenities,
  base_price: c.basePrice,
  cover_image: c.coverImage,
  images: c.images
});

const mapReservationFromDB = (r: any): Reservation => {
  // Lógica segura para converter created_at
  let createdAt = Date.now();
  if (r.created_at) {
    if (typeof r.created_at === 'number' || (typeof r.created_at === 'string' && !isNaN(Number(r.created_at)) && !r.created_at.includes('-'))) {
       createdAt = Number(r.created_at);
    } else {
       createdAt = new Date(r.created_at).getTime();
    }
  }

  return {
    id: r.id,
    chaletId: r.chalet_id,
    type: r.type || 'guest',
    guest1Name: r.guest1_name || 'Hóspede',
    guest1Cpf: r.guest1_cpf,
    guest1Phone: r.guest1_phone,
    guest2Name: r.guest2_name,
    guest2Cpf: r.guest2_cpf,
    startDate: r.start_date,
    endDate: r.end_date,
    origin: r.origin,
    totalValue: Number(r.total_value),
    paymentMethod: r.payment_method,
    paymentType: r.payment_type,
    amountPaid: Number(r.amount_paid),
    observations: r.observations,
    createdAt: createdAt
  };
};

const mapReservationToDB = (r: Partial<Reservation>) => ({
  chalet_id: r.chaletId,
  type: r.type,
  guest1_name: r.guest1Name,
  guest1_cpf: r.guest1Cpf,
  guest1_phone: r.guest1Phone,
  guest2_name: r.guest2Name,
  guest2_cpf: r.guest2Cpf,
  start_date: r.startDate,
  end_date: r.endDate,
  origin: r.origin,
  total_value: r.totalValue,
  payment_method: r.paymentMethod,
  payment_type: r.paymentType,
  amount_paid: r.amountPaid,
  observations: r.observations,
  created_at: r.createdAt || Date.now()
});

const mapGalleryItemFromDB = (g: any): GalleryItem => ({
  id: g.id,
  chaletId: g.chalet_id,
  type: g.type,
  url: g.url,
  description: g.description,
  createdAt: g.created_at
});

// --- SERVIÇO DE CONFIGURAÇÃO DO SITE ---
export const SiteService = {
  getHeroImages: async (): Promise<string[]> => {
    if (!supabase) return DEFAULT_HERO_IMAGES;
    const { data, error } = await supabase.from('site_config').select('value').eq('key', 'hero_images').single();
    if (error || !data) return DEFAULT_HERO_IMAGES;
    return data.value as string[];
  },

  saveHeroImages: async (images: string[]) => {
    if (!supabase) return;
    const { error } = await supabase.from('site_config').upsert({ key: 'hero_images', value: images });
    if (error) console.error("Erro ao salvar imagens do site:", error);
  }
};

// --- SERVIÇO DE CHALÉS ---
export const ChaletService = {
  getAll: async (): Promise<Chalet[]> => {
    if (!supabase) return DEFAULT_CHALETS;
    const { data, error } = await supabase.from('chalets').select('*').order('name');
    if (error) return DEFAULT_CHALETS;
    if (!data || data.length === 0) {
      await ChaletService.syncInitialData();
      return DEFAULT_CHALETS; 
    }
    return data.map(mapChaletFromDB);
  },

  save: async (chalet: Chalet) => {
    if (!supabase) return;
    const { data: existing } = await supabase.from('chalets').select('id').eq('id', chalet.id).single();
    const dbData = mapChaletToDB(chalet);
    if (existing) {
       await supabase.from('chalets').update(dbData).eq('id', chalet.id);
    } else {
       await supabase.from('chalets').insert(dbData); 
    }
  },
  
  syncInitialData: async () => {
    if(!supabase) return;
    const { count } = await supabase.from('chalets').select('*', { count: 'exact', head: true });
    if (count === 0) {
      const dbChalets = DEFAULT_CHALETS.map(c => mapChaletToDB(c));
      const { error } = await supabase.from('chalets').insert(dbChalets);
      if (error) console.error("Erro ao sincronizar chalés:", error);
    }
  }
};

// --- SERVIÇO DE GALERIA ---
export const GalleryService = {
  getAll: async (): Promise<GalleryItem[]> => {
    if (!supabase) return [];
    const { data, error } = await supabase.from('gallery').select('*').order('created_at', { ascending: false });
    if (error || !data) return [];
    return data.map(mapGalleryItemFromDB);
  },
  add: async (item: Omit<GalleryItem, 'id' | 'createdAt'>) => {
    if (!supabase) return;
    await supabase.from('gallery').insert({
      chalet_id: item.chaletId,
      type: item.type,
      url: item.url,
      description: item.description,
      created_at: Date.now()
    });
  },
  remove: async (id: string) => {
    if (!supabase) return;
    await supabase.from('gallery').delete().eq('id', id);
  }
};

// --- SERVIÇO DE PREÇOS ---
export const PricingService = {
  getAll: async (): Promise<CustomPrice[]> => {
    if (!supabase) return [];
    const { data, error } = await supabase.from('custom_prices').select('*');
    if (error || !data) return [];
    return data.map((p: any) => ({
      id: p.id,
      date: p.date,
      chaletId: p.chalet_id,
      price: Number(p.price)
    }));
  },
  setPrice: async (chaletId: string, dates: string[], price: number) => {
    if (!supabase) return;
    await PricingService.removePrice(chaletId, dates);
    const newPrices = dates.map(date => ({
      chalet_id: chaletId,
      date,
      price
    }));
    await supabase.from('custom_prices').insert(newPrices);
  },
  removePrice: async (chaletId: string, dates: string[]) => {
    if (!supabase) return;
    await supabase.from('custom_prices').delete().eq('chalet_id', chaletId).in('date', dates);
  },
  calculateDayPrice: (allPrices: CustomPrice[], allChalets: Chalet[], chaletId: string, dateStr: string): number => {
    const custom = allPrices.find(p => p.chaletId === chaletId && p.date === dateStr);
    if (custom) return custom.price;
    const chalet = allChalets.find(c => c.id === chaletId);
    if (!chalet) return 0;
    const date = parseLocalDay(dateStr);
    const dayOfWeek = date.getDay();
    if (dayOfWeek === 1) return 0; 
    if (dayOfWeek >= 2 && dayOfWeek <= 4) return chalet.basePrice * 0.85; 
    return chalet.basePrice;
  }
};

// --- SERVIÇO DE RESERVAS ---
export const ReservationService = {
  getAll: async (): Promise<Reservation[]> => {
    if (!supabase) return [];
    const { data, error } = await supabase.from('reservations').select('*').order('start_date', { ascending: true });
    if (error || !data) return [];
    return data.map(mapReservationFromDB);
  },

  add: async (reservation: Omit<Reservation, 'id' | 'createdAt'>) => {
    if (!supabase) throw new Error("Banco de dados não conectado. Verifique as chaves do Supabase.");
    const allReservations = await ReservationService.getAll();
    const allPrices = await PricingService.getAll();
    const allChalets = await ChaletService.getAll();

    const available = ReservationService.checkCollisionLocal(
      allReservations, allPrices, allChalets, reservation.chaletId, reservation.startDate, reservation.endDate
    );

    if (!available) throw new Error(`Conflito de datas.`);
    
    const dbData = mapReservationToDB(reservation);
    const { error } = await supabase.from('reservations').insert(dbData);
    if (error) throw new Error("Erro ao salvar reserva: " + error.message);
  },

  update: async (updatedReservation: Reservation) => {
    if (!supabase) throw new Error("Banco de dados não conectado.");
    const dbData = mapReservationToDB(updatedReservation);
    const { error } = await supabase
      .from('reservations')
      .update(dbData)
      .eq('id', updatedReservation.id);

    // CRUCIAL: Lança o erro para a UI saber que falhou
    if (error) throw new Error("Erro ao atualizar no banco: " + error.message);
  },

  remove: async (id: string) => {
    if (!supabase) throw new Error("Banco de dados não conectado.");
    // CRUCIAL: Verifica se houve erro na exclusão (ex: RLS policies)
    const { error } = await supabase.from('reservations').delete().eq('id', id);
    if (error) throw new Error("Erro ao excluir do banco: " + error.message);
  },

  checkCollisionLocal: (
    allReservations: Reservation[],
    allPrices: CustomPrice[],
    allChalets: Chalet[],
    chaletId: string, 
    startDateStr: string, 
    endDateStr: string, 
    excludeReservationId?: string
  ): boolean => {
    const checkIn = parseLocalDay(startDateStr);
    const checkOut = parseLocalDay(endDateStr);
    const hasCollision = allReservations.some(r => {
      if (r.chaletId !== chaletId) return false;
      if (excludeReservationId && r.id === excludeReservationId) return false;
      const rStart = parseLocalDay(r.startDate);
      const rEnd = parseLocalDay(r.endDate);
      return checkOut > rStart && checkIn < rEnd;
    });
    if (hasCollision) return false;
    let curr = new Date(checkIn);
    while (curr < checkOut) {
      const dateStr = curr.toISOString().split('T')[0];
      const price = PricingService.calculateDayPrice(allPrices, allChalets, chaletId, dateStr);
      if (price === 0) return false;
      curr.setDate(curr.getDate() + 1);
    }
    return true;
  },

  seedInitialData: async () => {
    if (!supabase) return { count: 0, errors: 0 };
    await supabase.from('reservations').delete().neq('id', '00000000-0000-0000-0000-000000000000'); 
    await supabase.from('custom_prices').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    return { count: 0, errors: 0 };
  },

  // Importação em massa (sem verificação de colisão — dados históricos)
  bulkInsert: async (
    reservations: Omit<Reservation, 'id' | 'createdAt'>[],
    onProgress?: (done: number, total: number) => void
  ): Promise<{ success: number; errors: string[] }> => {
    if (!supabase) throw new Error("Banco de dados não conectado.");
    
    const BATCH_SIZE = 50;
    let success = 0;
    const errors: string[] = [];
    const now = Date.now();

    for (let i = 0; i < reservations.length; i += BATCH_SIZE) {
      const batch = reservations.slice(i, i + BATCH_SIZE).map((r, idx) =>
        mapReservationToDB({ ...r, createdAt: now + i + idx })
      );
      const { error } = await supabase.from('reservations').insert(batch);
      if (error) {
        errors.push(`Lote ${Math.floor(i / BATCH_SIZE) + 1}: ${error.message}`);
      } else {
        success += batch.length;
      }
      onProgress?.(Math.min(i + BATCH_SIZE, reservations.length), reservations.length);
    }

    return { success, errors };
  }
};
