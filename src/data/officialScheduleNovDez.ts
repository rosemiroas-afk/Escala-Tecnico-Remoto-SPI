import { Technician, ShiftType } from "../types";

export const OFFICIAL_TECHNICIANS: Technician[] = [
  {
    "id": "tech-14-1",
    "name": "Adilson Jose da Silva",
    "ddd": 14,
    "active": true,
    "shiftHours": "08:00 AS 16:20",
    "phone": "991240215"
  },
  {
    "id": "tech-19-2",
    "name": "Andre Luiz de Araujo",
    "ddd": 19,
    "active": true,
    "shiftHours": "13:00 AS 21:20",
    "phone": "991144660"
  },
  {
    "id": "tech-13-3",
    "name": "Ayrton Cesar S. Pereira",
    "ddd": 13,
    "active": true,
    "shiftHours": "13:00 AS 21:20",
    "phone": "991165650"
  },
  {
    "id": "tech-13-4",
    "name": "Carlos Sergio de Oliveira",
    "ddd": 13,
    "active": true,
    "shiftHours": "08:00 AS 16:25",
    "phone": "997015789"
  },
  {
    "id": "tech-19-5",
    "name": "Eduardo Campineiro",
    "ddd": 19,
    "active": true,
    "shiftHours": "08:00 AS 16:20",
    "phone": "991848572"
  },
  {
    "id": "tech-13-6",
    "name": "Ewander da S. Carvalho",
    "ddd": 13,
    "active": true,
    "shiftHours": "08:00 AS 16:25",
    "phone": "991357403"
  },
  {
    "id": "tech-13-7",
    "name": "Ewandro Moura Fé",
    "ddd": 13,
    "active": true,
    "shiftHours": "13:00 AS 21:20",
    "phone": "991845725"
  },
  {
    "id": "tech-14-8",
    "name": "Gersam B. de Oliveira",
    "ddd": 14,
    "active": true,
    "shiftHours": "08:00 AS 16:00",
    "phone": "991745666"
  },
  {
    "id": "tech-19-9",
    "name": "Gustavo D. Carette",
    "ddd": 19,
    "active": true,
    "shiftHours": "08:00 AS 16:00",
    "phone": "992485709"
  },
  {
    "id": "tech-15-10",
    "name": "Gustavo H. M. de Almeida",
    "ddd": 15,
    "active": true,
    "shiftHours": "08:00 AS 16:00",
    "phone": "991319350"
  },
  {
    "id": "tech-13-11",
    "name": "Henrique Sodré de Almeida",
    "ddd": 13,
    "active": true,
    "shiftHours": "08:00 AS 16:23",
    "phone": "991660315"
  },
  {
    "id": "tech-19-12",
    "name": "Josnei Machado de Souza",
    "ddd": 19,
    "active": true,
    "shiftHours": "08:00 AS 16:00",
    "phone": "991641421"
  },
  {
    "id": "tech-19-13",
    "name": "Leonardo T. do Nascimento",
    "ddd": 19,
    "active": true,
    "shiftHours": "08:00 AS 16:00",
    "phone": "995938037"
  },
  {
    "id": "tech-15-14",
    "name": "Lucas Pais de Camargo",
    "ddd": 15,
    "active": true,
    "shiftHours": "08:00 AS 16:20",
    "phone": "991285617"
  },
  {
    "id": "tech-13-15",
    "name": "Marcio Inacio de Souza",
    "ddd": 13,
    "active": true,
    "shiftHours": "08:00 AS 16:00",
    "phone": "991771063"
  },
  {
    "id": "tech-15-16",
    "name": "Odirlei S. de Campos",
    "ddd": 15,
    "active": true,
    "shiftHours": "08:00 AS 16:26",
    "phone": "991757851"
  },
  {
    "id": "tech-14-17",
    "name": "Paulo Sergio Carrara",
    "ddd": 14,
    "active": true,
    "shiftHours": "08:00 AS 16:20",
    "phone": "991257839"
  },
  {
    "id": "tech-19-18",
    "name": "Rodrigo F. Albuquerque",
    "ddd": 19,
    "active": true,
    "shiftHours": "08:00 AS 16:20",
    "phone": "993044137"
  },
  {
    "id": "tech-13-19",
    "name": "Rogerio Souza dos Santos",
    "ddd": 13,
    "active": true,
    "shiftHours": "08:00 AS 16:22",
    "phone": "991356416"
  }
];

