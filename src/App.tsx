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
import { OFFICIAL_TECHNICIANS, OFFICIAL_SHIFTS_BY_TECH_NAME } from './data/officialScheduleNovDez';
import { generateDateRange, MONTHS_PT } from './utils/dateUtils';
import { generateSchedule } from './utils/scheduler';
import { validateSchedule } from './utils/validator';
import { exportScheduleToExcel } from './utils/exportUtils';
import { parseScheduleLongCsv, normalizeName } from './utils/csvScheduleParser';
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
import { PendingRequestsNotificationWidget } from './components/PendingRequestsNotificationWidget';
import { WhatsAppPushAlertWidget } from './components/WhatsAppPushAlertWidget';
import { AnalyticsDashboard } from './components/AnalyticsDashboard';
import { supabase } from './supabase';

const STORAGE_KEY_TECHS = 'escalamaster_techs_v4';
const STORAGE_KEY_PERIOD = 'escalamaster_period_v2';
const STORAGE_KEY_SCHEDULE = 'escalamaster_schedule_v6';
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

  // 2. Technicians State: Loaded and synchronized with official list
  const [technicians, setTechnicians] = useState<Technician[]>(() => {
    const officialMapById = new Map<string, Technician>(OFFICIAL_TECHNICIANS.map(t => [t.id, t]));
    try {
      const saved = localStorage.getItem(STORAGE_KEY_TECHS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const updated = parsed.map((t: Technician) => {
            const official = officialMapById.get(t.id);
            if (official) {
              return {
                ...t,
                name: official.name,
                ddd: official.ddd,
                phone: official.phone,
                shiftHours: official.shiftHours
              };
            }
            return t;
          });
          return [...updated].sort((a: Technician, b: Technician) => a.name.localeCompare(b.name, 'pt-BR'));
        }
      }
    } catch (e) {
      console.error('Failed reading techs from localStorage', e);
    }
    return [...OFFICIAL_TECHNICIANS].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  });

  // 3. User Accounts with PIN (Default 1234)
  const [users, setUsers] = useState<AppUser[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_USERS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const hasWilliam = parsed.some((u: any) => u.id === 'william-laiate');
          if (!hasWilliam) {
            parsed.push({
              id: 'william-laiate',
              name: 'William Rosalini Laiate',
              role: 'viewer',
              pin: '1234',
              primeiro_acesso: true,
              isFirstLogin: true
            });
          }
          return parsed;
        }
      }
    } catch (e) {
      console.error('Failed reading users from localStorage', e);
    }

    // Default accounts: 1 Admin + William Rosalini Laiate (Viewer) + 1 for each Technician
    const adminUser: AppUser = {
      id: 'admin',
      name: 'Administrador / Gestor Geral',
      role: 'admin',
      pin: '1234',
      isFirstLogin: true
    };

    const williamUser: AppUser = {
      id: 'william-laiate',
      name: 'William Rosalini Laiate',
      role: 'viewer',
      pin: '1234',
      primeiro_acesso: true,
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

    return [adminUser, williamUser, ...techUsers];
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

      const william = existingUserMap.get('william-laiate') || {
        id: 'william-laiate',
        name: 'William Rosalini Laiate',
        role: 'viewer',
        pin: '1234',
        primeiro_acesso: true,
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

      return [admin, william, ...techUsers];
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

  // Helper to generate complete official schedule for all 19 technicians
  const getOfficialScheduleMap = (): Record<string, TechnicianSchedule> => {
    const officialSched: Record<string, TechnicianSchedule> = {};
    for (const tech of OFFICIAL_TECHNICIANS) {
      const techShifts = OFFICIAL_SHIFTS_BY_TECH_NAME[tech.id] ||
                         OFFICIAL_SHIFTS_BY_TECH_NAME[tech.name] ||
                         OFFICIAL_SHIFTS_BY_TECH_NAME[tech.name.toUpperCase()] ||
                         {};
      officialSched[tech.id] = { technicianId: tech.id, days: {} };
      for (const [dateStr, shiftCode] of Object.entries(techShifts)) {
        officialSched[tech.id].days[dateStr] = {
          date: dateStr,
          shift: shiftCode,
          manualOverride: true,
          notes: tech.shiftHours
        };
      }
    }
    return officialSched;
  };

  // 5. Generate Date Array for 2 Months
  const dates = useMemo(() => {
    return generateDateRange(period.startYear, period.startMonth, period.durationMonths);
  }, [period.startYear, period.startMonth, period.durationMonths]);

  // 6. Schedules State
  const [schedules, setSchedules] = useState<Record<string, TechnicianSchedule>>(() => {
    const officialSched = getOfficialScheduleMap();
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SCHEDULE);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Object.keys(parsed).length > 0) {
          const merged = { ...officialSched };
          for (const [techId, techSched] of Object.entries(parsed)) {
            if (techSched && (techSched as any).days && Object.keys((techSched as any).days).length > 0) {
              merged[techId] = techSched as any;
            }
          }
          return merged;
        }
      }
    } catch (e) {
      console.error('Failed reading schedules from localStorage', e);
    }
    return officialSched;
  });

  // Active View Tab: For technicians, always 'individual'
  const [activeTab, setActiveTab] = useState<'matrix' | 'by_ddd' | 'individual' | 'audit' | 'whatsapp_push' | 'analytics'>('matrix');

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

  // Normalize folga records from Supabase
  const normalizeFolga = useCallback((row: any): OffRequest => ({
    id: String(row.id || `req-${Date.now()}`),
    technicianId: String(row.id_usuario || row.technicianId || row.technician_id || ''),
    date: String(row.data_desejada || row.date || ''),
    reasonCategory: (row.motivo || row.reasonCategory || 'pessoal') as any,
    notes: Array.isArray(row.notes)
      ? row.notes
      : typeof row.observacoes === 'string'
      ? row.observacoes.split(' | ').filter(Boolean)
      : Array.isArray(row.observacoes)
      ? row.observacoes
      : [row.motivo || row.observacoes || row.notes || 'Solicitação de folga'],
    priority: (row.priority || 'alta') as any,
    createdAt: row.created_at || row.createdAt || new Date().toISOString(),
    status: (row.status === 'aprovado' || row.status === 'atendido')
      ? 'aprovado'
      : row.status === 'recusado'
      ? 'recusado'
      : 'pendente'
  }), []);

  // Real-time synchronization using Supabase for 100% cloud sync across devices
  useEffect(() => {
    // 1. Fetch initial state
    const fetchData = async () => {
      try {
        // A. Fetch Off Requests from solicitacoes_folga
        const { data: folgas, error: folgasError } = await supabase.from('solicitacoes_folga').select('*');
        if (folgas && Array.isArray(folgas) && !folgasError) {
          setOffRequests(folgas.map(normalizeFolga));
        }

        // B. Fetch Users from usuarios & seed missing technicians and admin
        const { data: usersData, error: usersError } = await supabase.from('usuarios').select('*');
        if (usersData && Array.isArray(usersData) && !usersError) {
          const userMap = new Map<string, any>(usersData.map((u: any) => [u.id, u]));

          // Check if admin, William (viewer), and default technicians exist in Supabase usuarios
          const missingToSeed: any[] = [];
          if (!userMap.has('admin')) {
            missingToSeed.push({
              id: 'admin',
              nome: 'Administrador / Gestor Geral',
              role: 'admin',
              pin: '1234',
              primeiro_acesso: true
            });
          }
          if (!userMap.has('william-laiate')) {
            missingToSeed.push({
              id: 'william-laiate',
              nome: 'William Rosalini Laiate',
              role: 'viewer',
              pin: '1234',
              primeiro_acesso: true
            });
          }
          for (const tech of technicians) {
            if (!userMap.has(tech.id)) {
              missingToSeed.push({
                id: tech.id,
                nome: tech.name,
                role: 'tecnico',
                pin: '1234',
                primeiro_acesso: true
              });
            }
          }

          if (missingToSeed.length > 0) {
            supabase.from('usuarios').upsert(missingToSeed).then();
          }

          setUsers(prev => {
            const combinedMap = new Map<string, AppUser>(prev.map(u => [u.id, u]));
            usersData.forEach((row: any) => {
              const existing = combinedMap.get(row.id);
              const pinVal = String(row.pin || '1234');
              const isDefaultPin = pinVal === '1234';
              const primeiroAcesso = row.primeiro_acesso !== undefined ? row.primeiro_acesso : isDefaultPin;

              combinedMap.set(row.id, {
                id: row.id,
                name: row.nome || row.name || existing?.name || (row.id === 'william-laiate' ? 'William Rosalini Laiate' : 'Colaborador'),
                role: row.role === 'tecnico' ? 'technician' : row.role === 'viewer' ? 'viewer' : (row.role || 'technician'),
                pin: pinVal,
                primeiro_acesso: primeiroAcesso,
                isFirstLogin: primeiroAcesso,
                technicianId: (row.id !== 'admin' && row.id !== 'william-laiate') ? row.id : undefined,
                ddd: existing?.ddd
              });
            });
            if (!combinedMap.has('william-laiate')) {
              combinedMap.set('william-laiate', {
                id: 'william-laiate',
                name: 'William Rosalini Laiate',
                role: 'viewer',
                pin: '1234',
                primeiro_acesso: true,
                isFirstLogin: true
              });
            }
            return Array.from(combinedMap.values());
          });
        }

        // C. Fetch Schedule Shifts from escalas
        const { data: escalasData, error: escalasError } = await supabase.from('escalas').select('*');
        setSchedules(() => {
          const next = getOfficialScheduleMap();
          let detectedRegime: '6x1' | '5x2' | undefined;

          if (escalasData && Array.isArray(escalasData) && escalasData.length > 0 && !escalasError) {
            escalasData.forEach((row: any) => {
              const techId = row.id_usuario;
              const date = row.data;
              const rawShift = row.legenda_dia || 'TB';
              const shift: ShiftType = rawShift === 'T' ? 'TB' : rawShift === 'F' ? 'FG' : rawShift;

              if (row.tipo_escala === '6x1' || row.tipo_escala === '5x2') {
                detectedRegime = row.tipo_escala;
              }

              if (techId && date) {
                if (!next[techId]) {
                  next[techId] = { technicianId: techId, days: {} };
                }
                next[techId].days[date] = {
                  date,
                  shift,
                  manualOverride: true,
                  notes: row.horario || undefined
                };
              }
            });
          }

          if (detectedRegime) {
            setPeriod(p => ({ ...p, regime: detectedRegime }));
          }
          return next;
        });
      } catch (err) {
        console.error('Error fetching initial data from Supabase:', err);
      }
    };
    fetchData();

    // 2. Real-time subscriptions
    const channel = supabase.channel('realtime_sync')
      // Listener 1: solicitacoes_folga (INSERT, UPDATE, DELETE) -> reflects immediately on Admin & Tech
      .on('postgres_changes', { event: '*', schema: 'public', table: 'solicitacoes_folga' }, payload => {
        if (payload.eventType === 'INSERT' && payload.new) {
          const newReq = normalizeFolga(payload.new);
          setOffRequests(prev => [...prev.filter(r => r.id !== newReq.id), newReq]);
        } else if (payload.eventType === 'UPDATE' && payload.new) {
          const updatedReq = normalizeFolga(payload.new);
          setOffRequests(prev => prev.map(r => r.id === updatedReq.id ? updatedReq : r));
        } else if (payload.eventType === 'DELETE' && payload.old) {
          const deletedId = (payload.old as any).id;
          if (deletedId) setOffRequests(prev => prev.filter(r => r.id !== deletedId));
        } else {
          fetchData();
        }
      })
      // Listener 2: escalas (Shift updates from Admin -> updates Tech calendar immediately)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'escalas' }, payload => {
        const newRecord: any = payload.new;
        if (newRecord) {
          const techId = newRecord.id_usuario;
          const date = newRecord.data;
          const rawShift = newRecord.legenda_dia;
          const shift = (rawShift === 'T' ? 'TB' : rawShift === 'F' ? 'FG' : rawShift || 'TB') as ShiftType;
          const notes = newRecord.horario;

          if (techId && date) {
            setSchedules(prev => {
              const currentTech = prev[techId] || { technicianId: techId, days: {} };
              return {
                ...prev,
                [techId]: {
                  ...currentTech,
                  days: {
                    ...currentTech.days,
                    [date]: {
                      date,
                      shift,
                      manualOverride: true,
                      notes: notes || currentTech.days[date]?.notes
                    }
                  }
                }
              };
            });
          }
        }
      })
      // Listener 3: usuarios (PIN changes, first access flags)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'usuarios' }, payload => {
        if (payload.new) {
          const row: any = payload.new;
          setUsers(prev => prev.map(u => u.id === row.id ? {
            ...u,
            name: row.nome || row.name || u.name,
            role: row.role === 'tecnico' ? 'technician' : row.role === 'viewer' ? 'viewer' : (row.role || u.role),
            pin: String(row.pin || u.pin),
            primeiro_acesso: row.primeiro_acesso ?? false,
            isFirstLogin: row.primeiro_acesso ?? false
          } : u));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [normalizeFolga, technicians]);

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
    } else if (user.role === 'viewer') {
      setActiveTab('analytics');
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

  // Handler: Update User PIN and clear first access (no looping!)
  const handleUpdateUserPin = useCallback((userId: string, newPin: string) => {
    setUsers(prev => {
      const updated = prev.map(u => (u.id === userId ? { ...u, pin: newPin, primeiro_acesso: false, isFirstLogin: false } : u));
      return updated;
    });

    supabase
      .from('usuarios')
      .update({ pin: newPin, primeiro_acesso: false })
      .eq('id', userId)
      .then(({ error }) => {
        if (error) console.error('Failed to update PIN in Supabase:', error);
      });

    // Update currentUser immediately to break any prompt looping
    setCurrentUser(curr => {
      if (curr && curr.id === userId) {
        const updated = { ...curr, pin: newPin, primeiro_acesso: false, isFirstLogin: false };
        try {
          localStorage.setItem(STORAGE_KEY_AUTH_USER, JSON.stringify(updated));
        } catch (e) {
          console.error(e);
        }
        return updated;
      }
      return curr;
    });
  }, []);

  // Handler: Admin Reset Technician PIN back to 1234 (Restricted strictly to role: admin)
  const handleResetUserPin = useCallback((techId: string) => {
    if (currentUser?.role !== 'admin') {
      alert('Acesso negado: Apenas administradores podem resetar senhas de usuários.');
      return;
    }
    setUsers(prev => {
      const updated = prev.map(u => (u.id === techId ? { ...u, pin: '1234', primeiro_acesso: true, isFirstLogin: true } : u));
      return updated;
    });

    supabase
      .from('usuarios')
      .update({ pin: '1234', primeiro_acesso: true })
      .eq('id', techId)
      .then(({ error }) => {
        if (error) console.error('Failed resetting PIN in Supabase:', error);
      });

    alert('Senha resetada com sucesso para o padrão inicial: 1234 (Primeiro Acesso reativado).');
  }, [currentUser]);

  // Handler: Update a single shift cell (matrix or individual calendar)
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
      return {
        ...prev,
        [techId]: {
          ...currentTechSched,
          days: updatedDays
        }
      };
    });

    // Update or Insert directly in Supabase table 'escalas'
    (async () => {
      try {
        const tech = technicians.find(t => t.id === techId);
        const sel = await supabase.from('escalas').select('id').match({ id_usuario: techId, data: date });
        if (sel.data && sel.data.length > 0) {
          await supabase.from('escalas').update({
            legenda_dia: shift,
            tipo_escala: period.regime || '6x1',
            horario: notes || tech?.shiftHours || null,
            updated_at: new Date().toISOString()
          }).eq('id', sel.data[0].id);
        } else {
          await supabase.from('escalas').insert([{
            id_usuario: techId,
            data: date,
            tipo_escala: period.regime || '6x1',
            legenda_dia: shift,
            horario: notes || tech?.shiftHours || null
          }]);
        }
      } catch (err) {
        console.warn('Failed updating shift in Supabase', err);
      }
    })();
  }, [technicians, period.regime]);

  // Handler: Add Off Request (Technician -> Supabase solicitacoes_folga)
  const handleAddRequest = useCallback((req: Omit<OffRequest, 'id' | 'createdAt' | 'status'>) => {
    const newReq: OffRequest = {
      ...req,
      id: `req-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      createdAt: new Date().toISOString(),
      status: 'pendente'
    };

    // Immediate local update
    setOffRequests(prev => [...prev.filter(r => r.id !== newReq.id), newReq]);

    // Insert into Supabase table 'solicitacoes_folga'
    const tech = technicians.find(t => t.id === newReq.technicianId);
    const motivoText = newReq.reasonCategory + (newReq.notes && newReq.notes.length > 0 ? ` (${newReq.notes.join(' | ')})` : '');
    const payload = {
      id_usuario: newReq.technicianId,
      nome_colaborador: tech?.name || 'Colaborador',
      data_desejada: newReq.date,
      motivo: motivoText,
      status: 'pendente'
    };

    supabase
      .from('solicitacoes_folga')
      .insert([payload])
      .then(({ error }) => {
        if (error) console.error('Erro ao cadastrar folga:', error);
      });

    // Notify admin if logged in
    if (currentUser?.role === 'admin') {
      setIsAdminAlertOpen(true);
    }
  }, [technicians, currentUser]);

  // Handler: Admin Approves Off Request (Status -> 'aprovado')
  const handleApproveRequest = useCallback((id: string) => {
    setOffRequests(prevRequests => {
      const req = prevRequests.find(r => r.id === id);
      if (!req) return prevRequests;

      const updatedRequests: OffRequest[] = prevRequests.map(r => r.id === id ? { ...r, status: 'aprovado' as const } : r);
      
      // Determine shift type based on day of week:
      const dObj = new Date(req.date + 'T12:00:00');
      const dow = dObj.getDay();
      const targetShift: ShiftType = (dow === 0 || dow === 6) ? 'FG' : 'FC';

      // Grant off on requested date in calendar
      handleUpdateShift(req.technicianId, req.date, targetShift, `Folga Aprovada: ${req.notes.join(' | ')}`);

      // Update status in Supabase table 'solicitacoes_folga' to 'aprovado'
      supabase
        .from('solicitacoes_folga')
        .update({ status: 'aprovado' })
        .eq('id', id)
        .then(({ error }) => {
          if (error) console.error('Failed to approve request in Supabase:', error);
        });

      return updatedRequests;
    });
  }, [handleUpdateShift]);

  // Handler: Admin Rejects Off Request
  const handleRejectRequest = useCallback((id: string) => {
    setOffRequests(prev => {
      const updated: OffRequest[] = prev.map(r => r.id === id ? { ...r, status: 'recusado' as const } : r);
      supabase.from('solicitacoes_folga').update({ status: 'recusado' }).eq('id', id).then();
      return updated;
    });
  }, []);

  // Handler: Delete Off Request
  const handleDeleteRequest = useCallback((id: string) => {
    setOffRequests(prev => {
      const updated: OffRequest[] = prev.filter(r => r.id !== id);
      supabase.from('solicitacoes_folga').delete().eq('id', id).then();
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
    if (window.confirm('Deseja realmente apagar 100% da escala atual no banco de dados e na tela?')) {
      setSchedules({});
      await supabase.from('escalas').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      try {
        localStorage.removeItem(STORAGE_KEY_SCHEDULE);
      } catch (e) {
        console.error('Failed to clear schedule storage', e);
      }
      alert('Escala apagada 100% com sucesso no Supabase!');
    }
  }, []);

  // Handler: Upload and parse structured long CSV/Text schedule
  const handleUploadScheduleFile = useCallback(async (file: File) => {
    try {
      const text = await file.text();
      const result = parseScheduleLongCsv(text);

      if (result.validRowsCount === 0) {
        alert(
          `Não foi possível carregar a escala do arquivo:\n` +
          (result.errors.length > 0 ? result.errors.slice(0, 3).join('\n') : 'Nenhuma linha válida no padrão: Data, Nome, DDD, Escala, Status.')
        );
        return;
      }

      // 3. Clear completely the existing schedule on screen
      const newSchedules: Record<string, TechnicianSchedule> = {};
      let updatedTechs = [...technicians];
      const techMapByName = new Map<string, Technician>();

      // Index existing technicians by normalized name
      for (const t of updatedTechs) {
        techMapByName.set(normalizeName(t.name), t);
      }

      // Also register known official aliases
      const aliasPairs: [string, string][] = [
        ['AYRTON CESAR DOS SANTOS PEREIRA', 'Ayrton Cesar S. Pereira'],
        ['CARLOS SERGIO DE OLIVETRA', 'Carlos Sergio de Oliveira'],
        ['EWANDER DA SILVA CARVALHO', 'Ewander da S. Carvalho'],
        ['EWANDRO MOURA FE', 'Ewandro Moura Fé'],
        ['GERSAM BERNARDO DE OLIVEIRA', 'Gersam B. de Oliveira'],
        ['GUSTAVO DONIZETI CARETTE', 'Gustavo D. Carette'],
        ['GUSTAVO HENRIQUE MENDES DE ALMEIDA', 'Gustavo H. M. de Almeida'],
        ['HENRIQUE SODRE DE ALMEIDA', 'Henrique Sodré de Almeida'],
        ['LEONARDO TEIXEIRA DO NASCIMENTO', 'Leonardo T. do Nascimento'],
        ['ODIRLEI SILVEIRA DE CAMPOS', 'Odirlei S. de Campos'],
        ['RODRIGO FERREIRA ALBUQUERQUE', 'Rodrigo F. Albuquerque'],
        ['ROGERIO SOUZA DE SANTOS', 'Rogerio Souza dos Santos']
      ];
      for (const [alias, realName] of aliasPairs) {
        const found = updatedTechs.find(t => t.name === realName);
        if (found) {
          techMapByName.set(normalizeName(alias), found);
        }
      }

      const findTech = (name: string): Technician | undefined => {
        const norm = normalizeName(name);
        if (techMapByName.has(norm)) return techMapByName.get(norm);

        // Substring / partial tolerance (e.g. OLIVEIRA vs OLIVETRA)
        for (const [existingNorm, t] of techMapByName.entries()) {
          if (existingNorm === norm) return t;
          if (existingNorm.includes(norm) || norm.includes(existingNorm)) return t;
          const pA = existingNorm.split(' ');
          const pB = norm.split(' ');
          if (pA.length >= 2 && pB.length >= 2 && pA[0] === pB[0] && pA[pA.length - 1] === pB[pB.length - 1]) {
            return t;
          }
        }
        return undefined;
      };

      // Wipe out all days for every technician
      for (const t of updatedTechs) {
        newSchedules[t.id] = { technicianId: t.id, days: {} };
      }

      let newTechsCount = 0;

      // 4. Fill blocks for each collaborator and each day with exact status from file
      for (const row of result.rows) {
        let tech = findTech(row.name);
        if (!tech) {
          const newTechId = `tech-${row.ddd || 13}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
          tech = {
            id: newTechId,
            name: row.name,
            ddd: (row.ddd || 13) as any,
            active: true,
            shiftHours: row.shiftHours || '08:00 AS 16:20'
          };
          updatedTechs.push(tech);
          techMapByName.set(normalizeName(tech.name), tech);
          newSchedules[tech.id] = { technicianId: tech.id, days: {} };
          newTechsCount++;
        } else {
          if (row.ddd && tech.ddd !== row.ddd) {
            tech.ddd = row.ddd;
          }
          if (row.shiftHours && tech.shiftHours !== row.shiftHours) {
            tech.shiftHours = row.shiftHours;
          }
        }

        newSchedules[tech.id].days[row.date] = {
          date: row.date,
          shift: row.status,
          manualOverride: true,
          notes: row.shiftHours || tech.shiftHours
        };
      }

      // Always keep technicians sorted alphabetically
      updatedTechs = [...updatedTechs].sort((a, b) => a.name.localeCompare(b.name));

      // Update visual state immediately before saving
      setTechnicians(updatedTechs);
      setSchedules(newSchedules);

      // Local storage persistence
      try {
        localStorage.setItem(STORAGE_KEY_SCHEDULE, JSON.stringify(newSchedules));
        localStorage.setItem(STORAGE_KEY_TECHS, JSON.stringify(updatedTechs));
      } catch (e) {
        console.warn('Storage save warning:', e);
      }

      alert(
        `✅ Escala da Planilha carregada com sucesso!\n\n` +
        `• Arquivo: ${file.name}\n` +
        `• Linhas válidas processadas: ${result.validRowsCount}\n` +
        `• Colaboradores identificados: ${result.uniqueNames.length}\n` +
        (newTechsCount > 0 ? `• Novos colaboradores adicionados: ${newTechsCount}\n` : '') +
        `\nA escala anterior foi limpa e os blocos foram preenchidos com os dados da sua planilha.\n` +
        `Revise os dias na tela e clique no botão verde "Salvar Escala" para gravar definitivamente na nuvem.`
      );
    } catch (err) {
      console.error('Erro ao ler arquivo da escala:', err);
      alert('Erro inesperado ao processar o arquivo. Certifique-se de que é um arquivo CSV ou texto com colunas: Data, Nome, DDD, Escala, Status.');
    }
  }, [technicians]);

  // Handler: Load Official Schedule from Spreadsheet (Restaurar Padrão Oficial)
  const handleLoadOfficialSchedule = useCallback(async () => {
    if (!window.confirm('Deseja restaurar a Escala Oficial Padrão (Novembro e Dezembro de 2026)?')) {
      return;
    }
    const sortedTechs = [...OFFICIAL_TECHNICIANS].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
    setTechnicians(sortedTechs);
    const newSchedules: Record<string, TechnicianSchedule> = {};

    for (const tech of sortedTechs) {
      const techShifts = OFFICIAL_SHIFTS_BY_TECH_NAME[tech.id] ||
                         OFFICIAL_SHIFTS_BY_TECH_NAME[tech.name] ||
                         OFFICIAL_SHIFTS_BY_TECH_NAME[tech.name.toUpperCase()] ||
                         {};
      newSchedules[tech.id] = { technicianId: tech.id, days: {} };

      for (const [dateStr, shiftCode] of Object.entries(techShifts)) {
        newSchedules[tech.id].days[dateStr] = {
          date: dateStr,
          shift: shiftCode,
          manualOverride: true,
          notes: tech.shiftHours
        };
      }
    }

    setSchedules(newSchedules);
    alert('Escala Oficial Padrão restaurada na tela! Revise e clique em "Salvar Escala" para gravar na nuvem.');
  }, []);

  // Handler: Export Excel
  const handleExportExcel = () => {
    exportScheduleToExcel(technicians, schedules, dates, period, offRequests);
  };

  // Handler: Generate Schedule (Supporting 6x1 vs 5x2) & Save to Supabase
  const handleGenerate = useCallback(async (options: GeneratorOptions, periodConfig: { startYear: number; startMonth: number }) => {
    const newDates = generateDateRange(periodConfig.startYear, periodConfig.startMonth, period.durationMonths);
    const currentRegime = options.regime || '6x1';

    const newPeriod: SchedulePeriod = {
      ...period,
      startYear: periodConfig.startYear,
      startMonth: periodConfig.startMonth,
      regime: currentRegime,
      updatedAt: new Date().toISOString()
    };
    setPeriod(newPeriod);

    // Generate new schedule with regime logic
    const newSchedule = generateSchedule(technicians, newDates, offRequests, options);
    setSchedules(newSchedule);

    // Save batch to Supabase table 'escalas'
    const rows: any[] = [];
    for (const tech of technicians) {
      const techSched = newSchedule[tech.id];
      if (!techSched || !techSched.days) continue;
      for (const d of newDates) {
        const day = techSched.days[d];
        rows.push({
          id_usuario: tech.id,
          data: d,
          tipo_escala: currentRegime,
          legenda_dia: day?.shift || 'TB',
          horario: tech.shiftHours || null
        });
      }
    }

    try {
      await supabase.from('escalas').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      for (let i = 0; i < rows.length; i += 100) {
        await supabase.from('escalas').insert(rows.slice(i, i + 100));
      }
    } catch (e) {
      console.warn('Failed saving generated schedule to Supabase:', e);
    }

    setIsGeneratorOpen(false);
    alert(`Escala ${currentRegime} gerada e salva com sucesso na nuvem Supabase!`);
  }, [technicians, offRequests, period]);

  const isAdmin = currentUser?.role === 'admin';
  const isViewer = currentUser?.role === 'viewer';
  const isTechnician = currentUser?.role === 'technician';

  // Handler: Save all changes to Supabase cloud
  const handleSave = useCallback(async () => {
    try {
      const currentRegime = period.regime || '6x1';
      const rows: any[] = [];
      for (const tech of technicians) {
        const techSched = schedules[tech.id];
        if (!techSched || !techSched.days) continue;
        for (const d of dates) {
          const day = techSched.days[d];
          rows.push({
            id_usuario: tech.id,
            data: d,
            tipo_escala: currentRegime,
            legenda_dia: day?.shift || 'TB',
            horario: tech.shiftHours || null
          });
        }
      }

      // Delete old and save batch in chunks of 100
      await supabase.from('escalas').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      for (let i = 0; i < rows.length; i += 100) {
        const { error } = await supabase.from('escalas').insert(rows.slice(i, i + 100));
        if (error) console.error('Error inserting chunk into escalas:', error);
      }

      // Save all users to 'usuarios'
      const userRows = users.map(u => ({
        id: u.id,
        nome: u.name,
        role: u.role === 'technician' ? 'tecnico' : u.role === 'viewer' ? 'viewer' : u.role,
        pin: u.pin,
        primeiro_acesso: u.primeiro_acesso ?? u.isFirstLogin ?? false
      }));
      await supabase.from('usuarios').upsert(userRows);

      alert('✅ Escala salva com 100% de sucesso na nuvem Supabase!');
    } catch (err) {
      console.error('Error saving to Supabase:', err);
      alert('Erro ao salvar na nuvem Supabase. Verifique a conexão.');
    }
  }, [technicians, schedules, dates, period.regime, users]);

  // Handler: Update Technicians List
  const handleUpdateTechnicians = useCallback((updated: Technician[]) => {
    const sorted = [...updated].sort((a, b) => a.name.localeCompare(b.name));
    setTechnicians(sorted);
  }, []);


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

        {isAdmin && pendingRequests.length > 0 && (
          <PendingRequestsNotificationWidget
            pendingRequests={pendingRequests}
            technicians={technicians}
            onApprove={handleApproveRequest}
            onReject={handleRejectRequest}
            darkMode={darkMode}
          />
        )}

        {/* If user is a technician, they strictly see only their individual view! */}
        {isTechnician && (
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

        {/* If user is Viewer (William Rosalini Laiate): strictly Dashboard & Análises and Visão Geral (Matriz Completa - Read Only) */}
        {isViewer && (
          <>
            {activeTab === 'matrix' && (
              <RosterTable
                technicians={technicians}
                schedules={schedules}
                dates={dates}
                period={period}
                auditResult={auditResult}
                offRequests={offRequests}
                onUpdateShift={() => {}}
                onOpenRequests={() => {}}
                readOnly={true}
              />
            )}

            {activeTab === 'analytics' && (
              <AnalyticsDashboard
                technicians={technicians}
                schedules={schedules}
                dates={dates}
                period={period}
                auditResult={auditResult}
                offRequests={offRequests}
                darkMode={darkMode}
              />
            )}
          </>
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
                onLoadOfficialSchedule={handleLoadOfficialSchedule}
                onUploadScheduleFile={handleUploadScheduleFile}
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

            {activeTab === 'whatsapp_push' && (
              <WhatsAppPushAlertWidget
                technicians={technicians}
                schedules={schedules}
                dates={dates}
                period={period}
                darkMode={darkMode}
              />
            )}

            {activeTab === 'analytics' && (
              <AnalyticsDashboard
                technicians={technicians}
                schedules={schedules}
                dates={dates}
                period={period}
                auditResult={auditResult}
                offRequests={offRequests}
                darkMode={darkMode}
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
        isOpen={isRequestsOpen && !isViewer}
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
        users={users}
      />

      <WhatsAppModal
        isOpen={isWhatsAppOpen && !isViewer}
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
