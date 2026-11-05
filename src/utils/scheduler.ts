import {
  Technician,
  TechnicianSchedule,
  OffRequest,
  GeneratorOptions,
  ShiftType
} from '../types';
import { extractWeekends, parseDateKey } from './dateUtils';

/**
 * Generate 6x1 schedule strictly matching the user's requirements:
 * 1. 60% Saturday / 40% Sunday off split per DDD region.
 * 2. 3-week rotation (3 weeks Pattern A, 3 weeks Pattern B).
 *    Pattern A: Work Sunday to Friday, Off Saturday.
 *    Pattern B: Work Monday to Saturday, Off Sunday.
 * 3. Guaranteed Double Weekend (FD: Sábado + Domingo) once per technician.
 * 4. Prevention of 7 consecutive work days with FC (Folga Compensada) between Mon-Thu.
 */
/**
 * Generate schedule supporting 6x1 or 5x2 regimes:
 * - 6x1: 6 days worked, 1 regular off day per week, guaranteed FD (Sat+Sun), max 6 consecutive work days.
 * - 5x2: 5 days worked, 2 off days per week (consecutive or distributed weekend pairs), max 5 consecutive work days.
 */
export function generateSchedule(
  technicians: Technician[],
  dates: string[],
  offRequests: OffRequest[] = [],
  options: GeneratorOptions
): Record<string, TechnicianSchedule> {
  const activeTechs = technicians.filter(t => t.active);
  const result: Record<string, TechnicianSchedule> = {};
  const weekends = extractWeekends(dates);
  const is5x2 = options.regime === '5x2';

  // 1. Initialize EVERY day as 'TB' (Dia Trabalhado).
  for (const tech of activeTechs) {
    result[tech.id] = {
      technicianId: tech.id,
      days: {}
    };
    for (const d of dates) {
      result[tech.id].days[d] = {
        date: d,
        shift: 'TB',
        manualOverride: false
      };
    }
  }

  if (weekends.length === 0) return result;

  // Group technicians by DDD
  const dddGroups: Record<number, Technician[]> = {};
  for (const tech of activeTechs) {
    if (!dddGroups[tech.ddd]) dddGroups[tech.ddd] = [];
    dddGroups[tech.ddd].push(tech);
  }

  // 2. Determine Subgroups for each DDD (Metade da equipe por DDD: 4 e 3, 2 e 1, 2 e 2)
  const techGroups: Record<string, number> = {}; // techId -> 1 or 2
  for (const dddStr of Object.keys(dddGroups)) {
    const techs = dddGroups[Number(dddStr)];
    // Metade da equipe por DDD: se tem 7 fica 4 e 3; se 3 fica 2 e 1; se 4 fica 2 e 2; se 6 fica 3 e 3
    const group1Count = Math.ceil(techs.length / 2);
    
    for (let i = 0; i < techs.length; i++) {
      techGroups[techs[i].id] = i < group1Count ? 1 : 2;
    }
  }

  if (is5x2) {
    // =========================================================================
    // REGIME 5x2 PERPÉTUO CLT: FRAÇÕES POR DDD (1/3, 2/3, 3/3) & ALTERNÂNCIA BIMESTRAL
    // 5 Dias Trabalhados (TB) e 2 Folgas Semanais (FD ou FG) de Segunda a Domingo
    // Siglas estritas:
    // - TB: Dia Trabalhado (exatamente 5 dias por semana de Segunda a Domingo)
    // - FD: Folga Duplada (2 folgas consecutivas, ex: Sáb+Dom ou Qua+Qui ou Sex+Sáb)
    // - FG: Folga Geral Individual (1 dia isolado, ex: Sex e Dom)
    // =========================================================================

    // Determina se o mês selecionado é Tipo 1 (Ímpar) ou Tipo 2 (Par)
    const firstDateObj = parseDateKey(dates[0]);
    const monthNum = firstDateObj.getMonth() + 1; // 1-12
    const isTipo1 = options.monthType5x2 === 'tipo_1'
      ? true
      : options.monthType5x2 === 'tipo_2'
      ? false
      : (monthNum % 2 !== 0);

    // [REGRA 1: DIVISÃO DINÂMICA POR PORCENTAGEM E DDD]
    // Lê a base de dados agrupada por DDD e divide matematicamente em 3 grupos equivalentes:
    // - Grupo 1/3, Grupo 2/3, Grupo 3/3 (~33.3% da equipe de cada DDD).
    // Resto da divisão por 3 distribuído priorizando Grupo 1/3 e depois Grupo 2/3.
    const grupo1Techs: Technician[] = [];
    const grupo2Techs: Technician[] = [];
    const grupo3Techs: Technician[] = [];

    for (const dddStr of Object.keys(dddGroups).sort((a, b) => Number(a) - Number(b))) {
      const dddTechs = [...dddGroups[Number(dddStr)]].sort((a, b) => a.name.localeCompare(b.name));
      const n = dddTechs.length;
      const base = Math.floor(n / 3);
      const rem = n % 3;

      const c1 = base + (rem >= 1 ? 1 : 0);
      const c2 = base + (rem === 2 ? 1 : 0);

      grupo1Techs.push(...dddTechs.slice(0, c1));
      grupo2Techs.push(...dddTechs.slice(c1, c1 + c2));
      grupo3Techs.push(...dddTechs.slice(c1 + c2));
    }

    const grupo1Ids = new Set(grupo1Techs.map(t => t.id));
    const grupo2Ids = new Set(grupo2Techs.map(t => t.id));
    const grupo3Ids = new Set(grupo3Techs.map(t => t.id));

    // Helper para identificar a Segunda-feira da semana de calendário (Segunda a Domingo)
    const getMondayKey = (dateStr: string): string => {
      const dt = parseDateKey(dateStr);
      const day = dt.getDay(); // 0=Dom, 1=Seg, ... 6=Sáb
      const diff = day === 0 ? 6 : day - 1;
      const monday = new Date(dt);
      monday.setDate(dt.getDate() - diff);
      const y = monday.getFullYear();
      const m = String(monday.getMonth() + 1).padStart(2, '0');
      const d = String(monday.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    };

    // Identifica todas as semanas de calendário presentes no período gerado
    const uniqueMondays = Array.from(new Set(dates.map(getMondayKey))).sort();

    // Matrizes Semanais Padrão [Seg, Ter, Qua, Qui, Sex, Sáb, Dom]
    // Cada uma contém exatamente 5 TB e 2 Folgas (FD ou FG)
    interface WeekPatternDay {
      shift: ShiftType;
      notes: string;
    }

    // Semana 1 e 2 (FDS Livre): Seg-Sex TB, Sáb-Dom FD
    const SEMANA_FDS_LIVRE: WeekPatternDay[] = [
      { shift: 'TB', notes: 'Dia de Trabalho (Segunda)' },
      { shift: 'TB', notes: 'Dia de Trabalho (Terça)' },
      { shift: 'TB', notes: 'Dia de Trabalho (Quarta)' },
      { shift: 'TB', notes: 'Dia de Trabalho (Quinta)' },
      { shift: 'TB', notes: 'Dia de Trabalho (Sexta)' },
      { shift: 'FD', notes: 'Folga Dupla FDS (Sábado)' },
      { shift: 'FD', notes: 'Folga Dupla FDS (Domingo)' }
    ];

    // Semana 3 (FDS Trabalhado): Seg-Ter TB, Qua-Qui FD, Sex-Dom TB (Folga Qua/Qui evita emenda de 4 dias)
    const SEMANA_FDS_TRABALHADO: WeekPatternDay[] = [
      { shift: 'TB', notes: 'Dia de Trabalho (Segunda)' },
      { shift: 'TB', notes: 'Dia de Trabalho (Terça)' },
      { shift: 'FD', notes: 'Folga Dupla Meio de Semana (Quarta)' },
      { shift: 'FD', notes: 'Folga Dupla Meio de Semana (Quinta)' },
      { shift: 'TB', notes: 'Dia de Trabalho (Sexta)' },
      { shift: 'TB', notes: 'Dia de Trabalho FDS (Sábado)' },
      { shift: 'TB', notes: 'Dia de Trabalho FDS (Domingo)' }
    ];

    // Semana 4 Mês Tipo 1: Trabalha Sábado, Folga Domingo (Sex FG e Dom FG, Sáb TB)
    const SEMANA_4_TIPO_1: WeekPatternDay[] = [
      { shift: 'TB', notes: 'Dia de Trabalho (Segunda)' },
      { shift: 'TB', notes: 'Dia de Trabalho (Terça)' },
      { shift: 'TB', notes: 'Dia de Trabalho (Quarta)' },
      { shift: 'TB', notes: 'Dia de Trabalho (Quinta)' },
      { shift: 'FG', notes: 'Folga Geral Isolada (Sexta)' },
      { shift: 'TB', notes: 'Dia de Trabalho FDS (Sábado)' },
      { shift: 'FG', notes: 'Folga Geral Isolada (Domingo)' }
    ];

    // Semana 4 Mês Tipo 2: Folga Sábado, Trabalha Domingo (Sex FD e Sáb FD, Dom TB)
    const SEMANA_4_TIPO_2: WeekPatternDay[] = [
      { shift: 'TB', notes: 'Dia de Trabalho (Segunda)' },
      { shift: 'TB', notes: 'Dia de Trabalho (Terça)' },
      { shift: 'TB', notes: 'Dia de Trabalho (Quarta)' },
      { shift: 'TB', notes: 'Dia de Trabalho (Quinta)' },
      { shift: 'FD', notes: 'Folga Dupla Casada (Sexta)' },
      { shift: 'FD', notes: 'Folga Dupla Casada (Sábado)' },
      { shift: 'TB', notes: 'Dia de Trabalho FDS (Domingo)' }
    ];

    const semana4Ativa = isTipo1 ? SEMANA_4_TIPO_1 : SEMANA_4_TIPO_2;

    // Definição dos ciclos de 4 semanas para os 3 grupos assíncronos:
    // Garante que o DDD NUNCA fique com 0 técnicos atuantes em nenhum dia da semana ou final de semana.
    const planGrupo1: WeekPatternDay[][] = [
      SEMANA_FDS_LIVRE,      // Semana 1: FDS Livre (Sáb+Dom FD)
      SEMANA_FDS_LIVRE,      // Semana 2: FDS Livre (Sáb+Dom FD)
      SEMANA_FDS_TRABALHADO, // Semana 3: FDS Trabalhado (Qua+Qui FD, Sáb+Dom TB)
      semana4Ativa           // Semana 4: Alternância bimestral
    ];

    const planGrupo2: WeekPatternDay[][] = [
      SEMANA_FDS_TRABALHADO, // Semana 1: FDS Trabalhado (cobre o FDS enquanto G1 folga)
      semana4Ativa,          // Semana 2: Alternância bimestral
      SEMANA_FDS_LIVRE,      // Semana 3: FDS Livre (Sáb+Dom FD)
      SEMANA_FDS_LIVRE       // Semana 4: FDS Livre (Sáb+Dom FD)
    ];

    const planGrupo3: WeekPatternDay[][] = [
      SEMANA_FDS_LIVRE,      // Semana 1: FDS Livre
      SEMANA_FDS_TRABALHADO, // Semana 2: FDS Trabalhado (garante cobertura total de Domingo)
      SEMANA_FDS_LIVRE,      // Semana 3: FDS Livre
      SEMANA_FDS_TRABALHADO  // Semana 4: FDS Trabalhado (garante cobertura total de Domingo)
    ];

    // Aplicação para cada dia do mês
    for (const d of dates) {
      const dt = parseDateKey(d);
      const dow = dt.getDay(); // 0=Dom, 1=Seg, 2=Ter, 3=Qua, 4=Qui, 5=Sex, 6=Sáb
      // Índice de 0 a 6 (0=Segunda, 1=Terça, ..., 5=Sábado, 6=Domingo)
      const dayIndex = dow === 0 ? 6 : dow - 1;

      const mondayKey = getMondayKey(d);
      const weekIndex = uniqueMondays.indexOf(mondayKey);
      const cycleWeek = weekIndex >= 0 ? weekIndex % 4 : 0;

      for (const tech of activeTechs) {
        const techSched = result[tech.id];
        if (!techSched || !techSched.days[d]) continue;

        let patternDay: WeekPatternDay;

        if (grupo1Ids.has(tech.id)) {
          patternDay = planGrupo1[cycleWeek][dayIndex];
        } else if (grupo2Ids.has(tech.id)) {
          patternDay = planGrupo2[cycleWeek][dayIndex];
        } else {
          // Grupo 3
          patternDay = planGrupo3[cycleWeek][dayIndex];
        }

        techSched.days[d] = {
          date: d,
          shift: patternDay.shift,
          notes: patternDay.notes
        };
      }
    }
  } else {
    // ==========================================
    // REGIME 6x1 LOGIC: 6 Dias Trabalhados / 1 Folga Semanal
    // ==========================================
    // 3. Assign Baseline Weekend Offs based on 3-week rotation
    for (const tech of activeTechs) {
      const techSched = result[tech.id];
      const group = techGroups[tech.id];

      for (let wkIdx = 0; wkIdx < weekends.length; wkIdx++) {
        const wk = weekends[wkIdx];
        const block = Math.floor(wkIdx / 3);
        const isPatternA = (block % 2 === 0) ? (group === 1) : (group === 2);

        if (isPatternA) {
          // Pattern A: Off Saturday, Work Sunday
          techSched.days[wk.saturday] = { date: wk.saturday, shift: 'FG', notes: 'Folga Regular (Sábado)' };
          techSched.days[wk.sunday] = { date: wk.sunday, shift: 'TB' };
        } else {
          // Pattern B: Work Saturday, Off Sunday
          techSched.days[wk.saturday] = { date: wk.saturday, shift: 'TB' };
          techSched.days[wk.sunday] = { date: wk.sunday, shift: 'FG', notes: 'Folga Regular (Domingo)' };
        }
      }
    }

    // 4. Assign ONE Guaranteed Double Weekend (FD) per Technician
    if (options.ensureDoubleWeekend) {
      let globalWkOffset = 0;
      for (const tech of activeTechs) {
        const techSched = result[tech.id];
        const targetWkIdx = globalWkOffset % weekends.length;
        globalWkOffset++;

        const wk = weekends[targetWkIdx];
        if (wk) {
          techSched.days[wk.saturday] = { date: wk.saturday, shift: 'FD', notes: 'Fim de Semana Duplado' };
          techSched.days[wk.sunday] = { date: wk.sunday, shift: 'FD', notes: 'Fim de Semana Duplado' };
        }
      }
    }

    // 5. Detection and Prevention of 7 Consecutive Days (FC)
    for (const tech of activeTechs) {
      const techSched = result[tech.id];
      let consecutiveWork = 0;
      
      for (let i = 0; i < dates.length; i++) {
        const d = dates[i];
        const shift = techSched.days[d].shift;
        
        if (shift === 'TB') {
          consecutiveWork++;
        } else {
          consecutiveWork = 0;
        }

        if (consecutiveWork >= 7) {
          let placedFC = false;
          for (let j = i; j >= Math.max(0, i - 6); j--) {
            const checkDate = dates[j];
            const dow = parseDateKey(checkDate).getDay();
            // dow 1=Mon, 2=Tue, 3=Wed, 4=Thu
            if (dow >= 1 && dow <= 4 && techSched.days[checkDate].shift === 'TB') {
              techSched.days[checkDate] = { 
                date: checkDate, 
                shift: 'FC', 
                notes: 'Folga Compensada (Prevenção 7 dias)' 
              };
              placedFC = true;
              consecutiveWork = i - j;
              break;
            }
          }
          
          if (!placedFC) {
            for (let j = i + 1; j < dates.length; j++) {
              const checkDate = dates[j];
              const dow = parseDateKey(checkDate).getDay();
              if (dow >= 1 && dow <= 4) {
                techSched.days[checkDate] = { 
                  date: checkDate, 
                  shift: 'FC', 
                  notes: 'Folga Compensada (Prevenção 7 dias)' 
                };
                break;
              }
            }
          }
        }
      }
    }
  }

  // 6. Process APPROVED Off Requests (both 'aprovado' and 'atendido')
  if (options.prioritizeOffRequests && offRequests.length > 0) {
    for (const req of offRequests) {
      if (req.status !== 'atendido' && req.status !== 'aprovado') continue;

      const techSched = result[req.technicianId];
      if (!techSched || !techSched.days[req.date]) continue;

      const reqDate = req.date;
      const dObj = parseDateKey(reqDate);
      const dow = dObj.getDay();

      // Convert the requested day to off:
      // If it's a weekday, FC (compensatória)
      // If weekend, FG (regular)
      const shiftType: ShiftType = (dow === 0 || dow === 6) ? 'FG' : 'FC';
      
      techSched.days[reqDate] = {
        date: reqDate,
        shift: shiftType,
        notes: req.notes.join(' | '),
        isOffRequestFulfilled: true
      };
    }
  }

  return result;
}

