import React from 'react';
import { SchedulePeriod, AppUser } from '../types';
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
  ClipboardList,
  LogOut,
  User as UserIcon,
  Shield,
  Moon,
  Sun,
  Bell,
  BarChart3,
  Eye,
  FileText
} from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton';

interface HeaderProps {
  period: SchedulePeriod;
  auditResult: AuditResult;
  offRequestsCount: number;
  pendingRequestsCount?: number;
  activeTab: 'matrix' | 'by_ddd' | 'individual' | 'audit' | 'whatsapp_push' | 'analytics';
  currentUser: AppUser | null;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  onSelectTab: (tab: 'matrix' | 'by_ddd' | 'individual' | 'audit' | 'whatsapp_push' | 'analytics') => void;
  onOpenGenerator: () => void;
  onOpenRequests: () => void;
  onOpenTeam: () => void;
  onOpenWhatsApp: () => void;
  onOpenAtestado?: () => void;
  onExportExcel: () => void;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  period,
  auditResult,
  offRequestsCount,
  pendingRequestsCount = 0,
  activeTab,
  currentUser,
  darkMode,
  onToggleDarkMode,
  onSelectTab,
  onOpenGenerator,
  onOpenRequests,
  onOpenTeam,
  onOpenWhatsApp,
  onOpenAtestado,
  onExportExcel,
  onLogout
}) => {
  const nextMonth = (period.startMonth + 1) % 12;
  const startYear = period.startYear;
  const nextYear = period.startMonth === 11 ? startYear + 1 : startYear;

  const periodLabel = period.durationMonths === 1
    ? `${MONTHS_PT[period.startMonth]} de ${startYear}`
    : `${MONTHS_PT[period.startMonth]} e ${MONTHS_PT[nextMonth]} de ${startYear === nextYear ? startYear : `${startYear}/${nextYear}`}`;
  const isAdmin = currentUser?.role === 'admin';
  const isViewer = currentUser?.role === 'viewer';
  const isTechnician = currentUser?.role === 'technician';
  const hasIssues = auditResult.issues.length > 0;

  return (
    <header className={`sticky top-0 z-40 transition-colors duration-200 border-b ${
      darkMode
        ? 'bg-slate-900 border-slate-800 text-white shadow-md'
        : 'bg-white border-slate-200 text-slate-900 shadow-xs'
    }`}>
      {/* Top Navbar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
        {/* App Title & Period */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 shrink-0">
            <Calendar className="w-5 h-5 text-white" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className={`text-base sm:text-lg font-black tracking-tight ${
                darkMode ? 'text-white' : 'text-slate-900'
              }`}>
                Escala Técnico Remoto <span className="text-indigo-500 font-extrabold">São Paulo Interior</span>
              </h1>
            </div>
            <div className={`flex items-center gap-2 text-xs mt-0.5 ${
              darkMode ? 'text-slate-400' : 'text-slate-500'
            }`}>
              <span className="font-medium">Período:</span>
              <strong className={darkMode ? 'text-slate-200' : 'text-slate-800'}>{periodLabel}</strong>
              <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border ${
                darkMode
                  ? 'bg-indigo-950/70 text-indigo-300 border-indigo-800/80'
                  : 'bg-indigo-50 text-indigo-700 border-indigo-200'
              }`}>
                DDDs 13, 14, 15 e 19
              </span>
              <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border ${
                period.regime === '5x2'
                  ? darkMode
                    ? 'bg-emerald-950/70 text-emerald-300 border-emerald-800'
                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : darkMode
                    ? 'bg-blue-950/70 text-blue-300 border-blue-800'
                    : 'bg-blue-50 text-blue-700 border-blue-200'
              }`}>
                {period.regime === '5x2' ? 'Escala 5x2' : 'Escala 6x1'}
              </span>
            </div>
          </div>
        </div>


        {/* User identification badge and Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* User Profile Badge */}
          <div className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 ${
            isAdmin
              ? darkMode
                ? 'bg-purple-950/60 text-purple-200 border-purple-800'
                : 'bg-purple-50 text-purple-900 border-purple-200'
              : isViewer
              ? darkMode
                ? 'bg-blue-950/60 text-blue-200 border-blue-800'
                : 'bg-blue-50 text-blue-900 border-blue-200'
              : darkMode
                ? 'bg-indigo-950/60 text-indigo-200 border-indigo-800'
                : 'bg-indigo-50 text-indigo-900 border-indigo-200'
          }`}>
            {isAdmin ? (
              <Shield className="w-3.5 h-3.5 text-purple-400" />
            ) : isViewer ? (
              <Eye className="w-3.5 h-3.5 text-blue-500" />
            ) : (
              <UserIcon className="w-3.5 h-3.5 text-indigo-400" />
            )}
            <span className="truncate max-w-[170px]">
              {isAdmin ? 'Administrador' : currentUser?.name}
            </span>
            {isViewer && (
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                darkMode ? 'bg-blue-900 text-blue-200' : 'bg-blue-200 text-blue-900'
              }`}>
                Visualizador
              </span>
            )}
            {currentUser?.ddd && (
              <span className={`text-[10px] px-1.5 rounded-full font-bold ${
                darkMode ? 'bg-indigo-800 text-indigo-100' : 'bg-indigo-200 text-indigo-900'
              }`}>
                DDD {currentUser.ddd}
              </span>
            )}
          </div>

          {/* Admin Controls */}
          {isAdmin && (
            <>
              {/* Audit Score Badge */}
              <button
                onClick={() => onSelectTab('audit')}
                className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  auditResult.score >= 90
                    ? darkMode
                      ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800 hover:bg-emerald-900/80'
                      : 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                    : darkMode
                      ? 'bg-rose-950/60 text-rose-300 border-rose-800 hover:bg-rose-900/80'
                      : 'bg-rose-50 text-rose-800 border-rose-300 hover:bg-rose-100'
                }`}
                title="Auditoria de conformidade legal"
              >
                {auditResult.score >= 90 ? (
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-rose-500 animate-pulse" />
                )}
                <span>{auditResult.score}%</span>
              </button>

              {/* Off Requests Trigger */}
              <button
                onClick={onOpenRequests}
                className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer relative ${
                  pendingRequestsCount > 0
                    ? darkMode
                      ? 'bg-amber-950/60 text-amber-300 border-amber-700 animate-pulse'
                      : 'bg-amber-50 text-amber-900 border-amber-300 animate-pulse'
                    : darkMode
                      ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                }`}
                title={pendingRequestsCount > 0 ? `${pendingRequestsCount} solicitações pendentes de análise` : 'Ver pedidos de folga'}
              >
                <ClipboardList className={`w-3.5 h-3.5 ${pendingRequestsCount > 0 ? 'text-amber-500' : 'text-indigo-500'}`} />
                <span>Pedidos</span>
                {pendingRequestsCount > 0 ? (
                  <span className="w-4 h-4 rounded-full bg-amber-500 text-slate-900 text-[10px] font-black flex items-center justify-center">
                    {pendingRequestsCount}
                  </span>
                ) : offRequestsCount > 0 ? (
                  <span className="w-4 h-4 rounded-full bg-indigo-600 text-white text-[10px] font-bold flex items-center justify-center">
                    {offRequestsCount}
                  </span>
                ) : null}
              </button>

              {/* Team Management */}
              <button
                onClick={onOpenTeam}
                className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  darkMode
                    ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                }`}
              >
                <Users className="w-3.5 h-3.5 text-slate-400" />
                <span>Equipe</span>
              </button>

              {/* WhatsApp Broadcast */}
              <button
                onClick={onOpenWhatsApp}
                className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  darkMode
                    ? 'bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 border-emerald-800'
                    : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5 text-emerald-500" />
                <span>WhatsApp</span>
              </button>

              {/* Excel Export */}
              <button
                onClick={onExportExcel}
                className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  darkMode
                    ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                }`}
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />
                <span>Excel</span>
              </button>

              {/* Auto Generator */}
              <button
                onClick={onOpenGenerator}
                className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm shadow-indigo-500/20 transition-all cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>Gerar Escala</span>
              </button>
            </>
          )}

          {/* Technician Controls (Strictly for Technicians) */}
          {isTechnician && (
            <>
              <button
                onClick={onOpenRequests}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                <ClipboardList className="w-3.5 h-3.5 text-amber-300" />
                <span>Solicitar Folga</span>
              </button>

              {onOpenAtestado && (
                <button
                  onClick={onOpenAtestado}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    darkMode
                      ? 'bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border-rose-800'
                      : 'bg-rose-50 hover:bg-rose-100 text-rose-800 border-rose-200'
                  }`}
                  title="Anexar Atestado Médico para análise do Administrador"
                >
                  <FileText className="w-3.5 h-3.5 text-rose-500" />
                  <span>Anexo Atestado</span>
                </button>
              )}

              <button
                onClick={onOpenWhatsApp}
                className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  darkMode
                    ? 'bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 border-emerald-800'
                    : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5 text-emerald-500" />
                <span>Meu WhatsApp</span>
              </button>
            </>
          )}

          {/* PWA INSTALL BUTTON */}
          <PWAInstallButton />

          {/* DARK MODE TOGGLE BUTTON */}
          <button
            onClick={onToggleDarkMode}
            className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs ${
              darkMode
                ? 'bg-slate-800 text-amber-400 border-slate-700 hover:bg-slate-700 hover:border-slate-600'
                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
            }`}
            title={darkMode ? 'Alternar para Modo Claro (fundo branco)' : 'Alternar para Modo Noturno (fundo preto)'}
          >
            {darkMode ? (
              <>
                <Sun className="w-4 h-4 text-amber-400" />
                <span className="hidden sm:inline">Modo Claro</span>
              </>
            ) : (
              <>
                <Moon className="w-4 h-4 text-indigo-600" />
                <span className="hidden sm:inline">Modo Noturno</span>
              </>
            )}
          </button>

          {/* Logout / Switch User */}
          <button
            onClick={onLogout}
            className={`p-1.5 rounded-xl border transition-colors ml-1 cursor-pointer ${
              darkMode
                ? 'text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 border-slate-700'
                : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50 border-slate-200'
            }`}
            title="Sair / Trocar de Usuário"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Navigation Tabs - Abbreviated & formatted for clean fit without cutoffs */}
      {isAdmin && (
        <div className={`max-w-7xl mx-auto px-4 sm:px-6 py-2 border-t overflow-x-auto ${
          darkMode ? 'border-slate-800' : 'border-slate-100'
        }`}>
          <div className="flex items-center gap-1.5 flex-nowrap min-w-max sm:min-w-0">
            <button
              onClick={() => onSelectTab('matrix')}
              className={`py-1.5 px-3 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'matrix'
                  ? 'bg-indigo-600 text-white shadow-xs font-extrabold'
                  : darkMode
                  ? 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
              }`}
              title="Visão Geral - Matriz Completa da Escala"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Matriz Completa</span>
            </button>

            <button
              onClick={() => onSelectTab('by_ddd')}
              className={`py-1.5 px-3 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'by_ddd'
                  ? 'bg-indigo-600 text-white shadow-xs font-extrabold'
                  : darkMode
                  ? 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
              }`}
              title="Escala dividida por Região DDD (13, 14, 15 e 19)"
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>Região DDD</span>
            </button>

            <button
              onClick={() => onSelectTab('individual')}
              className={`py-1.5 px-3 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'individual'
                  ? 'bg-indigo-600 text-white shadow-xs font-extrabold'
                  : darkMode
                  ? 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
              }`}
              title="Visão e calendário individual do técnico"
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Individual Técnico</span>
            </button>

            <button
              onClick={() => onSelectTab('audit')}
              className={`py-1.5 px-3 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'audit'
                  ? 'bg-indigo-600 text-white shadow-xs font-extrabold'
                  : darkMode
                  ? 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
              }`}
              title="Auditoria de conformidade: falhas de 7 dias e conflitos de folga"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Auditoria</span>
              {hasIssues && (
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
              )}
            </button>

            <button
              onClick={() => onSelectTab('whatsapp_push')}
              className={`py-1.5 px-3 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'whatsapp_push'
                  ? 'bg-emerald-600 text-white shadow-xs font-extrabold'
                  : darkMode
                  ? 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
              }`}
              title="Notificações WhatsApp enviadas 24h antes da folga"
            >
              <Bell className="w-3.5 h-3.5 text-emerald-500" />
              <span>WhatsApp (24h)</span>
            </button>

            <button
              onClick={() => onSelectTab('analytics')}
              className={`py-1.5 px-3 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'analytics'
                  ? 'bg-indigo-600 text-white shadow-xs font-extrabold'
                  : darkMode
                  ? 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
              }`}
              title="Painel e Dashboard com gráficos e análises"
            >
              <BarChart3 className="w-3.5 h-3.5 text-indigo-400" />
              <span>Dashboard & Análises</span>
            </button>
          </div>
        </div>
      )}

      {/* Navigation Tabs - STRICTLY for Viewer (William Rosalini Laiate) */}
      {isViewer && (
        <div className={`max-w-7xl mx-auto px-4 sm:px-6 py-2 flex items-center gap-2 border-t overflow-x-auto ${
          darkMode ? 'border-slate-800' : 'border-slate-100'
        }`}>
          <button
            onClick={() => onSelectTab('analytics')}
            className={`py-1.5 px-3 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'analytics'
                ? 'bg-indigo-600 text-white shadow-xs font-extrabold'
                : darkMode
                ? 'text-slate-300 hover:bg-slate-800'
                : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5 text-indigo-400" />
            <span>Dashboard & Análises</span>
          </button>

          <button
            onClick={() => onSelectTab('matrix')}
            className={`py-1.5 px-3 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'matrix'
                ? 'bg-indigo-600 text-white shadow-xs font-extrabold'
                : darkMode
                ? 'text-slate-300 hover:bg-slate-800'
                : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Matriz Completa</span>
          </button>
        </div>
      )}
    </header>
  );
};
