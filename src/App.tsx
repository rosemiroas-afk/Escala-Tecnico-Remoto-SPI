import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Technician,
  TechnicianSchedule,
  SchedulePeriod,
  OffRequest,
  ShiftType,
  GeneratorOptions
} from './types';
import { INITIAL_TECHNICIANS } from './data/defaultTechnicians';
import { generateDateRange, MONTHS_PT } from './utils/dateUtils';
import { generateSchedule } from './utils/scheduler';
import { validateSchedule } from './utils/validator';
import { exportScheduleToExcel } from './utils/exportUtils';
import { Header } from './components/Header';
import { RosterTable } from './components/RosterTable';
import { DDDView } from './components/DDDView';
import { TechnicianView } from './components/TechnicianView';
import { ValidationReport } from './components/ValidationReport';
import { GeneratorModal } from './components/GeneratorModal';
import { OffRequestsModal } from './components/OffRequestsModal';
import { TeamManagementModal } from './components/TeamManagementModal';
import { WhatsAppModal } from './components/WhatsAppModal';

const STORAGE_KEY_TECHS = 'escalamaster_techs_v1';
const STORAGE_KEY_PERIOD = 'escalamaster_period_v1';
const STORAGE_KEY_SCHEDULE = 'escalamaster_schedule_v1';
const STORAGE_KEY_REQUESTS = 'escalamaster_requests_v1';

