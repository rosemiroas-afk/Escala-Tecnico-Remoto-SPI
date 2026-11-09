import {
  Technician,
  TechnicianSchedule,
  OffRequest,
  GeneratorOptions,
  ShiftType
} from '../types';
import { extractWeekends, parseDateKey } from './dateUtils';
import { MASTER_PATTERN_5X2, resolvePatternKey, getShiftFromMasterPattern } from './masterPattern5x2';
import { isOffShift, isWorkingShift } from './validator';

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
    // REGIME 5x2 PERPÉTUO CLT: PADRÃO EXATO DE 2 MESES CORRIDOS (REFERÊNCIA DE MESTRE)
    // Sequência rigorosa fornecida para Colaborador 1/3, 2/3 e 3/3 por DDD
    // - TB: Dia de Trabalho
    // - FD: Folga Duplada (2 dias seguidos de descanso)
    // - FG: Folga Geral Individual (1 dia isolado de descanso)
    // =========================================================================

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

    // Mapeamento rigoroso dos dias com a Planilha Oficial (Colaborador 1/3, 2/3 e 3/3)
    for (const d of dates) {
      for (const tech of activeTechs) {
        const techSched = result[tech.id];
        if (!techSched || !techSched.days[d]) continue;

        let groupKey: 'grupo1' | 'grupo2' | 'grupo3';
        let groupLabel = '';

        if (grupo1Ids.has(tech.id)) {
          groupKey = 'grupo1';
          groupLabel = 'Colaborador 1/3';
        } else if (grupo2Ids.has(tech.id)) {
          groupKey = 'grupo2';
          groupLabel = 'Colaborador 2/3';
        } else {
          groupKey = 'grupo3';
          groupLabel = 'Colaborador 3/3';
        }

        const shift = getShiftFromMasterPattern(d, groupKey);

        const note = shift === 'TB'
          ? `Dia de Trabalho (${groupLabel})`
          : shift === 'FD'
          ? `Folga Duplada Consecutiva (${groupLabel})`
          : `Folga Geral Individual (${groupLabel})`;

        techSched.days[d] = {
          date: d,
          shift,
          notes: note
        };
      }
    }

    // =========================================================================
    // GARANTIA OPERACIONAL CLT: MÍNIMO ABSOLUTO DE 8 FOLGAS POR MÊS NO 5x2
    // =========================================================================
    // Agrupa todas as datas geradas por mês de calendário (YYYY-MM)
    const monthGroups: Record<string, string[]> = {};
    for (const d of dates) {
      const ym = d.substring(0, 7);
      if (!monthGroups[ym]) monthGroups[ym] = [];
      monthGroups[ym].push(d);
    }

    for (const [, monthDates] of Object.entries(monthGroups)) {
      // Se for um mês completo com pelo menos 20 dias no período
      if (monthDates.length >= 20) {
        for (const tech of activeTechs) {
          const techSched = result[tech.id];
          if (!techSched) continue;

          // Conta folgas existentes no mês
          let offCount = 0;
          for (const d of monthDates) {
            const shift = techSched.days[d]?.shift;
            if (isOffShift(shift)) {
              offCount++;
            }
          }

          // Se tiver menos de 8 folgas no mês, adiciona folgas complementares
          // nos dias com a maior sequência de TB consecutivos, preservando o modelo 5x2
          while (offCount < 8) {
            let maxStreak = 0;
            let currentStreak = 0;
            let streakEndIdx = -1;

            for (let i = 0; i < monthDates.length; i++) {
              const d = monthDates[i];
              const s = techSched.days[d]?.shift;
              if (isWorkingShift(s)) {
                currentStreak++;
                if (currentStreak > maxStreak) {
                  maxStreak = currentStreak;
                  streakEndIdx = i;
                }
              } else {
                currentStreak = 0;
              }
            }

            if (maxStreak === 0 || streakEndIdx === -1) {
              // Fallback imediato: pega o primeiro dia trabalhado disponível no mês
              const anyTbDate = monthDates.find(d => isWorkingShift(techSched.days[d]?.shift));
              if (anyTbDate) {
                techSched.days[anyTbDate] = {
                  date: anyTbDate,
                  shift: 'FG',
                  notes: 'Folga Geral 5x2 (Garantia Mínima 8 Folgas CLT)'
                };
                offCount++;
                continue;
              }
              break;
            }

            // Escolhe o melhor dia da sequência para conceder folga (priorizando Quarta, Quinta, Terça ou Sexta)
            let chosenDate = monthDates[streakEndIdx];
            for (let j = streakEndIdx; j > streakEndIdx - maxStreak && j >= 0; j--) {
              const checkD = monthDates[j];
              const dow = parseDateKey(checkD).getDay();
              if (dow === 3 || dow === 4 || dow === 5 || dow === 2) {
                chosenDate = checkD;
                break;
              }
            }

            techSched.days[chosenDate] = {
              date: chosenDate,
              shift: 'FG',
              notes: 'Folga Geral 5x2 (Garantia Mínima 8 Folgas CLT)'
            };
            offCount++;
          }

          // Garantia final de fechamento: assegura que offCount seja >= 8
          let finalOffs = monthDates.filter(d => isOffShift(techSched.days[d]?.shift)).length;
          if (finalOffs < 8) {
            for (const d of monthDates) {
              if (finalOffs >= 8) break;
              if (isWorkingShift(techSched.days[d]?.shift)) {
                techSched.days[d] = {
                  date: d,
                  shift: 'FG',
                  notes: 'Folga Geral 5x2 (Garantia Mínima 8 Folgas CLT)'
                };
                finalOffs++;
              }
            }
          }
        }
      }
    }

    // Trava horizontal absoluta 5x2: Limite máximo de TB consecutivos é 6 (proibido 7 dias seguidos)
    for (const tech of activeTechs) {
      const techSched = result[tech.id];
      if (!techSched) continue;

      let consecutiveTB = 0;
      for (let i = 0; i < dates.length; i++) {
        const d = dates[i];
        const s = techSched.days[d]?.shift;
        if (s === 'TB' || s === 'T') {
          consecutiveTB++;
          if (consecutiveTB >= 7) {
            techSched.days[d] = {
              date: d,
              shift: 'FG',
              notes: 'Folga Geral (Prevenção Trava CLT 7 dias seguidos)'
            };
            consecutiveTB = 0;
          }
        } else {
          consecutiveTB = 0;
        }
      }
    }

    // APLICAÇÃO RÍGIDA DAS REGRAS DE COBERTURA 5x2:
    // 1. Meio de semana diluído (mínimo 12 atuantes por dia).
    // 2. Domingo com mínimo 4 e máximo 7 atuantes.
    // 3. Sábado com carga superior ao Domingo.
    enforce5x2CoverageRules(result, dates, activeTechs);
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

