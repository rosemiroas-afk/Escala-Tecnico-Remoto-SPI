import React from 'react';
import { Technician, TechnicianSchedule, SchedulePeriod, OffRequest } from '../types';
import { extractWeekends, formatDisplayDate } from '../utils/dateUtils';
import { DDD_INFO } from '../data/defaultTechnicians';
import { AuditResult } from '../utils/validator';
import { MapPin, Users, Star, Calendar, ShieldCheck } from 'lucide-react';

interface DDDViewProps {
  technicians: Technician[];
  schedules: Record<string, TechnicianSchedule>;
  dates: string[];
  period: SchedulePeriod;
  auditResult: AuditResult;
}

export const DDDView: React.FC<DDDViewProps> = ({
  technicians,
  schedules,
  dates,
  period,
  auditResult
}) => {
  const weekends = extractWeekends(dates);
  const activeTechs = technicians.filter(t => t.active);

  const ddds = [13, 14, 15, 19];

  return (
    <div className="space-y-6">
      {/* Intro info */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-indigo-600" />
            Distribuição Regional por Região DDD (Interior SP)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Acompanhe o revezamento dos fins de semana duplados e a garantia de cobertura diária para cada base operacional.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-500">Total:</span>
          <span className="text-xs font-bold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-lg">
            {activeTechs.length} técnicos ativos
          </span>
        </div>
      </div>

      {/* Regional Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {ddds.map(ddd => {
          const info = DDD_INFO[ddd];
          const dddTechs = activeTechs.filter(t => t.ddd === ddd);

          return (
            <div
              key={ddd}
              className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col"
            >
              {/* Card Header */}
              <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 to-indigo-50/30">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white font-extrabold flex items-center justify-center text-sm shadow-xs">
                    {ddd}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                      <span>DDD {ddd}</span>
                      <span className="text-xs font-normal text-slate-500">• {dddTechs.length} técnicos</span>
                    </h3>
                    <p className="text-xs text-slate-500">{info?.region}</p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block">
                    Mínimo em Campo
                  </span>
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                    {info?.minStaff || 2} técnicos/dia
                  </span>
                </div>
              </div>

              {/* Technicians in this DDD */}
              <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
                  Integrantes da Região:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {dddTechs.map(t => {
                    const stats = auditResult.techStats[t.id];
                    return (
                      <span
                        key={t.id}
                        className="text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-slate-800 font-medium shadow-2xs flex items-center gap-1.5"
                      >
                        <span>{t.name}</span>
                        {stats && stats.doubleWeekendsCount > 0 && (
                          <span title="Possui fim de semana duplado">
                            <Star className="w-3 h-3 text-purple-600 fill-purple-600" />
                          </span>
                        )}
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* Revezamento dos Finais de Semana Duplados */}
              <div className="p-4 flex-1">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-purple-600" />
                  Revezamento dos Fins de Semana Duplados (Sáb + Dom)
                </h4>

                <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                  {weekends.map(wk => {
                    // Find who in this DDD has double off this weekend
                    const offTechs = dddTechs.filter(t => {
                      const sat = schedules[t.id]?.days[wk.saturday]?.shift;
                      const sun = schedules[t.id]?.days[wk.sunday]?.shift;
                      return (sat === 'F' || sat === 'FD') && (sun === 'F' || sun === 'FD');
                    });

                    // Count how many are working
                    const workingCount = dddTechs.length - offTechs.length;

                    return (
                      <div
                        key={wk.id}
                        className="p-2.5 rounded-xl border border-slate-100 bg-slate-50 hover:bg-slate-100/70 transition-colors flex items-center justify-between text-xs"
                      >
                        <div className="flex-1">
                          <span className="font-bold text-slate-800 block text-xs">
                            {formatDisplayDate(wk.saturday)} & {formatDisplayDate(wk.sunday)}
                          </span>

                          <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                            {offTechs.length === 0 ? (
                              <span className="text-[11px] text-slate-400 italic">
                                Todos em regime normal de trabalho / revezamento
                              </span>
                            ) : (
                              offTechs.map(t => (
                                <span
                                  key={t.id}
                                  className="text-[11px] px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 font-semibold border border-purple-200 flex items-center gap-1"
                                >
                                  <Star className="w-2.5 h-2.5 fill-purple-700" />
                                  {t.name} (Folga Dupla)
                                </span>
                              ))
                            )}
                          </div>
                        </div>

                        <div className="text-right pl-3 shrink-0">
                          <span className="text-[10px] text-slate-500 block">Ativos no FDS:</span>
                          <span className={`font-bold text-xs ${workingCount < (info?.minStaff || 1) ? 'text-rose-600' : 'text-emerald-700'}`}>
                            {workingCount} de {dddTechs.length}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