function buildShifts(values: Record<string, ShiftType>): Record<string, ShiftType> {
  const result: Record<string, ShiftType> = {};
  // October 31
  result["2026-10-31"] = values["2026-10-31"] || "TB";

  // November (30 days)
  for (let d = 1; d <= 30; d++) {
    const dayStr = d < 10 ? `0${d}` : `${d}`;
    const dateStr = `2026-11-${dayStr}`;
    result[dateStr] = values[dateStr] || "TB";
  }

  // December (31 days)
  for (let d = 1; d <= 31; d++) {
    const dayStr = d < 10 ? `0${d}` : `${d}`;
    const dateStr = `2026-12-${dayStr}`;
    result[dateStr] = values[dateStr] || "TB";
  }
  return result;
}

// Row 1: Adilson Jose Da Silva
const shiftsAdilson = buildShifts({
  "2026-11-01": "FG",
  "2026-11-07": "FG",
  "2026-11-14": "FD",
  "2026-11-15": "FD",
  "2026-11-20": "FN",
  "2026-11-22": "FG",
  "2026-11-29": "FG",
  "2026-12-05": "FG",
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
  "2026-12-21": "FR",
  "2026-12-27": "FG"
});

// Row 2: Andre Luiz De Araujo
const shiftsAndre = buildShifts({
  "2026-10-31": "FG",
  "2026-11-02": "FN",
  "2026-11-08": "FG",
  "2026-11-15": "FG",
  "2026-11-22": "FG",
  "2026-11-29": "FG",
  "2026-12-05": "FD",
  "2026-12-06": "FD",
  "2026-12-13": "FG",
  "2026-12-19": "FG",
  "2026-12-26": "FG"
});

// Row 3: Ayrton Cesar Dos Santos Pereira
const shiftsAyrton = buildShifts({
  "2026-10-31": "FD",
  "2026-11-01": "FD",
  "2026-11-08": "FG",
  "2026-11-15": "FG",
  "2026-11-20": "FN",
  "2026-11-22": "FG",
  "2026-11-28": "FG",
  "2026-12-05": "FG",
  "2026-12-12": "FG",
  "2026-12-14": "FN",
  "2026-12-20": "FG",
  "2026-12-27": "FG"
});

// Row 4: Carlos Sergio de Oliveira
const shiftsCarlos = buildShifts({
  "2026-11-01": "FG",
  "2026-11-08": "FG",
  "2026-11-15": "FG",
  "2026-11-20": "FN",
  "2026-11-22": "FG",
  "2026-11-29": "FG",
  "2026-12-06": "FG",
  "2026-12-13": "FG",
  "2026-12-20": "FG",
  "2026-12-27": "FG"
});

// Row 5: Eduardo Campineiro Neto
const shiftsEduardo = buildShifts({
  "2026-11-01": "FG",
  "2026-11-02": "FN",
  "2026-11-08": "FG",
  "2026-11-15": "FG",
  "2026-11-21": "FD",
  "2026-11-22": "FD",
  "2026-11-29": "FG",
  "2026-12-06": "FG",
  "2026-12-13": "FG",
  "2026-12-20": "FG",
  "2026-12-27": "FG"
});

// Row 6: Ewander Da Silva Carvalho
const shiftsEwander = buildShifts({
  "2026-11-01": "FG",
  "2026-11-07": "FG",
  "2026-11-09": "FB",
  "2026-11-15": "FD",
  "2026-11-16": "FD",
  "2026-11-20": "FN",
  "2026-11-22": "FG",
  "2026-11-29": "FG",
  "2026-12-05": "FG",
  "2026-12-12": "FG",
  "2026-12-14": "FN",
  "2026-12-19": "FG",
  "2026-12-26": "FG"
});

