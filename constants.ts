
import { Chalet } from './types';

// --- CONFIGURAÇÕES DO SUPABASE (via variáveis de ambiente) ---
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// --- CONFIGURAÇÕES GERAIS ---
export const WHATSAPP_NUMBER = '5585999999999'; 

// --- DADOS INICIAIS (FALLBACK) ---
export const CHALETS: Chalet[] = [
  {
    id: '1',
    slug: 'floresta', 
    name: 'Chalé da Floresta',
    description: 'Até 2 adultos e 1 criança. Suíte com cama queen, ar-condicionado, cozinha completa, banheira com hidromassagem, aquecedor, deck com mirante, fogo de chão e vista para a serra.',
    capacity: 'Até 2 adultos e 1 criança',
    basePrice: 550, 
    amenities: [
      'Cama Queen',
      'Banheira com Hidromassagem', 
      'Aquecedor', 
      'Fogo de Chão', 
      'Deck com Mirante',
      'Cozinha Completa',
      'Ar-condicionado'
    ],
    coverImage: 'https://alwqlbyjpagcdgbtnyxs.supabase.co/storage/v1/object/public/Chale%20da%20Floresta/floresta03.jpg',
    images: [
      'https://alwqlbyjpagcdgbtnyxs.supabase.co/storage/v1/object/public/Chale%20da%20Floresta/floresta01.jpg',
      'https://alwqlbyjpagcdgbtnyxs.supabase.co/storage/v1/object/public/Chale%20da%20Floresta/floresta02.jpg',
      'https://alwqlbyjpagcdgbtnyxs.supabase.co/storage/v1/object/public/Chale%20da%20Floresta/floresta03.jpg',
      'https://alwqlbyjpagcdgbtnyxs.supabase.co/storage/v1/object/public/Chale%20da%20Floresta/floresta04.jpg',
      'https://alwqlbyjpagcdgbtnyxs.supabase.co/storage/v1/object/public/Chale%20da%20Floresta/floresta05.jpg'
    ],
  },
  {
    id: '2',
    slug: 'horizonte',
    name: 'Chalé do Horizonte',
    description: 'Até 2 adultos e 1 criança. Suíte com cama queen, ar-condicionado, cozinha completa, piscina privativa, deck com mirante, churrasqueira e vista para a serra.',
    capacity: 'Até 2 adultos e 1 criança',
    basePrice: 550, 
    amenities: [
      'Piscina Privativa', 
      'Cama Queen',
      'Deck com Mirante', 
      'Churrasqueira', 
      'Cozinha Completa', 
      'Ar-condicionado',
      'Vista para a Serra'
    ],
    coverImage: 'https://alwqlbyjpagcdgbtnyxs.supabase.co/storage/v1/object/public/Chale%20do%20Horizonte/WhatsApp%20Image%202025-07-12%20at%2012.00.32.jpeg',
    images: [
      'https://alwqlbyjpagcdgbtnyxs.supabase.co/storage/v1/object/public/Chale%20do%20Horizonte/WhatsApp%20Image%202025-07-12%20at%2012.00.32.jpeg',
      'https://alwqlbyjpagcdgbtnyxs.supabase.co/storage/v1/object/public/Chale%20do%20Horizonte/WhatsApp%20Image%202025-07-12%20at%2012.00.33.jpeg',
      'https://alwqlbyjpagcdgbtnyxs.supabase.co/storage/v1/object/public/Chale%20do%20Horizonte/WhatsApp%20Image%202025-07-12%20at%2012.00.35%20(1).jpeg',
      'https://alwqlbyjpagcdgbtnyxs.supabase.co/storage/v1/object/public/Chale%20do%20Horizonte/WhatsApp%20Image%202025-07-12%20at%2012.00.35%20(2).jpeg'
    ],
  },
  {
    id: '3',
    slug: 'mirante',
    name: 'Chalé do Mirante',
    description: 'Até 2 adultos e 1 criança. Suíte com cama queen, ar-condicionado, cozinha completa, banheira com hidromassagem, churrasqueira e deck com vista para a serra.',
    capacity: 'Até 2 adultos e 1 criança',
    basePrice: 500, 
    amenities: [
      'Banheira com Hidromassagem', 
      'Cama Queen', 
      'Churrasqueira',
      'Deck com Vista',
      'Cozinha Completa',
      'Ar-condicionado'
    ],
    coverImage: 'https://alwqlbyjpagcdgbtnyxs.supabase.co/storage/v1/object/public/Chale%20do%20Mirante/WhatsApp%20Image%202025-07-11%20at%2014.28.07%20(1).jpeg',
    images: [
      'https://alwqlbyjpagcdgbtnyxs.supabase.co/storage/v1/object/public/Chale%20do%20Mirante/WhatsApp%20Image%202025-07-11%20at%2014.28.05.jpeg',
      'https://alwqlbyjpagcdgbtnyxs.supabase.co/storage/v1/object/public/Chale%20do%20Mirante/WhatsApp%20Image%202025-07-11%20at%2014.28.06%20(2).jpeg',
      'https://alwqlbyjpagcdgbtnyxs.supabase.co/storage/v1/object/public/Chale%20do%20Mirante/WhatsApp%20Image%202025-07-11%20at%2014.28.06%20(3).jpeg',
      'https://alwqlbyjpagcdgbtnyxs.supabase.co/storage/v1/object/public/Chale%20do%20Mirante/WhatsApp%20Image%202025-07-11%20at%2014.28.06%20(4).jpeg',
      'https://alwqlbyjpagcdgbtnyxs.supabase.co/storage/v1/object/public/Chale%20do%20Mirante/WhatsApp%20Image%202025-07-11%20at%2014.28.06.jpeg',
      'https://alwqlbyjpagcdgbtnyxs.supabase.co/storage/v1/object/public/Chale%20do%20Mirante/WhatsApp%20Image%202025-07-11%20at%2014.28.07%20(1).jpeg',
      'https://alwqlbyjpagcdgbtnyxs.supabase.co/storage/v1/object/public/Chale%20do%20Mirante/WhatsApp%20Image%202025-07-11%20at%2014.28.07%20(2).jpeg',
      'https://alwqlbyjpagcdgbtnyxs.supabase.co/storage/v1/object/public/Chale%20do%20Mirante/WhatsApp%20Image%202025-07-11%20at%2014.28.07.jpeg'
    ],
  },
  {
    id: '4',
    slug: 'montanha',
    name: 'Chalé da Montanha',
    description: 'Até 2 adultos e 1 criança. Suíte com cama queen, ar-condicionado, cozinha completa, piscina privativa, deck com mirante, churrasqueira e vista para a serra.',
    capacity: 'Até 2 adultos e 1 criança',
    basePrice: 550, 
    amenities: [
      'Piscina Privativa', 
      'Cama Queen', 
      'Deck com Mirante', 
      'Churrasqueira',
      'Cozinha Completa',
      'Ar-condicionado',
      'Vista para a Serra'
    ],
    coverImage: 'https://alwqlbyjpagcdgbtnyxs.supabase.co/storage/v1/object/public/Chale%20da%20Montanha/WhatsApp%20Image%202025-07-11%20at%2014.27.47%20(1).jpeg',
    images: [
      'https://alwqlbyjpagcdgbtnyxs.supabase.co/storage/v1/object/public/Chale%20da%20Montanha/WhatsApp%20Image%202025-07-11%20at%2014.27.47%20(1).jpeg',
      'https://alwqlbyjpagcdgbtnyxs.supabase.co/storage/v1/object/public/Chale%20da%20Montanha/WhatsApp%20Image%202025-07-11%20at%2014.27.47%20(3).jpeg',
      'https://alwqlbyjpagcdgbtnyxs.supabase.co/storage/v1/object/public/Chale%20da%20Montanha/WhatsApp%20Image%202025-07-11%20at%2014.27.47%20(4).jpeg',
      'https://alwqlbyjpagcdgbtnyxs.supabase.co/storage/v1/object/public/Chale%20da%20Montanha/WhatsApp%20Image%202025-07-11%20at%2014.27.47%20(5).jpeg',
      'https://alwqlbyjpagcdgbtnyxs.supabase.co/storage/v1/object/public/Chale%20da%20Montanha/WhatsApp%20Image%202025-07-11%20at%2014.27.47%20(2).jpeg',
      'https://alwqlbyjpagcdgbtnyxs.supabase.co/storage/v1/object/public/Chale%20da%20Montanha/WhatsApp%20Image%202025-07-11%20at%2014.27.48%20(1).jpeg',
      'https://alwqlbyjpagcdgbtnyxs.supabase.co/storage/v1/object/public/Chale%20da%20Montanha/WhatsApp%20Image%202025-07-11%20at%2014.27.48%20(4).jpeg',
      'https://alwqlbyjpagcdgbtnyxs.supabase.co/storage/v1/object/public/Chale%20da%20Montanha/WhatsApp%20Image%202025-07-11%20at%2014.27.48.jpeg'
    ],
  },
  {
    id: '5',
    slug: 'por-do-sol',
    name: 'Chalé Pôr do Sol',
    description: 'Até 2 adultos e 1 criança. Suíte com cama de casal, ar-condicionado, cozinha completa, piscina privativa, deck com mirante, churrasqueira e vista para a serra.',
    capacity: 'Até 2 adultos e 1 criança',
    basePrice: 450, 
    amenities: [
      'Estilo Suíço',
      'Piscina Privativa', 
      'Cama de Casal', 
      'Deck com Mirante',
      'Churrasqueira',
      'Cozinha Completa',
      'Ar-condicionado'
    ],
    coverImage: 'https://alwqlbyjpagcdgbtnyxs.supabase.co/storage/v1/object/public/Chale%20Por%20do%20Sol/WhatsApp%20Image%202025-07-13%20at%2013.43.28%20(2).jpeg',
    images: [
      'https://alwqlbyjpagcdgbtnyxs.supabase.co/storage/v1/object/public/Chale%20Por%20do%20Sol/WhatsApp%20Image%202025-07-13%20at%2013.43.28%20(2).jpeg',
      'https://alwqlbyjpagcdgbtnyxs.supabase.co/storage/v1/object/public/Chale%20Por%20do%20Sol/WhatsApp%20Image%202025-07-13%20at%2013.43.27%20(1).jpeg',
      'https://alwqlbyjpagcdgbtnyxs.supabase.co/storage/v1/object/public/Chale%20Por%20do%20Sol/WhatsApp%20Image%202025-07-13%20at%2013.43.27%20(2).jpeg',
      'https://alwqlbyjpagcdgbtnyxs.supabase.co/storage/v1/object/public/Chale%20Por%20do%20Sol/WhatsApp%20Image%202025-07-13%20at%2013.43.27%20(3).jpeg',
      'https://alwqlbyjpagcdgbtnyxs.supabase.co/storage/v1/object/public/Chale%20Por%20do%20Sol/WhatsApp%20Image%202025-07-13%20at%2013.43.27%20(4).jpeg',
      'https://alwqlbyjpagcdgbtnyxs.supabase.co/storage/v1/object/public/Chale%20Por%20do%20Sol/WhatsApp%20Image%202025-07-13%20at%2013.43.27.jpeg',
      'https://alwqlbyjpagcdgbtnyxs.supabase.co/storage/v1/object/public/Chale%20Por%20do%20Sol/WhatsApp%20Image%202025-07-13%20at%2013.43.28%20(1).jpeg',
      'https://alwqlbyjpagcdgbtnyxs.supabase.co/storage/v1/object/public/Chale%20Por%20do%20Sol/WhatsApp%20Image%202025-07-13%20at%2013.43.28%20(3).jpeg',
      'https://alwqlbyjpagcdgbtnyxs.supabase.co/storage/v1/object/public/Chale%20Por%20do%20Sol/WhatsApp%20Image%202025-07-13%20at%2013.43.28.jpeg'
    ],
  },
];
