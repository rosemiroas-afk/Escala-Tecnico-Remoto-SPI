import { Technician, ShiftType } from '../types';

export const OFFICIAL_TECHNICIANS: Technician[] = [
  {
    "id": "tech-14-1",
    "name": "ADILSON JOSE DA SILVA",
    "ddd": 14,
    "active": true,
    "shiftHours": "08:00 AS 16:20",
    "phone": "(14) 99111-2233"
  },
  {
    "id": "tech-19-2",
    "name": "ANDRE LUIZ DE ARAUJO",
    "ddd": 19,
    "active": true,
    "shiftHours": "13:00 AS 21:20",
    "phone": "(19) 99777-8899"
  },
  {
    "id": "tech-13-3",
    "name": "AYRTON CESAR DOS SANTOS PEREIRA",
    "ddd": 13,
    "active": true,
    "shiftHours": "13:00 AS 21:20",
    "phone": "(13) 99123-4567"
  },
  {
    "id": "tech-13-4",
    "name": "CARLOS SERGIO DE OLIVEIRA",
    "ddd": 13,
    "active": true,
    "shiftHours": "08:00 AS 16:25",
    "phone": "(13) 99234-5678"
  },
  {
    "id": "tech-19-5",
    "name": "EDUARDO CAMPINEIRO",
    "ddd": 19,
    "active": true,
    "shiftHours": "08:00 AS 16:20",
    "phone": "(19) 99888-9900"
  },
  {
    "id": "tech-13-6",
    "name": "EWANDER DA SILVA CARVALHO",
    "ddd": 13,
    "active": true,
    "shiftHours": "08:00 AS 16:25",
    "phone": "(13) 99345-6789"
  },
  {
    "id": "tech-13-7",
    "name": "EWANDRO MOURA FE",
    "ddd": 13,
    "active": true,
    "shiftHours": "13:00 AS 21:20",
    "phone": "(13) 99456-7890"
  },
  {
    "id": "tech-14-8",
    "name": "GERSAM BERNARDO DE OLIVEIRA",
    "ddd": 14,
    "active": true,
    "shiftHours": "08:00 AS 16:00",
    "phone": "(14) 99222-3344"
  },
  {
    "id": "tech-19-9",
    "name": "GUSTAVO DONIZETI CARETTE",
    "ddd": 19,
    "active": true,
    "shiftHours": "08:00 AS 16:00",
    "phone": "(19) 99112-2334"
  },
  {
    "id": "tech-19-10",
    "name": "GUSTAVO HENRIQUE MENDES DE ALMEIDA",
    "ddd": 19,
    "active": true,
    "shiftHours": "08:00 AS 16:00",
    "phone": "(19) 99444-5566"
  },
  {
    "id": "tech-13-11",
    "name": "HENRIQUE SODRE DE ALMEIDA",
    "ddd": 13,
    "active": true,
    "shiftHours": "08:00 AS 16:23",
    "phone": "(13) 99567-8901"
  },
  {
    "id": "tech-19-12",
    "name": "JOSNEI MACHADO DE SOUZA",
    "ddd": 19,
    "active": true,
    "shiftHours": "08:00 AS 16:00",
    "phone": "(19) 99223-3445"
  },
  {
    "id": "tech-19-13",
    "name": "LEONARDO TEIXEIRA DO NASCIMENTO",
    "ddd": 19,
    "active": true,
    "shiftHours": "08:00 AS 16:00",
    "phone": "(19) 99334-4556"
  },
  {
    "id": "tech-15-14",
    "name": "LUCAS PAIS DE CAMARGO",
    "ddd": 15,
    "active": true,
    "shiftHours": "08:00 AS 16:20",
    "phone": "(15) 99555-6677"
  },
  {
    "id": "tech-13-15",
    "name": "MARCIO INACIO DE SOUZA",
    "ddd": 13,
    "active": true,
    "shiftHours": "08:00 AS 16:00",
    "phone": "(13) 99678-9012"
  },
  {
    "id": "tech-15-16",
    "name": "ODIRLEI SILVEIRA DE CAMPOS",
    "ddd": 15,
    "active": true,
    "shiftHours": "08:00 AS 16:26",
    "phone": "(15) 99666-7788"
  },
  {
    "id": "tech-14-17",
    "name": "PAULO SERGIO CARRARA",
    "ddd": 14,
    "active": true,
    "shiftHours": "08:00 AS 16:20",
    "phone": "(14) 99333-4455"
  },
  {
    "id": "tech-19-18",
    "name": "RODRIGO FERREIRA ALBUQUERQUE",
    "ddd": 19,
    "active": true,
    "shiftHours": "08:00 AS 16:20",
    "phone": "(19) 99445-5667"
  },
  {
    "id": "tech-13-19",
    "name": "ROGERIO SOUZA DE SANTOS",
    "ddd": 13,
    "active": true,
    "shiftHours": "08:00 AS 16:22",
    "phone": "(13) 99789-0123"
  }
];