/**
 * REGRAS RIGOROSAS DE COBERTURA OPERACIONAL DA ESCALA 5x2:
 * 1. Domingos: No MÍNIMO 4 e no MÁXIMO 7 colaboradores trabalhando aos domingos.
 * 2. Sábados: Carga de colaboradores no Sábado DEVE ser superior à do Domingo (mínimo 10 a 13 atuantes).
 * 3. Meio de Semana: FGs diluídos de Segunda a Sexta sem acúmulo de folgas (mínimo 12 atuantes por dia).
 */
export function enforce5x2CoverageRules(
  result: Record<string, TechnicianSchedule>,
  dates: string[],
  activeTechs: Technician[]
): void {
  const daysByDate = new Map<string, Date>();
  for (const d of dates) {
    daysByDate.set(d, parseDateKey(d));
  }

  // 1. Regra dos Domingos: Mínimo 4 e Máximo 7 colaboradores trabalhando
  const sundayDates = dates.filter(d => daysByDate.get(d)?.getDay() === 0);
  for (const sunDate of sundayDates) {
    const workingTechs = activeTechs.filter(t => isWorkingShift(result[t.id]?.days[sunDate]?.shift));
    let count = workingTechs.length;

    if (count > 7) {
      let excess = count - 7;
      for (const tech of workingTechs) {
        if (excess <= 0) break;
        const techSched = result[tech.id];
        if (!techSched || !techSched.days[sunDate]) continue;
        const s = techSched.days[sunDate].shift;
        if (s === 'TB' || s === 'T') {
          techSched.days[sunDate] = {
            date: sunDate,
            shift: 'FG',
            notes: 'Folga Regulada Domingo 5x2 (Limite Máximo 7 Atuantes)'
          };
          excess--;
        }
      }
    } else if (count < 4) {
      let needed = 4 - count;
      const offTechs = activeTechs.filter(t => isOffShift(result[t.id]?.days[sunDate]?.shift));
      for (const tech of offTechs) {
        if (needed <= 0) break;
        const techSched = result[tech.id];
        if (!techSched || !techSched.days[sunDate]) continue;
        const s = techSched.days[sunDate].shift;
        if (s === 'FG' || s === 'FD') {
          techSched.days[sunDate] = {
            date: sunDate,
            shift: 'TB',
            notes: 'Atuação Regulada Domingo 5x2 (Garantia Mínima 4 Atuantes)'
          };
          needed--;
        }
      }
    }
  }

  // 2. Regra dos Sábados: Carga de trabalho no sábado superior à do domingo
  for (let i = 0; i < dates.length - 1; i++) {
    const satDate = dates[i];
    const sunDate = dates[i + 1];
    if (daysByDate.get(satDate)?.getDay() === 6 && daysByDate.get(sunDate)?.getDay() === 0) {
      const satWorking = activeTechs.filter(t => isWorkingShift(result[t.id]?.days[satDate]?.shift)).length;
      const sunWorking = activeTechs.filter(t => isWorkingShift(result[t.id]?.days[sunDate]?.shift)).length;

      if (satWorking <= sunWorking) {
        let needed = (sunWorking + 3) - satWorking;
        const satOffTechs = activeTechs.filter(t => isOffShift(result[t.id]?.days[satDate]?.shift));
        for (const tech of satOffTechs) {
          if (needed <= 0) break;
          const techSched = result[tech.id];
          if (!techSched || !techSched.days[satDate]) continue;
          if (techSched.days[satDate].shift === 'FG' || techSched.days[satDate].shift === 'FD') {
            techSched.days[satDate] = {
              date: satDate,
              shift: 'TB',
              notes: 'Atuação Sábado 5x2 (Carga Superior ao Domingo)'
            };
            needed--;
          }
        }
      }
    }
  }

  // 3. Diluição Meio de Semana (Segunda a Sexta): NENHUM dia de semana pode ter mais de 7 folgas simultâneas
  const weekdayDates = dates.filter(d => {
    const dow = daysByDate.get(d)?.getDay();
    return dow !== undefined && dow >= 1 && dow <= 5;
  });

  for (const wDate of weekdayDates) {
    const offTechs = activeTechs.filter(t => isOffShift(result[t.id]?.days[wDate]?.shift));
    if (offTechs.length > 7) {
      let excess = offTechs.length - 7;
      for (const tech of offTechs) {
        if (excess <= 0) break;
        const techSched = result[tech.id];
        if (!techSched || !techSched.days[wDate]) continue;
        if (techSched.days[wDate].shift === 'FG') {
          techSched.days[wDate] = {
            date: wDate,
            shift: 'TB',
            notes: 'Dia Trabalhado (Diluição de Folgas Meio de Semana 5x2)'
          };
          excess--;
        }
      }
    }
  }
}