// Row 7: Ewandro Moura Fe
const shiftsEwandro = buildShifts({
  "2026-10-31": "FG",
  "2026-11-02": "FN",
  "2026-11-07": "FG",
  "2026-11-14": "FG",
  "2026-11-21": "FG",
  "2026-11-28": "FG",
  "2026-12-05": "FD",
  "2026-12-06": "FD",
  "2026-12-13": "FG",
  "2026-12-20": "FG",
  "2026-12-26": "FG"
});

// Row 8: Gersam Bernardo De Oliveira
const shiftsGersam = buildShifts({
  "2026-10-31": "FG",
  "2026-11-02": "FN",
  "2026-11-08": "FG",
  "2026-11-15": "FG",
  "2026-11-21": "FG",
  "2026-11-28": "FD",
  "2026-11-29": "FD",
  "2026-12-06": "FG",
  "2026-12-13": "FG",
  "2026-12-19": "FG",
  "2026-12-26": "FG"
});

// Row 9: Gustavo Donizeti Carette
const shiftsGustavoC = buildShifts({
  "2026-10-31": "FG",
  "2026-11-02": "FN",
  "2026-11-08": "FG",
  "2026-11-15": "FG",
  "2026-11-22": "FG",
  "2026-11-29": "FG",
  "2026-12-06": "FG",
  "2026-12-12": "FD",
  "2026-12-13": "FD",
  "2026-12-20": "FG",
  "2026-12-26": "FG"
});

// Row 10: Gustavo Henrique Mendes De Almeida
const shiftsGustavoA = buildShifts({
  "2026-11-01": "FG",
  "2026-11-02": "FN",
  "2026-11-08": "FG",
  "2026-11-15": "FG",
  "2026-11-21": "FG",
  "2026-11-23": "FB",
  "2026-11-29": "FG",
  "2026-12-06": "FG",
  "2026-12-12": "FD",
  "2026-12-13": "FD",
  "2026-12-20": "FG",
  "2026-12-27": "FG"
});

// Row 11: Henrique Sodre Almeida
const shiftsHenrique = buildShifts({
  "2026-11-01": "FG",
  "2026-11-08": "FG",
  "2026-11-15": "FG",
  "2026-11-20": "FN",
  "2026-11-21": "FD",
  "2026-11-22": "FD",
  "2026-11-29": "FG",
  "2026-12-05": "FG",
  "2026-12-12": "FG",
  "2026-12-14": "FN",
  "2026-12-20": "FG",
  "2026-12-27": "FG"
});

// Row 12: Josnei Machado De Souza
const shiftsJosnei = buildShifts({
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
  "2026-12-13": "FG",
  "2026-12-20": "FG",
  "2026-12-26": "FG"
});

// Row 13: Leonardo Teixeira Do Nascimento
const shiftsLeonardo = buildShifts({
  "2026-10-31": "FG",
  "2026-11-02": "FN",
  "2026-11-07": "FG",
  "2026-11-14": "FG",
  "2026-11-21": "FD",
  "2026-11-22": "FD",
  "2026-11-28": "FG",
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
  "2026-12-20": "FG",
  "2026-12-26": "FG"
});

// Row 14: Lucas Pais De Camargo
const shiftsLucas = buildShifts({
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
  "2026-11-29": "FG",
  "2026-12-06": "FG",
  "2026-12-12": "FG",
  "2026-12-14": "FN",
  "2026-12-20": "FG",
  "2026-12-27": "FG"
});

// Row 15: Marcio Inacio De Souza
const shiftsMarcio = buildShifts({
  "2026-11-01": "FG",
  "2026-11-02": "FN",
  "2026-11-08": "FG",
  "2026-11-14": "FD",
  "2026-11-15": "FD",
  "2026-11-22": "FG",
  "2026-11-29": "FG",
  "2026-12-06": "FG",
  "2026-12-12": "FG",
  "2026-12-19": "FG",
  "2026-12-26": "FG"
});