function buildShifts(values: Record<string, ShiftType>): Record<string, ShiftType> {
  const result: Record<string, ShiftType> = {};
  
  // October 31
  result['2026-10-31'] = values['2026-10-31'] || 'TB';

  // November (30 days)
  for (let d = 1; d <= 30; d++) {
    const dayStr = d < 10 ? `0${d}` : `${d}`;
    const dateStr = `2026-11-${dayStr}`;
    result[dateStr] = values[dateStr] || 'TB';
  }
  
  // December (31 days)
  for (let d = 1; d <= 31; d++) {
    const dayStr = d < 10 ? `0${d}` : `${d}`;
    const dateStr = `2026-12-${dayStr}`;
    result[dateStr] = values[dateStr] || 'TB';
  }
  
  return result;
}

export const OFFICIAL_SHIFTS_BY_TECH_NAME: Record<string, Record<string, ShiftType>> = {
  'ADILSON JOSE DA SILVA': buildShifts({
      "2026-11-01": "FG",
      "2026-11-07": "FG",
      "2026-11-15": "FD",
      "2026-11-16": "FD",
      "2026-11-21": "FN",
      "2026-11-23": "FG",
      "2026-11-29": "FG",
      "2026-12-06": "FG",
      "2026-12-08": "FR",
      "2026-12-09": "FR",
      "2026-12-10": "FR",
      "2026-12-11": "FR",
      "2026-12-12": "FR",
      "2026-12-13": "FR",
      "2026-12-14": "FR",
      "2026-12-15": "FR",
      "2026-12-16": "FR",
      "2026-12-17": "FR",
      "2026-12-18": "FR",
      "2026-12-19": "FR",
      "2026-12-20": "FR",
      "2026-12-21": "FR",
      "2026-12-22": "FR",
      "2026-12-27": "FG"
  }),

  'ANDRE LUIZ DE ARAUJO': buildShifts({
      "2026-10-31": "FG",
      "2026-11-02": "FN",
      "2026-11-08": "FG",
      "2026-11-16": "FG",
      "2026-11-23": "FG",
      "2026-11-29": "FG",
      "2026-12-06": "FD",
      "2026-12-07": "FD",
      "2026-12-14": "FG",
      "2026-12-20": "FG",
      "2026-12-27": "FG"
  }),

  'AYRTON CESAR DOS SANTOS PEREIRA': buildShifts({
      "2026-10-31": "FD",
      "2026-11-01": "FD",
      "2026-11-08": "FG",
      "2026-11-15": "FG",
      "2026-11-21": "FN",
      "2026-11-23": "FG",
      "2026-11-29": "FG",
      "2026-12-14": "FG",
      "2026-12-15": "FN",
      "2026-12-21": "FG",
      "2026-12-28": "FG"
  }),

  'CARLOS SERGIO DE OLIVETRA': buildShifts({
      "2026-11-01": "FG",
      "2026-11-08": "FG",
      "2026-11-15": "FG",
      "2026-11-21": "FN",
      "2026-11-23": "FG",
      "2026-11-29": "FG",
      "2026-12-07": "FG",
      "2026-12-14": "FG",
      "2026-12-21": "FG",
      "2026-12-28": "FG"
  }),

  'EDUARDO CAMPINEIRO': buildShifts({
      "2026-11-01": "FG",
      "2026-11-02": "FN",
      "2026-11-08": "FG",
      "2026-11-15": "FG",
      "2026-11-23": "FD",
      "2026-11-24": "FD",
      "2026-11-29": "FG",
      "2026-12-07": "FG",
      "2026-12-14": "FG",
      "2026-12-21": "FG",
      "2026-12-28": "FG"
  }),

  'EWANDER DA SILVA CARVALHO': buildShifts({
      "2026-11-01": "FG",
      "2026-11-07": "FG",
      "2026-11-09": "FB",
      "2026-11-16": "FD",
      "2026-11-17": "FD",
      "2026-11-21": "FN",
      "2026-11-23": "FG",
      "2026-11-29": "FG",
      "2026-12-07": "FG",
      "2026-12-14": "FG",
      "2026-12-15": "FN",
      "2026-12-21": "FG",
      "2026-12-28": "FG"
  }),

  'EWANDRO MOURA FE': buildShifts({
      "2026-10-31": "FG",
      "2026-11-02": "FN",
      "2026-11-08": "FG",
      "2026-11-15": "FG",
      "2026-11-21": "FG",
      "2026-11-29": "FG",
      "2026-12-06": "FD",
      "2026-12-07": "FD",
      "2026-12-14": "FG",
      "2026-12-21": "FG",
      "2026-12-28": "FG"
  }),

  'GERSAM BERNARDO DE OLIVEIRA': buildShifts({
      "2026-10-31": "FG",
      "2026-11-02": "FN",
      "2026-11-08": "FG",
      "2026-11-15": "FG",
      "2026-11-22": "FG",
      "2026-11-29": "FD",
      "2026-11-30": "FD",
      "2026-12-07": "FG",
      "2026-12-14": "FG",
      "2026-12-20": "FG",
      "2026-12-27": "FG"
  }),

  'GUSTAVO DONIZETI CARETTE': buildShifts({
      "2026-10-31": "FG",
      "2026-11-02": "FN",
      "2026-11-08": "FG",
      "2026-11-15": "FG",
      "2026-11-22": "FG",
      "2026-11-29": "FG",
      "2026-12-07": "FG",
      "2026-12-14": "FD",
      "2026-12-15": "FD",
      "2026-12-20": "FG",
      "2026-12-27": "FG"
  }),

  'GUSTAVO HENRIQUE MENDES DE ALMEIDA': buildShifts({
      "2026-11-01": "FG",
      "2026-11-02": "FN",
      "2026-11-08": "FG",
      "2026-11-15": "FG",
      "2026-11-22": "FG",
      "2026-11-24": "FB",
      "2026-11-29": "FG",
      "2026-12-07": "FG",
      "2026-12-14": "FD",
      "2026-12-15": "FD",
      "2026-12-20": "FG",
      "2026-12-27": "FG"
  }),

  'HENRIQUE SODRE DE ALMEIDA': buildShifts({
      "2026-11-01": "FG",
      "2026-11-08": "FG",
      "2026-11-15": "FG",
      "2026-11-21": "FN",
      "2026-11-22": "FD",
      "2026-11-23": "FD",
      "2026-11-29": "FG",
      "2026-12-07": "FG",
      "2026-12-14": "FG",
      "2026-12-15": "FN",
      "2026-12-21": "FG",
      "2026-12-28": "FG"
  }),

  'JOSNEI MACHADO DE SOUZA': buildShifts({
      "2026-10-31": "FG",
      "2026-11-07": "FG",
      "2026-11-10": "FR",
      "2026-11-11": "FR",
      "2026-11-12": "FR",
      "2026-11-13": "FR",
      "2026-11-14": "FR",
      "2026-11-15": "FR",
      "2026-11-16": "FR",
      "2026-11-17": "FR",
      "2026-11-18": "FR",
      "2026-11-19": "FR",
      "2026-11-20": "FR",
      "2026-11-21": "FR",
      "2026-11-22": "FR",
      "2026-11-23": "FR",
      "2026-11-24": "FR",
      "2026-11-25": "FR",
      "2026-11-26": "FR",
      "2026-11-27": "FR",
      "2026-11-28": "FR",
      "2026-11-29": "FR",
      "2026-11-30": "FR",
      "2026-12-01": "FR",
      "2026-12-02": "FR",
      "2026-12-03": "FR",
      "2026-12-04": "FR",
      "2026-12-05": "FR",
      "2026-12-06": "FR",
      "2026-12-07": "FR",
      "2026-12-08": "FR",
      "2026-12-09": "FR",
      "2026-12-14": "FG",
      "2026-12-20": "FG",
      "2026-12-27": "FG"
  }),

  'LEONARDO TEIXEIRA DO NASCIMENTO': buildShifts({
      "2026-10-31": "FG",
      "2026-11-02": "FN",
      "2026-11-08": "FG",
      "2026-11-15": "FG",
      "2026-11-23": "FD",
      "2026-11-24": "FD",
      "2026-11-29": "FG",
      "2026-12-01": "FR",
      "2026-12-02": "FR",
      "2026-12-03": "FR",
      "2026-12-04": "FR",
      "2026-12-05": "FR",
      "2026-12-06": "FR",
      "2026-12-07": "FR",
      "2026-12-08": "FR",
      "2026-12-09": "FR",
      "2026-12-10": "FR",
      "2026-12-11": "FR",
      "2026-12-12": "FR",
      "2026-12-13": "FR",
      "2026-12-14": "FR",
      "2026-12-15": "FR",
      "2026-12-16": "FR",
      "2026-12-17": "FR",
      "2026-12-18": "FR",
      "2026-12-19": "FR",
      "2026-12-20": "FR",
      "2026-12-27": "FG"
  }),

  'LUCAS PAIS DE CAMARGO': buildShifts({
      "2026-10-31": "FR",
      "2026-11-01": "FR",
      "2026-11-02": "FR",
      "2026-11-03": "FR",
      "2026-11-04": "FR",
      "2026-11-05": "FR",
      "2026-11-06": "FR",
      "2026-11-07": "FR",
      "2026-11-08": "FR",
      "2026-11-09": "FR",
      "2026-11-10": "FR",
      "2026-11-11": "FR",
      "2026-11-12": "FR",
      "2026-11-13": "FR",
      "2026-11-14": "FR",
      "2026-11-15": "FR",
      "2026-11-16": "FR",
      "2026-11-17": "FR",
      "2026-11-18": "FR",
      "2026-11-19": "FR",
      "2026-11-20": "FR",
      "2026-11-21": "FR",
      "2026-11-22": "FR",
      "2026-11-23": "FR",
      "2026-11-24": "FR",
      "2026-11-25": "FR",
      "2026-11-26": "FR",
      "2026-11-27": "FR",
      "2026-11-28": "FR",
      "2026-11-29": "FR",
      "2026-12-07": "FG",
      "2026-12-14": "FG",
      "2026-12-15": "FN",
      "2026-12-21": "FG",
      "2026-12-28": "FG"
  }),

  'MARCIO INACIO DE SOUZA': buildShifts({
      "2026-11-01": "FG",
      "2026-11-02": "FN",
      "2026-11-08": "FG",
      "2026-11-16": "FD",
      "2026-11-17": "FD",
      "2026-11-23": "FG",
      "2026-11-29": "FG",
      "2026-12-07": "FG",
      "2026-12-14": "FG",
      "2026-12-20": "FG",
      "2026-12-27": "FG"
  }),

  'ODIRLEI SILVEIRA DE CAMPOS': buildShifts({
      "2026-11-01": "FG",
      "2026-11-02": "FN",
      "2026-11-08": "FG",
      "2026-11-15": "FG",
      "2026-11-23": "FG",
      "2026-11-29": "FD",
      "2026-11-30": "FD",
      "2026-12-07": "FG",
      "2026-12-14": "FG",
      "2026-12-20": "FG",
      "2026-12-27": "FG"
  }),

  'PAULO SERGIO CARRARA': buildShifts({
      "2026-11-01": "FG",
      "2026-11-08": "FD",
      "2026-11-09": "FD",
      "2026-11-16": "FG",
      "2026-11-21": "FN",
      "2026-11-23": "FG",
      "2026-11-29": "FG",
      "2026-12-14": "FG",
      "2026-12-15": "FN",
      "2026-12-21": "FG",
      "2026-12-28": "FG"
  }),

  'RODRIGO FERREIRA ALBUQUERQUE': buildShifts({
      "2026-10-31": "FG",
      "2026-11-02": "FN",
      "2026-11-08": "FD",
      "2026-11-09": "FD",
      "2026-11-15": "FG",
      "2026-11-21": "FN",
      "2026-11-23": "FG",
      "2026-11-29": "FG",
      "2026-12-07": "FG",
      "2026-12-08": "FB",
      "2026-12-14": "FG",
      "2026-12-15": "FN",
      "2026-12-21": "FG",
      "2026-12-28": "FG"
  }),

  'ROGERIO SOUZA DE SANTOS': buildShifts({
      "2026-11-08": "FG",
      "2026-11-16": "FD",
      "2026-11-17": "FD",
      "2026-11-18": "FR",
      "2026-11-19": "FR",
      "2026-11-20": "FR",
      "2026-11-21": "FR",
      "2026-11-22": "FR",
      "2026-11-23": "FR",
      "2026-11-24": "FR",
      "2026-11-25": "FR",
      "2026-11-26": "FR",
      "2026-11-27": "FR",
      "2026-11-28": "FR",
      "2026-11-29": "FR",
      "2026-11-30": "FR",
      "2026-12-01": "FR",
      "2026-12-02": "FR",
      "2026-12-03": "FR",
      "2026-12-04": "FR",
      "2026-12-05": "FR",
      "2026-12-06": "FR",
      "2026-12-07": "FR",
      "2026-12-14": "FG",
      "2026-12-15": "FN",
      "2026-12-21": "FG",
      "2026-12-28": "FG"
  }),

};