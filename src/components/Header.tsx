import React from 'react';
import { SchedulePeriod } from '../types';
import { MONTHS_PT } from '../utils/dateUtils';
import { AuditResult } from '../utils/validator';
import {
  Calendar,
  Sparkles,
  FileSpreadsheet,
  MessageSquare,
  Users,
  ShieldCheck,
  AlertTriangle,
  Layers,
  UserCheck,
  MapPin,
  ClipboardList
} from 'lucide-react';

interface HeaderProps {
  period: SchedulePeriod;
  auditResult: AuditResult;
  offRequestsCount: number;
  activeTab: 'matrix' | 'by_ddd' | 'individual' | 'audit';
  onSelectTab: (tab: 'matrix' | 'by_ddd' | 'individual' | 'audit') => void;
  onOpenGenerator: () => void;
  onOpenRequests: () => void;
  onOpenTeam: () => void;
  onOpenWhatsApp: () => void;
  onExportExcel: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  period,
  auditResult,
  offRequestsCount,
  activeTab,
  onSelectTab,
  onOpenGenerator,
  onOpenRequests,
  onOpenTeam,
  onOpenWhatsApp,
  onExportExcel
}) => {
  const nextMonth = (period.startMonth + 1) % 12;
  const startYear = period.startYear;
  const nextYear = period.startMonth === 11 ? startYear + 1 : startYear;

  const periodLabel = `${MONTHS_PT[period.startMonth]} e ${MONTHS_PT[nextMonth]} de ${startYear === nextYear ? startYear : `${startYear}/${nextYear}`}`;

  const hasIssues = auditResult.issues.length > 0;

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs">
      {/* Top Navbar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-4">
        {/* App Title & Period */}
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-600 flex items-center justify-center text-white shadow-md shadow-indigo-200">
            <Calendar className="w-5 h-5 text-white" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-black text-slate-900 tracking-tight">
                EscalaMaster <span className="text-indigo-600 font-extrabold">6x1</span>
              </h1>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                Interior SP (DDD 13, 14, 15, 19)
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
              <span>Período Bimestral:</span>
              <strong className="text-slate-800 font-semibold">{periodLabel}</strong>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Audit Score Badge */}
          <button
            onClick={() => onSelectTab('audit')}
            className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              auditResult.score >= 90
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                : 'bg-rose-50 text-rose-800 border-rose-300 hover:bg-rose-100'
            }`}
            title="Ver auditoria detalhada de conformidade legal"
          >
            {auditResult.score >= 90 ? (
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600 animate-pulse" />
            )}
            <span>Conformidade: {auditResult.score}%</span>
          </button>

          {/* Off Requests Modal Trigger */}
          <button
            onClick={onOpenRequests}
            className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer relative"
          >
            <ClipboardList className="w-3.5 h-3.5 text-indigo-600" />
            <span>Pedidos de Folga</span>
            {offRequestsCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-indigo-600 text-white text-[10px] font-bold flex items-center justify-center">
                {offRequestsCount}
              </span>
            )}
          </button>

          {/* Team Management */}
          <button
            onClick={onOpenTeam}
            className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Users className="w-3.5 h-3.5 text-slate-600" />
            <span>Equipe</span>
          </button>

          {/* WhatsApp Export */}
          <button
            onClick={onOpenWhatsApp}
            className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
            <span>WhatsApp</span>
          </button>

          {/* Excel Export */}
          <button
            onClick={onExportExcel}
            className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Exportar Excel</span>
          </button>

          {/* Primary Action: Auto Generator */}
          <button
            onClick={onOpenGenerator}
            className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm shadow-indigo-300 transition-all cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>Gerar Escala</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center gap-2 border-t border-slate-100 overflow-x-auto">
        <button
          onClick={() => onSelectTab('matrix')}
          className={`py-2.5 px-3 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 border-b-2 transition-all cursor-pointer shrink-0 ${
            activeTab === 'matrix'
              ? 'border-indigo-600 text-indigo-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Visão Geral (Matriz Completa)</span>
        </button>

        <button
          onClick={() => onSelectTab('by_ddd')}
          className={`py-2.5 px-3 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 border-b-2 transition-all cursor-pointer shrink-0 ${
            activeTab === 'by_ddd'
              ? 'border-indigo-600 text-indigo-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <MapPin className="w-4 h-4" />
          <span>Visão por Região DDD</span>
        </button>

        <button
          onClick={() => onSelectTab('individual')}
          className={`py-2.5 px-3 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 border-b-2 transition-all cursor-pointer shrink-0 ${
            activeTab === 'individual'
              ? 'border-indigo-600 text-indigo-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          <span>Visão Individual do Técnico</span>
        </button>

        <button
          onClick={() => onSelectTab('audit')}
          className={`py-2.5 px-3 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 border-b-2 transition-all cursor-pointer shrink-0 ${
            activeTab === 'audit'
              ? 'border-indigo-600 text-indigo-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Auditoria & Conflitos</span>
          {hasIssues && (
            <span className="w-2 h-2 rounded-full bg-rose-500" />
          )}
        </button>
      </div>
    </header>
  );
};
