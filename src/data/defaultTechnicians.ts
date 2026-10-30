import { Technician } from '../types';
import { OFFICIAL_TECHNICIANS } from './officialScheduleNovDez';

export const INITIAL_TECHNICIANS: Technician[] = OFFICIAL_TECHNICIANS;


export const DDD_INFO: Record<number, { name: string; region: string; minStaff: number; color: string; badge: string }> = {
  13: {
    name: 'DDD 13',
    region: 'Baixada Santista e Litoral Sul',
    minStaff: 6,
    color: '#0284c7',
    badge: 'bg-sky-100 text-sky-800 border-sky-300'
  },
  14: {
    name: 'DDD 14',
    region: 'Bauru, Marília, Jaú e Região',
    minStaff: 2,
    color: '#16a34a',
    badge: 'bg-emerald-100 text-emerald-800 border-emerald-300'
  },
  15: {
    name: 'DDD 15',
    region: 'Sorocaba, Itapetininga e Região',
    minStaff: 2,
    color: '#9333ea',
    badge: 'bg-purple-100 text-purple-800 border-purple-300'
  },
  19: {
    name: 'DDD 19',
    region: 'Campinas, Piracicaba, Americana e Limeira',
    minStaff: 4,
    color: '#ea580c',
    badge: 'bg-orange-100 text-orange-800 border-orange-300'
  }
};