export default function App() {
  // 1. Period State: Defaults to November + December 2026
  const [period, setPeriod] = useState<SchedulePeriod>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_PERIOD);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Failed reading period from localStorage', e);
    }
    return {
      id: 'period-nov-dez-2026',
      name: 'Novembro e Dezembro de 2026',
      startMonth: 10, // November (0-indexed)
      startYear: 2026,
      durationMonths: 2,
      startDate: '2026-11-01',
      endDate: '2026-12-31',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  });

  // 2. Technicians State
  const [technicians, setTechnicians] = useState<Technician[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_TECHS);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Failed reading techs from localStorage', e);
    }
    return INITIAL_TECHNICIANS;
  });

  // 3. Off Requests State
  const [offRequests, setOffRequests] = useState<OffRequest[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_REQUESTS);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Failed reading requests from localStorage', e);
    }
    // Pre-populate with realistic example requested in the brief: Casamento, compromisso
    return [
      {
        id: 'req-sample-1',
        technicianId: 'tech-13-1', // AYRTON CESAR
        date: '2026-11-14',
        reasonCategory: 'casamento',
        notes: ['Casamento de familiar', 'Necessita folga no sábado'],
        priority: 'alta',
        createdAt: new Date().toISOString(),
        status: 'atendido'
      },
      {
        id: 'req-sample-2',
        technicianId: 'tech-19-1', // ANDRE LUIZ
        date: '2026-11-21',
        reasonCategory: 'pessoal',
        notes: ['Compromisso familiar agendado'],
        priority: 'media',
        createdAt: new Date().toISOString(),
        status: 'atendido'
      }
    ];
  });

  // 4. Generate Date Array for 2 Months
  const dates = useMemo(() => {
    return generateDateRange(period.startYear, period.startMonth, period.durationMonths);
  }, [period.startYear, period.startMonth, period.durationMonths]);

  // 5. Schedules State
  const [schedules, setSchedules] = useState<Record<string, TechnicianSchedule>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SCHEDULE);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Object.keys(parsed).length > 0) return parsed;
      }
    } catch (e) {
      console.error('Failed reading schedules from localStorage', e);
    }

    // Default: generate fresh initial schedule honoring all user rules
    const initialDates = generateDateRange(2026, 10, 2);
    const initialReqs: OffRequest[] = [
      {
        id: 'req-sample-1',
        technicianId: 'tech-13-1',
        date: '2026-11-14',
        reasonCategory: 'casamento',
        notes: ['Casamento de familiar'],
        priority: 'alta',
        createdAt: new Date().toISOString(),
        status: 'atendido'
      }
    ];

    return generateSchedule(INITIAL_TECHNICIANS, initialDates, initialReqs, {
      ensureDoubleWeekend: true,
      targetDoubleWeekendsPerTech: 1,
      targetInversionsPerTech: 2,
      maxConsecutiveWorkDays: 6,
      prioritizeOffRequests: true,
      balanceDDDCoverage: true
    });
  });

  // Active View Tab
  const [activeTab, setActiveTab] = useState<'matrix' | 'by_ddd' | 'individual' | 'audit'>('matrix');

  // Modals
  const [isGeneratorOpen, setIsGeneratorOpen] = useState(false);
  const [isRequestsOpen, setIsRequestsOpen] = useState(false);
  const [isTeamOpen, setIsTeamOpen] = useState(false);
  const [isWhatsAppOpen, setIsWhatsAppOpen] = useState(false);
  const [selectedTechForRequests, setSelectedTechForRequests] = useState<string | undefined>(undefined);

  // Persistence Effects
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_TECHS, JSON.stringify(technicians));
    } catch (e) {
      console.error('Failed to save techs', e);
    }
  }, [technicians]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_PERIOD, JSON.stringify(period));
    } catch (e) {
      console.error('Failed to save period', e);
    }
  }, [period]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_REQUESTS, JSON.stringify(offRequests));
    } catch (e) {
      console.error('Failed to save requests', e);
    }
  }, [offRequests]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_SCHEDULE, JSON.stringify(schedules));
    } catch (e) {
      console.error('Failed to save schedules', e);
    }
  }, [schedules]);

  // Real-time Validation Audit
  const auditResult = useMemo(() => {
    return validateSchedule(technicians, schedules, dates, offRequests);
  }, [technicians, schedules, dates, offRequests]);

  // Handler: Update a single shift cell
  const handleUpdateShift = useCallback((techId: string, date: string, shift: ShiftType, notes?: string) => {
    setSchedules(prev => {
      const currentTechSched = prev[techId] || { technicianId: techId, days: {} };
      return {
        ...prev,
        [techId]: {
          ...currentTechSched,
          days: {
            ...currentTechSched.days,
            [date]: {
              date,
              shift,
              manualOverride: true,
              notes: notes !== undefined ? notes : currentTechSched.days[date]?.notes
            }
          }
        }
      };
    });
  }, []);

  // Handler: Run Generator
  const handleGenerate = useCallback((options: GeneratorOptions, periodConfig: { startYear: number; startMonth: number }) => {
    const nextM = (periodConfig.startMonth + 1) % 12;
    const nextY = periodConfig.startMonth === 11 ? periodConfig.startYear + 1 : periodConfig.startYear;
    const newPeriod: SchedulePeriod = {
      ...period,
      startYear: periodConfig.startYear,
      startMonth: periodConfig.startMonth,
      name: `${MONTHS_PT[periodConfig.startMonth]} e ${MONTHS_PT[nextM]} de ${periodConfig.startYear === nextY ? periodConfig.startYear : `${periodConfig.startYear}/${nextY}`}`,
      updatedAt: new Date().toISOString()
    };
    setPeriod(newPeriod);

    const newDates = generateDateRange(periodConfig.startYear, periodConfig.startMonth, 2);
    const newSchedule = generateSchedule(technicians, newDates, offRequests, options);
    setSchedules(newSchedule);
  }, [period, technicians, offRequests]);

  // Handler: Add Off Request
  const handleAddRequest = useCallback((req: Omit<OffRequest, 'id' | 'createdAt' | 'status'>) => {
    const newReq: OffRequest = {
      ...req,
      id: `req-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      createdAt: new Date().toISOString(),
      status: 'pendente'
    };
    setOffRequests(prev => [...prev, newReq]);

    // Automatically assign off on that day
    handleUpdateShift(req.technicianId, req.date, 'F', req.notes.join(' | '));
  }, [handleUpdateShift]);

  // Handler: Delete Off Request
  const handleDeleteRequest = useCallback((id: string) => {
    setOffRequests(prev => prev.filter(r => r.id !== id));
  }, []);

  // Handler: Open Off Requests modal focused on a technician
  const handleOpenRequestsModal = (techId?: string) => {
    setSelectedTechForRequests(techId);
    setIsRequestsOpen(true);
  };

  // Handler: Export Excel
  const handleExportExcel = () => {
    exportScheduleToExcel(technicians, schedules, dates, period, offRequests);
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans text-slate-800">
      {/* Top Header & Navigation */}
      <Header
        period={period}
        auditResult={auditResult}
        offRequestsCount={offRequests.length}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onOpenGenerator={() => setIsGeneratorOpen(true)}
        onOpenRequests={() => handleOpenRequestsModal()}
        onOpenTeam={() => setIsTeamOpen(true)}
        onOpenWhatsApp={() => setIsWhatsAppOpen(true)}
        onExportExcel={handleExportExcel}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6">
        {activeTab === 'matrix' && (
          <RosterTable
            technicians={technicians}
            schedules={schedules}
            dates={dates}
            period={period}
            auditResult={auditResult}
            offRequests={offRequests}
            onUpdateShift={handleUpdateShift}
            onOpenRequests={handleOpenRequestsModal}
          />
        )}

        {activeTab === 'by_ddd' && (
          <DDDView
            technicians={technicians}
            schedules={schedules}
            dates={dates}
            period={period}
            auditResult={auditResult}
          />
        )}

        {activeTab === 'individual' && (
          <TechnicianView
            technicians={technicians}
            schedules={schedules}
            dates={dates}
            period={period}
            auditResult={auditResult}
            offRequests={offRequests}
            onAddRequest={handleAddRequest}
            onUpdateShift={handleUpdateShift}
          />
        )}

        {activeTab === 'audit' && (
          <ValidationReport
            auditResult={auditResult}
            technicians={technicians}
            onOpenGenerator={() => setIsGeneratorOpen(true)}
          />
        )}
      </main>

      {/* Modals */}
      <GeneratorModal
        isOpen={isGeneratorOpen}
        onClose={() => setIsGeneratorOpen(false)}
        onGenerate={handleGenerate}
        currentPeriod={period}
      />

      <OffRequestsModal
        isOpen={isRequestsOpen}
        onClose={() => setIsRequestsOpen(false)}
        technicians={technicians}
        dates={dates}
        requests={offRequests}
        onAddRequest={handleAddRequest}
        onDeleteRequest={handleDeleteRequest}
        schedules={schedules}
      />

      <TeamManagementModal
        isOpen={isTeamOpen}
        onClose={() => setIsTeamOpen(false)}
        technicians={technicians}
        onUpdateTechnicians={setTechnicians}
      />

      <WhatsAppModal
        isOpen={isWhatsAppOpen}
        onClose={() => setIsWhatsAppOpen(false)}
        technicians={technicians}
        schedules={schedules}
        dates={dates}
        period={period}
        offRequests={offRequests}
      />
    </div>
  );
}
