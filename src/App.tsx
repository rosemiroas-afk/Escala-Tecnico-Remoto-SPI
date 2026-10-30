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

        // B. Fetch Users from usuarios & seed missing technicians
        const { data: usersData, error: usersError } = await supabase.from('usuarios').select('*');
        if (usersData && Array.isArray(usersData) && !usersError) {
          const userMap = new Map<string, any>(usersData.map((u: any) => [u.id, u]));

          // Check if default technicians exist in Supabase usuarios
          const missingToSeed: any[] = [];
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
              combinedMap.set(row.id, {
                id: row.id,
                name: row.nome || row.name || existing?.name || 'Colaborador',
                role: row.role === 'tecnico' ? 'technician' : (row.role || 'technician'),
                pin: String(row.pin || '1234'),
                primeiro_acesso: row.primeiro_acesso ?? true,
                isFirstLogin: row.primeiro_acesso ?? true,
                technicianId: row.id !== 'admin' ? row.id : undefined,
                ddd: existing?.ddd
              });
            });
            return Array.from(combinedMap.values());
          });
        }

        // C. Fetch Schedule Shifts from escalas
        const { data: escalasData, error: escalasError } = await supabase.from('escalas').select('*');
        if (escalasData && Array.isArray(escalasData) && escalasData.length > 0 && !escalasError) {
          setSchedules(prev => {
            const next: Record<string, TechnicianSchedule> = { ...prev };
            let detectedRegime: '6x1' | '5x2' | undefined;

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

            if (detectedRegime) {
              setPeriod(p => ({ ...p, regime: detectedRegime }));
            }
            return next;
          });
        }
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
            role: row.role === 'tecnico' ? 'technician' : (row.role || u.role),
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
        role: u.role === 'technician' ? 'tecnico' : u.role,
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
    setTechnicians(updated);
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
