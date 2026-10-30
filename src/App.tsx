import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Technician,
  TechnicianSchedule,
  SchedulePeriod,
  OffRequest,
  ShiftType,
  GeneratorOptions,
  AppUser
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
import { LoginModal } from './components/LoginModal';
import { AdminPendingAlert } from './components/AdminPendingAlert';
import { supabase } from './supabase';

const STORAGE_KEY_TECHS = 'escalamaster_techs_v2';
const STORAGE_KEY_PERIOD = 'escalamaster_period_v2';
const STORAGE_KEY_SCHEDULE = 'escalamaster_schedule_v5';
const STORAGE_KEY_REQUESTS = 'escalamaster_requests_v2';
const STORAGE_KEY_USERS = 'escalamaster_users_v2';
const STORAGE_KEY_AUTH_USER = 'escalamaster_auth_user_v2';
const STORAGE_KEY_THEME = 'escalamaster_theme_v2';

export default function App() {
  // Dark Mode State (persisted to localStorage)
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_THEME);
      if (saved) return saved === 'dark';
    } catch (e) {
      console.error('Failed reading dark mode preference', e);
    }
    return false;
  });

  // Keep dark class on html / body in sync
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_THEME, darkMode ? 'dark' : 'light');
      if (darkMode) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    } catch (e) {
      console.error('Failed saving dark mode preference', e);
    }
  }, [darkMode]);

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

  // 3. User Accounts with PIN (Default 1234)
  const [users, setUsers] = useState<AppUser[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_USERS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error('Failed reading users from localStorage', e);
    }

    // Default accounts: 1 Admin + 1 for each Technician
    const adminUser: AppUser = {
      id: 'admin',
      name: 'Administrador / Gestor Geral',
      role: 'admin',
      pin: '1234',
      isFirstLogin: true
    };

    const techUsers: AppUser[] = INITIAL_TECHNICIANS.map(t => ({
      id: t.id,
      name: t.name,
      role: 'technician',
      pin: '1234',
      isFirstLogin: true,
      technicianId: t.id,
      ddd: t.ddd
    }));

    return [adminUser, ...techUsers];
  });

  // Keep users list in sync with any technician additions or removals
  useEffect(() => {
    setUsers(prevUsers => {
      const existingUserMap = new Map<string, AppUser>(prevUsers.map(u => [u.id, u]));

      const admin = existingUserMap.get('admin') || {
        id: 'admin',
        name: 'Administrador / Gestor Geral',
        role: 'admin',
        pin: '1234',
        isFirstLogin: true
      };

      const techUsers: AppUser[] = technicians.map(t => {
        const existing = existingUserMap.get(t.id);
        if (existing) {
          // Keep the existing user (and their password/PIN!)
          return {
            ...existing,
            name: t.name,
            ddd: t.ddd
          };
        }
        // New technician, default PIN
        return {
          id: t.id,
          name: t.name,
          role: 'technician',
          pin: '1234',
          isFirstLogin: true,
          technicianId: t.id,
          ddd: t.ddd
        };
      });

      return [admin, ...techUsers];
    });
    // Note: Initial sync and real-time updates are handled by Supabase
  }, [technicians]); // Removed setUsers dependency to prevent loops, but keep technicians as dependency

  // Current Logged In User
  const [currentUser, setCurrentUser] = useState<AppUser | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_AUTH_USER);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Failed reading auth user from localStorage', e);
    }
    return null; // Will show LoginModal on first visit
  });

  // 4. Off Requests State
  const [offRequests, setOffRequests] = useState<OffRequest[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_REQUESTS);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Failed reading requests from localStorage', e);
    }
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

  // 5. Generate Date Array for 2 Months
  const dates = useMemo(() => {
    return generateDateRange(period.startYear, period.startMonth, period.durationMonths);
  }, [period.startYear, period.startMonth, period.durationMonths]);

  // 6. Schedules State
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

    // Default initial generation
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

  // Active View Tab: For technicians, always 'individual'
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
      localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(users));
    } catch (e) {
      console.error('Failed to save users', e);
    }
  }, [users]);

  useEffect(() => {
    try {
      if (currentUser) {
        localStorage.setItem(STORAGE_KEY_AUTH_USER, JSON.stringify(currentUser));
      } else {
        localStorage.removeItem(STORAGE_KEY_AUTH_USER);
      }
    } catch (e) {
      console.error('Failed to save auth user', e);
    }
  }, [currentUser]);

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

  // Pending Off Requests
  const pendingRequests = useMemo(() => {
    return offRequests.filter(r => r.status === 'pendente');
  }, [offRequests]);

  // Real-time synchronization using Supabase for 100% real-time data sync across devices
  useEffect(() => {
    // 1. Fetch initial state
    const fetchData = async () => {
      try {
        // Fetch Off Requests
        const { data: folgas } = await supabase.from('solicitacoes_folga').select('*');
        if (folgas) setOffRequests(folgas);
        
        // Fetch Users
        const { data: usersData } = await supabase.from('usuarios').select('*');
        if (usersData) setUsers(usersData);

        // Fetch Global App Data (Schedules, Techs, Period)
        const { data: appData, error: appDataError } = await supabase
          .from('appData')
          .select('*')
          .eq('id', 'state')
          .maybeSingle();

        if (appData && !appDataError) {
          if (appData.technicians) setTechnicians(appData.technicians);
          if (appData.schedules) setSchedules(appData.schedules);
          if (appData.period) setPeriod(appData.period);
        }
      } catch (err) {
        console.error('Error fetching initial data from Supabase:', err);
      }
    };
    fetchData();

    // 2. Real-time subscription
    const channel = supabase.channel('realtime_sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'solicitacoes_folga' }, payload => {
        console.log('Folgas updated:', payload);
        fetchData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'usuarios' }, payload => {
        console.log('Users updated:', payload);
        fetchData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appData' }, payload => {
        console.log('App Data updated:', payload);
        fetchData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Save to Supabase helper
  const saveToSupabase = useCallback(async (table: string, data: any, id?: string) => {
    try {
      if (id) {
        await supabase.from(table).update(data).eq('id', id);
      } else {
        await supabase.from(table).upsert(data);
      }
    } catch (error) {
      console.error('Supabase error:', error);
    }
  }, []);


  // Admin Pending Requests Alert Modal
  const [isAdminAlertOpen, setIsAdminAlertOpen] = useState<boolean>(false);
  const [hasTriggeredInitialAlert, setHasTriggeredInitialAlert] = useState<boolean>(false);

  // Trigger alert when admin is active and there are pending requests
  useEffect(() => {
    if (currentUser?.role === 'admin' && pendingRequests.length > 0 && !hasTriggeredInitialAlert) {
      setIsAdminAlertOpen(true);
      setHasTriggeredInitialAlert(true);
    }
  }, [currentUser, pendingRequests.length, hasTriggeredInitialAlert]);

  // Handler: User Login
  const handleLogin = useCallback((user: AppUser) => {
    setCurrentUser(user);
    if (user.role === 'technician') {
      setActiveTab('individual');
    } else {
      setActiveTab('matrix');
      const pending = offRequests.filter(r => r.status === 'pendente');
      if (pending.length > 0) {
        setIsAdminAlertOpen(true);
        setHasTriggeredInitialAlert(true);
      }
    }
  }, [offRequests]);

  // Handler: User Logout
  const handleLogout = useCallback(() => {
    setCurrentUser(null);
    setHasTriggeredInitialAlert(false);
    setIsAdminAlertOpen(false);
  }, []);

  // Handler: Update User PIN
  const handleUpdateUserPin = useCallback((userId: string, newPin: string) => {
    setUsers(prev => {
      const updated = prev.map(u => (u.id === userId ? { ...u, pin: newPin, isFirstLogin: false } : u));
      saveToSupabase('usuarios', { pin: newPin, isFirstLogin: false }, userId);
      return updated;
    });
  }, [saveToSupabase]);

  // Handler: Admin Reset Technician PIN back to 1234
  const handleResetUserPin = useCallback((techId: string) => {
    setUsers(prev => {
      const updated = prev.map(u => (u.id === techId ? { ...u, pin: '1234', isFirstLogin: true } : u));
      saveToSupabase('usuarios', { pin: '1234', isFirstLogin: true }, techId);
      return updated;
    });
    alert('Senha resetada com sucesso para o padrão inicial: 1234');
  }, [saveToSupabase]);

  // Handler: Update a single shift cell
  const handleUpdateShift = useCallback((techId: string, date: string, shift: ShiftType, notes?: string) => {
    setSchedules(prev => {
      const currentTechSched = prev[techId] || { technicianId: techId, days: {} };
      const updatedDays = {
        ...currentTechSched.days,
        [date]: {
          date,
          shift,
          manualOverride: true,
          notes: notes !== undefined ? notes : currentTechSched.days[date]?.notes
        }
      };
      const updatedSchedules = {
        ...prev,
        [techId]: {
          ...currentTechSched,
          days: updatedDays
        }
      };
      saveToSupabase('appData', { schedules: updatedSchedules }, 'state');
      return updatedSchedules;
    });
  }, [saveToSupabase]);

  // Handler: Add Off Request
  const handleAddRequest = useCallback((req: Omit<OffRequest, 'id' | 'createdAt' | 'status'>) => {
    const newReq: OffRequest = {
      ...req,
      id: `req-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      createdAt: new Date().toISOString(),
      status: 'pendente'
    };
    setOffRequests(prev => {
      const updated = [...prev, newReq];
      saveToSupabase('solicitacoes_folga', newReq);
      return updated;
    });
    // Notify admin if logged in
    if (currentUser?.role === 'admin') {
      setIsAdminAlertOpen(true);
    }
  }, [currentUser, saveToSupabase]);

  // Handler: Admin Approves Off Request
  const handleApproveRequest = useCallback((id: string) => {
    setOffRequests(prevRequests => {
      const req = prevRequests.find(r => r.id === id);
      if (!req) return prevRequests;

      const updatedRequests: OffRequest[] = prevRequests.map(r => r.id === id ? { ...r, status: 'atendido' as const } : r);
      
      // Determine shift type based on day of week:
      const dObj = new Date(req.date + 'T12:00:00');
      const dow = dObj.getDay();
      const targetShift: ShiftType = (dow === 0 || dow === 6) ? 'FG' : 'FC';

      // Grant off on requested date
      handleUpdateShift(req.technicianId, req.date, targetShift, `Folga Aprovada: ${req.notes.join(' | ')}`);

      // Trigger save after state update
      saveToSupabase('solicitacoes_folga', { status: 'atendido' }, id);
      return updatedRequests;
    });
  }, [handleUpdateShift, saveToSupabase]);

  // Handler: Admin Rejects Off Request
  const handleRejectRequest = useCallback((id: string) => {
    setOffRequests(prev => {
      const updated: OffRequest[] = prev.map(r => r.id === id ? { ...r, status: 'recusado' as const } : r);
      saveToSupabase('solicitacoes_folga', { status: 'recusado' }, id);
      return updated;
    });
  }, [saveToSupabase]);

  // Handler: Delete Off Request
  const handleDeleteRequest = useCallback((id: string) => {
    setOffRequests(prev => {
      const updated: OffRequest[] = prev.filter(r => r.id !== id);
      supabase.from('solicitacoes_folga').delete().eq('id', id);
      return updated;
    });
  }, []);


  // Handler: Open Off Requests modal focused on a technician
  const handleOpenRequestsModal = (techId?: string) => {
    setSelectedTechForRequests(techId);
    setIsRequestsOpen(true);
  };

  // Handler: Clear Schedule
  const handleClearSchedule = useCallback(async () => {
    if (window.confirm('Deseja realmente apagar 100% da escala atual?')) {
      setSchedules({});
      await saveToSupabase('appData', { schedules: {} }, 'state');
      try {
        localStorage.removeItem(STORAGE_KEY_SCHEDULE);
      } catch (e) {
        console.error('Failed to clear schedule storage', e);
      }
      alert('Escala apagada 100% com sucesso!');
    }
  }, [saveToSupabase]);

  // Handler: Export Excel
  const handleExportExcel = () => {
    exportScheduleToExcel(technicians, schedules, dates, period, offRequests);
  };

  // Handler: Generate Schedule
  const handleGenerate = useCallback((options: GeneratorOptions, periodConfig: { startYear: number; startMonth: number }) => {
    // Generate new dates for the new period
    const newDates = generateDateRange(periodConfig.startYear, periodConfig.startMonth, period.durationMonths);
    
    // Update period state
    const newPeriod = {
      ...period,
      startYear: periodConfig.startYear,
      startMonth: periodConfig.startMonth,
      updatedAt: new Date().toISOString()
    };
    setPeriod(newPeriod);

    // Generate new schedule
    const newSchedule = generateSchedule(technicians, newDates, offRequests, options);
    setSchedules(newSchedule);
    
    // Save everything to Supabase
    saveToSupabase('appData', { 
      schedules: newSchedule,
      period: newPeriod
    }, 'state');
    
    setIsGeneratorOpen(false);
    alert('Escala gerada com sucesso para o novo período!');
  }, [technicians, offRequests, period, saveToSupabase]);

  const isAdmin = currentUser?.role === 'admin';

  // Handler: Save all changes to Supabase
  const handleSave = useCallback(() => {
    saveToSupabase('appData', {
      technicians,
      users,
      offRequests,
      schedules,
      period
    }, 'state');
    alert('Escala e solicitações salvas com sucesso no Supabase!');
  }, [technicians, users, offRequests, schedules, period, saveToSupabase]);

  // Handler: Update Technicians List
  const handleUpdateTechnicians = useCallback((updated: Technician[]) => {
    setTechnicians(updated);
    saveToSupabase('appData', { technicians: updated }, 'state');
  }, [saveToSupabase]);

  return (
    <div className={`min-h-screen flex flex-col font-sans transition-colors duration-200 ${
      darkMode ? 'dark bg-slate-950 text-slate-100' : 'bg-slate-100 text-slate-800'
    }`}>
      {/* Top Header & Navigation */}
      <Header
        period={period}
        auditResult={auditResult}
        offRequestsCount={offRequests.length}
        pendingRequestsCount={pendingRequests.length}
        activeTab={activeTab}
        currentUser={currentUser}
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode(prev => !prev)}
        onSelectTab={setActiveTab}
        onOpenGenerator={() => setIsGeneratorOpen(true)}
        onOpenRequests={() => handleOpenRequestsModal()}
        onOpenTeam={() => setIsTeamOpen(true)}
        onOpenWhatsApp={() => setIsWhatsAppOpen(true)}
        onExportExcel={handleExportExcel}
        onLogout={handleLogout}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6">

        {/* Prominent Pending Requests Alert Banner for Admin */}
        {isAdmin && pendingRequests.length > 0 && (
          <div className={`mb-5 p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm transition-all ${
            darkMode
              ? 'bg-amber-950/40 border-amber-800/80 text-amber-200'
              : 'bg-amber-50 border-amber-300 text-amber-900'
          }`}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold text-lg shrink-0 shadow-sm animate-pulse">
                🔔
              </div>
              <div>
                <h4 className="font-bold text-sm sm:text-base flex items-center gap-2">
                  <span>Atenção Administrador: {pendingRequests.length} Solicitação(ões) de Folga Pendente(s)</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 font-black">
                    Ação Necessária
                  </span>
                </h4>
                <p className={`text-xs mt-0.5 ${darkMode ? 'text-amber-300/80' : 'text-amber-800'}`}>
                  Colaboradores enviaram pedidos de folga que aguardam sua aprovação para entrarem na escala oficial.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
              <button
                onClick={() => setIsAdminAlertOpen(true)}
                className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold rounded-xl text-xs cursor-pointer shadow-sm transition-colors"
              >
                Revisar Agora ({pendingRequests.length})
              </button>
              <button
                onClick={() => handleOpenRequestsModal()}
                className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
                  darkMode
                    ? 'border-amber-700/80 hover:bg-amber-900/40 text-amber-300'
                    : 'border-amber-300 hover:bg-amber-100 text-amber-900'
                }`}
              >
                Ver Todas
              </button>
            </div>
          </div>
        )}

        {/* If user is a technician, they strictly see only their individual view! */}
        {!isAdmin && (
          <TechnicianView
            technicians={technicians}
            schedules={schedules}
            dates={dates}
            period={period}
            auditResult={auditResult}
            offRequests={offRequests}
            currentUser={currentUser}
            onAddRequest={handleAddRequest}
            onUpdateShift={handleUpdateShift}
            onOpenRequestsModal={handleOpenRequestsModal}
          />
        )}

        {/* If user is Admin, they have access to the selected tab */}
        {isAdmin && (
          <>
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
                onClearSchedule={handleClearSchedule}
                onSave={handleSave}
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
                currentUser={currentUser}
                onAddRequest={handleAddRequest}
                onUpdateShift={handleUpdateShift}
                onOpenRequestsModal={handleOpenRequestsModal}
                onSave={handleSave}
              />
            )}

            {activeTab === 'audit' && (
              <ValidationReport
                auditResult={auditResult}
                technicians={technicians}
                onOpenGenerator={() => setIsGeneratorOpen(true)}
              />
            )}
          </>
        )}
      </main>

      {/* Admin Startup Alert for Pending Requests */}
      <AdminPendingAlert
        isOpen={isAdminAlertOpen && isAdmin}
        onClose={() => setIsAdminAlertOpen(false)}
        pendingRequests={pendingRequests}
        technicians={technicians}
        onApprove={handleApproveRequest}
        onReject={handleRejectRequest}
        onOpenAllRequests={() => {
          setIsAdminAlertOpen(false);
          setIsRequestsOpen(true);
        }}
        darkMode={darkMode}
      />

      {/* Login Modal (Required on first visit or logout) */}
      <LoginModal
        isOpen={currentUser === null}
        users={users}
        technicians={technicians}
        onLogin={handleLogin}
        onUpdateUserPin={handleUpdateUserPin}
      />

      {/* Modals */}
      <GeneratorModal
        isOpen={isGeneratorOpen && isAdmin}
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
        currentUser={currentUser}
        onAddRequest={handleAddRequest}
        onDeleteRequest={handleDeleteRequest}
        onApproveRequest={handleApproveRequest}
        onRejectRequest={handleRejectRequest}
        schedules={schedules}
      />

      <TeamManagementModal
        isOpen={isTeamOpen && isAdmin}
        onClose={() => setIsTeamOpen(false)}
        technicians={technicians}
        onUpdateTechnicians={handleUpdateTechnicians}
        onResetUserPin={handleResetUserPin}
      />

      <WhatsAppModal
        isOpen={isWhatsAppOpen}
        onClose={() => setIsWhatsAppOpen(false)}
        technicians={technicians}
        schedules={schedules}
        dates={dates}
        period={period}
        offRequests={offRequests}
        currentUser={currentUser}
      />
    </div>
  );
}
