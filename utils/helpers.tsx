import React from 'react';
import { Waves, Flame, Wind, Mountain, Wifi, Check } from 'lucide-react';

/**
 * Formata um valor numérico como moeda BRL (R$).
 */
export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

/**
 * Retorna o ícone Lucide correspondente a uma comodidade (amenity) do chalé.
 */
export const getAmenityIcon = (text: string, size: number = 16): React.ReactElement => {
  const lower = text.toLowerCase();
  if (lower.includes('piscina')) return <Waves size={size} />;
  if (lower.includes('hidro')) return <Waves size={size} />;
  if (lower.includes('fogo')) return <Flame size={size} />;
  if (lower.includes('ar condicionado')) return <Wind size={size} />;
  if (lower.includes('serra') || lower.includes('vista')) return <Mountain size={size} />;
  if (lower.includes('wi-fi')) return <Wifi size={size} />;
  return <Check size={size} />;
};