// Row 16: Odirlei Silveira De Campos
const shiftsOdirlei = buildShifts({
  "2026-11-01": "FG",
  "2026-11-02": "FN",
  "2026-11-08": "FG",
  "2026-11-15": "FG",
  "2026-11-22": "FG",
  "2026-11-28": "FD",
  "2026-11-29": "FD",
  "2026-12-06": "FG",
  "2026-12-13": "FG",
  "2026-12-20": "FG",
  "2026-12-27": "FG"
});

// Row 17: Paulo Sergio Carrara
const shiftsPaulo = buildShifts({
  "2026-11-01": "FG",
  "2026-11-07": "FD",
  "2026-11-08": "FD",
  "2026-11-15": "FG",
  "2026-11-20": "FN",
  "2026-11-22": "FG",
  "2026-11-29": "FG",
  "2026-12-06": "FG",
  "2026-12-12": "FG",
  "2026-12-14": "FN",
  "2026-12-20": "FG",
  "2026-12-27": "FG"
});

// Row 18: Rodrigo Ferreira Albuquerque
const shiftsRodrigo = buildShifts({
  "2026-10-31": "FG",
  "2026-11-07": "FD",
  "2026-11-08": "FD",
  "2026-11-15": "FG",
  "2026-11-20": "FN",
  "2026-11-22": "FG",
  "2026-11-28": "FG",
  "2026-12-05": "FG",
  "2026-12-07": "FB",
  "2026-12-12": "FG",
  "2026-12-14": "FN",
  "2026-12-20": "FG",
  "2026-12-26": "FG"
});

// Row 19: Rogerio Souza Dos Santos
const shiftsRogerio = buildShifts({
  "2026-11-01": "FG",
  "2026-11-07": "FG",
  "2026-11-14": "FD",
  "2026-11-15": "FD",
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
  "2026-12-06": "FG",
  "2026-12-12": "FG",
  "2026-12-14": "FN",
  "2026-12-20": "FG",
  "2026-12-27": "FG"
});

