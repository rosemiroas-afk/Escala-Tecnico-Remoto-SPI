import { Technician } from '../types';

export const INITIAL_TECHNICIANS: Technician[] = [
  // DDD 13 - Baixada Santista / Litoral
  {
    id: 'tech-13-1',
    name: 'AYRTON CESAR DOS SANTOS PEREIRA',
    ddd: 13,
    active: true,
    phone: '(13) 99123-4567'
  },
  {
    id: 'tech-13-2',
    name: 'CARLOS SERGIO DE OLIVEIRA',
    ddd: 13,
    active: true,
    phone: '(13) 99234-5678'
  },
  {
    id: 'tech-13-3',
    name: 'EWANDER DA SILVA CARVALHO',
    ddd: 13,
    active: true,
    phone: '(13) 99345-6789'
  },
  {
    id: 'tech-13-4',
    name: 'EWANDRO DE MOURA FE',
    ddd: 13,
    active: true,
    phone: '(13) 99456-7890'
  },
  {
    id: 'tech-13-5',
    name: 'EVANDRO MOURA FE',
    ddd: 13,
    active: true,
    phone: '(13) 99456-7891'
  },
  {
    id: 'tech-13-6',
    name: 'HENRIQUE SODRE DE ALMEIDA',
    ddd: 13,
    active: true,
    phone: '(13) 99567-8901'
  },
  {
    id: 'tech-13-7',
    name: 'MARCIO INACIO DE SOUZA',
    ddd: 13,
    active: true,
    phone: '(13) 99678-9012'
  },
  {
    id: 'tech-13-8',
    name: 'ROGERIO SOUZA DE SANTOS',
    ddd: 13,
    active: true,
    phone: '(13) 99789-0123'
  },

  // DDD 14 - Centro-Oeste Paulista (Bauru / Marília)
  {
    id: 'tech-14-1',
    name: 'ADILSON JOSE DA SILVA',
    ddd: 14,
    active: true,
    phone: '(14) 99111-2233'
  },
  {
    id: 'tech-14-2',
    name: 'GERSAM BERNARDO DE OLIVEIRA',
    ddd: 14,
    active: true,
    phone: '(14) 99222-3344'
  },
  {
    id: 'tech-14-3',
    name: 'PAULO SERGIO CARRARA',
    ddd: 14,
    active: true,
    phone: '(14) 99333-4455'
  },

  // DDD 15 - Região de Sorocaba / Itapetininga
  {
    id: 'tech-15-1',
    name: 'GUSTAVO HENRIQUE MENDES DE ALMEIDA',
    ddd: 15,
    active: true,
    phone: '(15) 99444-5566'
  },
  {
    id: 'tech-15-2',
    name: 'LUCAS PAIS DE CAMARGO',
    ddd: 15,
    active: true,
    phone: '(15) 99555-6677'
  },
  {
    id: 'tech-15-3',
    name: 'ODIRLEI SILVEIRA DE CAMPOS',
    ddd: 15,
    active: true,
    phone: '(15) 99666-7788'
  },

  // DDD 19 - Região de Campinas / Piracicaba / Americana
  {
    id: 'tech-19-1',
    name: 'ANDRE LUIZ DE ARAUJO',
    ddd: 19,
    active: true,
    phone: '(19) 99777-8899'
  },
  {
    id: 'tech-19-2',
    name: 'EDUARDO CAMPINEIRO NETO',
    ddd: 19,
    active: true,
    phone: '(19) 99888-9900'
  },
  {
    id: 'tech-19-3',
    name: 'GUSTAVO DONIZETI CARETTE',
    ddd: 19,
    active: true,
    phone: '(19) 99112-2334'
  },
  {
    id: 'tech-19-4',
    name: 'JOSNEI MACHADO DE SOUZA',
    ddd: 19,
    active: true,
    phone: '(19) 99223-3445'
  },
  {
    id: 'tech-19-5',
    name: 'LEONARDO TEIXEIRA DO NASCIMENTO',
    ddd: 19,
    active: true,
    phone: '(19) 99334-4556'
  },
  {
    id: 'tech-19-6',
    name: 'RODRIGO FERREIRA ALBUQUERQUE',
    ddd: 19,
    active: true,
    phone: '(19) 99445-5667'
  }
];

export const DDD_INFO: Record<number, { name: string; region: string; minStaff: number; color: string; badge: string }> = {
  13: {
    name: 'DDD 13',
    region: 'Baixada Santista e Litoral Sul',
    minStaff: 6, // 8 technicians total -> at least 6 working on any given day
    color: '#0284c7',
    badge: 'bg-sky-100 text-sky-800 border-sky-300'
  },
  14: {
    name: 'DDD 14',
    region: 'Bauru, Marília, Jaú e Região',
    minStaff: 2, // 3 technicians total -> at least 2 working
    color: '#16a34a',
    badge: 'bg-emerald-100 text-emerald-800 border-emerald-300'
  },
  15: {
    name: 'DDD 15',
    region: 'Sorocaba, Itapetininga e Vale do Paranapanema',
    minStaff: 2, // 3 technicians total -> at least 2 working
    color: '#9333ea',
    badge: 'bg-purple-100 text-purple-800 border-purple-300'
  },
  19: {
    name: 'DDD 19',
    region: 'Campinas, Piracicaba, Americana e Limeira',
    minStaff: 4, // 6 technicians total -> at least 4 working
    color: '#ea580c',
    badge: 'bg-orange-100 text-orange-800 border-orange-300'
  }
};