export const OFFICIAL_SHIFTS_BY_TECH_NAME: Record<string, Record<string, ShiftType>> = {
  "tech-14-1": shiftsAdilson,
  "Adilson Jose da Silva": shiftsAdilson,
  "Adilson Jose Da Silva": shiftsAdilson,
  "ADILSON JOSE DA SILVA": shiftsAdilson,

  "tech-19-2": shiftsAndre,
  "Andre Luiz de Araujo": shiftsAndre,
  "Andre Luiz De Araujo": shiftsAndre,
  "ANDRE LUIZ DE ARAUJO": shiftsAndre,

  "tech-13-3": shiftsAyrton,
  "Ayrton Cesar S. Pereira": shiftsAyrton,
  "AYRTON CESAR S. PEREIRA": shiftsAyrton,
  "Ayrton Cesar Dos Santos Pereira": shiftsAyrton,
  "AYRTON CESAR DOS SANTOS PEREIRA": shiftsAyrton,

  "tech-13-4": shiftsCarlos,
  "Carlos Sergio de Oliveira": shiftsCarlos,
  "CARLOS SERGIO DE OLIVEIRA": shiftsCarlos,
  "CARLOS SERGIO DE OLIVETRA": shiftsCarlos,

  "tech-19-5": shiftsEduardo,
  "Eduardo Campineiro": shiftsEduardo,
  "EDUARDO CAMPINEIRO": shiftsEduardo,
  "Eduardo Campineiro Neto": shiftsEduardo,
  "EDUARDO CAMPINEIRO NETO": shiftsEduardo,

  "tech-13-6": shiftsEwander,
  "Ewander da S. Carvalho": shiftsEwander,
  "EWANDER DA S. CARVALHO": shiftsEwander,
  "Ewander Da Silva Carvalho": shiftsEwander,
  "EWANDER DA SILVA CARVALHO": shiftsEwander,

  "tech-13-7": shiftsEwandro,
  "Ewandro Moura Fé": shiftsEwandro,
  "EWANDRO MOURA FÉ": shiftsEwandro,
  "Ewandro Moura Fe": shiftsEwandro,
  "EWANDRO MOURA FE": shiftsEwandro,

  "tech-14-8": shiftsGersam,
  "Gersam B. de Oliveira": shiftsGersam,
  "GERSAM B. DE OLIVEIRA": shiftsGersam,
  "Gersam Bernardo De Oliveira": shiftsGersam,
  "GERSAM BERNARDO DE OLIVEIRA": shiftsGersam,

  "tech-19-9": shiftsGustavoC,
  "Gustavo D. Carette": shiftsGustavoC,
  "GUSTAVO D. CARETTE": shiftsGustavoC,
  "Gustavo Donizeti Carette": shiftsGustavoC,
  "GUSTAVO DONIZETI CARETTE": shiftsGustavoC,

  "tech-15-10": shiftsGustavoA,
  "tech-19-10": shiftsGustavoA,
  "Gustavo H. M. de Almeida": shiftsGustavoA,
  "GUSTAVO H. M. DE ALMEIDA": shiftsGustavoA,
  "Gustavo Henrique Mendes De Almeida": shiftsGustavoA,
  "GUSTAVO HENRIQUE MENDES DE ALMEIDA": shiftsGustavoA,

  "tech-13-11": shiftsHenrique,
  "Henrique Sodré de Almeida": shiftsHenrique,
  "HENRIQUE SODRÉ DE ALMEIDA": shiftsHenrique,
  "Henrique Sodre Almeida": shiftsHenrique,
  "HENRIQUE SODRE ALMEIDA": shiftsHenrique,

  "tech-19-12": shiftsJosnei,
  "Josnei Machado de Souza": shiftsJosnei,
  "Josnei Machado De Souza": shiftsJosnei,
  "JOSNEI MACHADO DE SOUZA": shiftsJosnei,

  "tech-19-13": shiftsLeonardo,
  "Leonardo T. do Nascimento": shiftsLeonardo,
  "LEONARDO T. DO NASCIMENTO": shiftsLeonardo,
  "Leonardo Teixeira Do Nascimento": shiftsLeonardo,
  "LEONARDO TEIXEIRA DO NASCIMENTO": shiftsLeonardo,

  "tech-15-14": shiftsLucas,
  "Lucas Pais de Camargo": shiftsLucas,
  "Lucas Pais De Camargo": shiftsLucas,
  "LUCAS PAIS DE CAMARGO": shiftsLucas,

  "tech-13-15": shiftsMarcio,
  "Marcio Inacio de Souza": shiftsMarcio,
  "Marcio Inacio De Souza": shiftsMarcio,
  "MARCIO INACIO DE SOUZA": shiftsMarcio,

  "tech-15-16": shiftsOdirlei,
  "Odirlei S. de Campos": shiftsOdirlei,
  "ODIRLEI S. DE CAMPOS": shiftsOdirlei,
  "Odirlei Silveira De Campos": shiftsOdirlei,
  "ODIRLEI SILVEIRA DE CAMPOS": shiftsOdirlei,

  "tech-14-17": shiftsPaulo,
  "Paulo Sergio Carrara": shiftsPaulo,
  "PAULO SERGIO CARRARA": shiftsPaulo,

  "tech-19-18": shiftsRodrigo,
  "Rodrigo F. Albuquerque": shiftsRodrigo,
  "RODRIGO F. ALBUQUERQUE": shiftsRodrigo,
  "Rodrigo Ferreira Albuquerque": shiftsRodrigo,
  "RODRIGO FERREIRA ALBUQUERQUE": shiftsRodrigo,

  "tech-13-19": shiftsRogerio,
  "Rogerio Souza dos Santos": shiftsRogerio,
  "Rogerio Souza Dos Santos": shiftsRogerio,
  "ROGERIO SOUZA DOS SANTOS": shiftsRogerio,
  "ROGERIO SOUZA DE SANTOS": shiftsRogerio,
};
