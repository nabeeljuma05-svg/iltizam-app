import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Target, Calendar, TrendingUp, Loader2, RotateCcw, Sparkles, LogOut } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { supabase } from './lib/supabase';
import Auth from './Auth';

const COLORS = {
  ink: '#1A1A1A',
  mist: '#F4F4F4',
  slate: '#5A5A5A',
  slateLight: '#9A9A9A',
  border: '#E0E0E0',
  gold: '#D91F2B',
  goldSoft: '#FCE4E5',
  goldText: '#A11620',
  moss: '#1B1B1B',
  mossSoft: '#EDEDED',
  mossText: '#1B1B1B',
  brick: '#D4AF37',
  brickSoft: '#FBF4DC',
  brickText: '#8A6D00',
};

const BODY_FONT = "'IBM Plex Sans Arabic', sans-serif";
const DISPLAY_FONT = "'Reem Kufi', sans-serif";

function todayStr() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatArabicDate(dateStr) {
  const days = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  const months = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
  const [y, m, d] = dateStr.split('-').map(Number);
  const dateObj = new Date(y, m - 1, d);
  return `${days[dateObj.getDay()]}، ${d} ${months[m - 1]}`;
}

function scoreColor(score) {
  if (score >= 7) return { bg: COLORS.mossSoft, text: COLORS.mossText, ring: COLORS.moss };
  if (score >= 4) return { bg: COLORS.goldSoft, text: COLORS.goldText, ring: COLORS.gold };
  return { bg: COLORS.brickSoft, text: COLORS.brickText, ring: COLORS.brick };
}

function injectGlobalStyles() {
  if (document.getElementById('iltizam-fonts')) return;
  const link = document.createElement('link');
  link.id = 'iltizam-fonts';
  link.rel = 'stylesheet';
  link.href = 'https://fonts.googleapis.com/css2?family=Reem+Kufi&family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&display=swap';
  document.head.appendChild(link);

  const style = document.createElement('style');
  style.textContent = `
    .app-input { transition: border-color 0.15s ease; }
    .app-input:focus { outline: none; border-color: ${COLORS.gold}; }
    .app-input::placeholder { color: ${COLORS.slateLight}; }
    button:focus-visible { outline: 2px solid ${COLORS.gold}; outline-offset: 2px; }
    @media (prefers-reduced-motion: reduce) {
      .progress-fill { transition: none !important; }
    }
  `;
  document.head.appendChild(style);
}

function Card({ children, style, className = '', padding = 'p-4' }) {
  return (
    <div
      className={`rounded-2xl ${padding} ${className}`}
      style={{ backgroundColor: '#FFFFFF', border: `1px solid ${COLORS.border}`, ...style }}
    >
      {children}
    </div>
  );
}

function PrimaryButton({ children, onClick, disabled, className = '' }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full font-bold py-2.5 rounded-xl flex items-center justify-center gap-2 ${className}`}
      style={{
        backgroundColor: disabled ? '#E2E5DF' : COLORS.gold,
        color: disabled ? COLORS.slateLight : '#FFFFFF',
      }}
    >
      {children}
    </button>
  );
}

function ScoreStamp({ score, size = 56, colorOverride }) {
  const colors = colorOverride || scoreColor(typeof score === 'number' ? score : 0);
  const inner = size - 8;
  return (
    <div style={{ width: size, height: size, flexShrink: 0 }} className="flex items-center justify-center">
      <div
        className="flex items-center justify-center"
        style={{
          width: inner,
          height: inner,
          borderRadius: '9999px',
          border: `2.5px solid ${colors.ring}`,
          outline: `1.5px solid ${colors.ring}`,
          outlineOffset: '3px',
          backgroundColor: colors.bg,
          transform: 'rotate(-6deg)',
        }}
      >
        <span
          style={{
            fontFamily: DISPLAY_FONT,
            color: colors.text,
            fontSize: inner * 0.42,
            transform: 'rotate(6deg)',
            lineHeight: 1,
          }}
        >
          {score}
        </span>
      </div>
    </div>
  );
}

function NavButton({ active, onClick, Icon, label }) {
  return (
    <button onClick={onClick} className="flex flex-col items-center justify-center gap-0.5 py-1.5 rounded-xl">
      <Icon size={20} color={active ? COLORS.gold : COLORS.slateLight} />
      <span className="text-xs font-bold" style={{ color: active ? COLORS.gold : COLORS.slateLight }}>{label}</span>
    </button>
  );
}

export default function App() {
  const [session, setSession] = useState(undefined); // undefined = checking, null = signed out
  const [loaded, setLoaded] = useState(false);
  const [habits, setHabits] = useState([]);
  const [todayEntries, setTodayEntries] = useState({});
  const [tab, setTab] = useState('today');
  const [inputs, setInputs] = useState({});
  const [evaluating, setEvaluating] = useState({});
  const [errors, setErrors] = useState({});
  const [history, setHistory] = useState(null);
  const [historyHabitId, setHistoryHabitId] = useState(null);

  const today = todayStr();
  const userId = session?.user?.id;

  useEffect(() => {
    injectGlobalStyles();
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (!s) {
        setLoaded(false);
        setHabits([]);
        setTodayEntries({});
        setHistory(null);
      }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (userId) init();
    // eslint-disable-next-line
  }, [userId]);

  async function init() {
    setLoaded(false);
    try {
      const { data: habitRows, error: hErr } = await supabase
        .from('habits')
        .select('id, name, description')
        .order('created_at', { ascending: true });
      if (hErr) throw hErr;
      setHabits(habitRows || []);

      const { data: entryRows, error: eErr } = await supabase
        .from('entries')
        .select('habit_id, text, score, feedback')
        .eq('entry_date', today);
      if (eErr) throw eErr;
      const map = {};
      (entryRows || []).forEach(r => {
        map[r.habit_id] = { text: r.text, score: r.score, feedback: r.feedback };
      });
      setTodayEntries(map);
    } catch (e) {
      console.error('init failed', e);
    }
    setLoaded(true);
  }

  useEffect(() => {
    if (habits.length && !historyHabitId) setHistoryHabitId(habits[0].id);
  }, [habits, historyHabitId]);

  useEffect(() => {
    if (tab === 'history' && history === null) loadHistory();
    // eslint-disable-next-line
  }, [tab]);

  async function handleAddHabit(name, description) {
    try {
      const { data, error } = await supabase
        .from('habits')
        .insert({ user_id: userId, name, description })
        .select('id, name, description')
        .single();
      if (error) throw error;
      setHabits(prev => [...prev, data]);
    } catch (e) {
      console.error('add habit failed', e);
    }
  }

  async function handleDeleteHabit(id) {
    setHabits(prev => prev.filter(h => h.id !== id));
    if (historyHabitId === id) setHistoryHabitId(null);
    try {
      const { error } = await supabase.from('habits').delete().eq('id', id);
      if (error) throw error;
      setHistory(null);
    } catch (e) {
      console.error('delete habit failed', e);
    }
  }

  async function handleEvaluate(habit) {
    const text = (inputs[habit.id] || '').trim();
    if (!text) return;
    setEvaluating(p => ({ ...p, [habit.id]: true }));
    setErrors(p => ({ ...p, [habit.id]: null }));
    try {
      const res = await fetch('/api/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          habitName: habit.name,
          habitDescription: habit.description || '',
          logText: text,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data) throw new Error('API request failed');
      if (data.error) throw new Error(data.error);
      const score = Math.max(0, Math.min(10, Math.round(Number(data.score))));
      const feedback = String(data.feedback || '').trim();

      const { error: upErr } = await supabase
        .from('entries')
        .upsert(
          { user_id: userId, habit_id: habit.id, entry_date: today, text, score, feedback },
          { onConflict: 'habit_id,entry_date' }
        );
      if (upErr) throw upErr;

      setTodayEntries(prev => ({ ...prev, [habit.id]: { text, score, feedback } }));
      setHistory(null);
    } catch (e) {
      console.error(e);
      setErrors(p => ({ ...p, [habit.id]: 'صار خطأ بالتقييم، حاول مرة ثانية' }));
    } finally {
      setEvaluating(p => ({ ...p, [habit.id]: false }));
    }
  }

  async function handleRedo(habitId) {
    const entry = todayEntries[habitId];
    if (entry) setInputs(p => ({ ...p, [habitId]: entry.text }));
    setTodayEntries(prev => {
      const next = { ...prev };
      delete next[habitId];
      return next;
    });
    try {
      const { error } = await supabase
        .from('entries')
        .delete()
        .eq('habit_id', habitId)
        .eq('entry_date', today);
      if (error) throw error;
      setHistory(null);
    } catch (e) {
      console.error('redo failed', e);
    }
  }

  async function loadHistory() {
    setHistory(null);
    try {
      const { data, error } = await supabase
        .from('entries')
        .select('habit_id, entry_date, text, score, feedback')
        .order('entry_date', { ascending: true });
      if (error) throw error;

      const byDate = {};
      (data || []).forEach(r => {
        if (!byDate[r.entry_date]) byDate[r.entry_date] = { date: r.entry_date, entries: {} };
        byDate[r.entry_date].entries[r.habit_id] = { text: r.text, score: r.score, feedback: r.feedback };
      });
      setHistory(Object.values(byDate));
    } catch (e) {
      console.error(e);
      setHistory([]);
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
  }

  if (session === undefined) {
    return (
      <div dir="rtl" style={{ fontFamily: BODY_FONT, backgroundColor: COLORS.mist }} className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin" color={COLORS.gold} size={32} />
      </div>
    );
  }

  if (!session) {
    return <Auth />;
  }

  if (!loaded) {
    return (
      <div dir="rtl" style={{ fontFamily: BODY_FONT, backgroundColor: COLORS.mist }} className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin" color={COLORS.gold} size={32} />
      </div>
    );
  }

  if (habits.length === 0) {
    return <Onboarding onAddHabit={handleAddHabit} />;
  }

  return (
    <div dir="rtl" style={{ fontFamily: BODY_FONT, backgroundColor: COLORS.mist }} className="min-h-screen pb-24">
      <div className="sticky top-0 z-10 px-5 py-4" style={{ backgroundColor: '#FFFFFF', borderBottom: `1px solid ${COLORS.border}` }}>
        <div className="flex items-center gap-3 max-w-lg mx-auto">
          <div style={{ width: 34, height: 34 }} className="flex items-center justify-center shrink-0">
            <div style={{
              width: 24, height: 24, borderRadius: '9999px',
              border: `2px solid ${COLORS.gold}`, outline: `1px solid ${COLORS.gold}`,
              outlineOffset: '2px', transform: 'rotate(-8deg)',
            }} />
          </div>
          <h1 style={{ fontFamily: DISPLAY_FONT, color: COLORS.ink }} className="text-xl flex-1">التزام</h1>
          <button onClick={handleSignOut} className="p-1.5" aria-label="تسجيل الخروج">
            <LogOut size={18} color={COLORS.slateLight} />
          </button>
        </div>
      </div>

      <div className="px-4 py-5 max-w-lg mx-auto">
        {tab === 'today' && (
          <TodayTab
            habits={habits}
            todayEntries={todayEntries}
            inputs={inputs}
            setInputs={setInputs}
            evaluating={evaluating}
            errors={errors}
            onSubmit={handleEvaluate}
            onRedo={handleRedo}
            today={today}
          />
        )}
        {tab === 'history' && (
          <HistoryTab habits={habits} history={history} selectedId={historyHabitId} setSelectedId={setHistoryHabitId} />
        )}
        {tab === 'goals' && (
          <GoalsTab habits={habits} onAddHabit={handleAddHabit} onDeleteHabit={handleDeleteHabit} />
        )}
      </div>

      <div
        className="fixed bottom-0 inset-x-0 px-3 pt-2"
        style={{ backgroundColor: '#FFFFFF', borderTop: `1px solid ${COLORS.border}`, paddingBottom: 'calc(env(safe-area-inset-bottom) + 8px)' }}
      >
        <div className="max-w-lg mx-auto grid grid-cols-3 gap-1">
          <NavButton active={tab === 'today'} onClick={() => setTab('today')} Icon={Calendar} label="اليوم" />
          <NavButton active={tab === 'history'} onClick={() => setTab('history')} Icon={TrendingUp} label="السجل" />
          <NavButton active={tab === 'goals'} onClick={() => setTab('goals')} Icon={Target} label="الأهداف" />
        </div>
      </div>
    </div>
  );
}

function Onboarding({ onAddHabit }) {
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');

  useEffect(() => {
    injectGlobalStyles();
  }, []);

  function add() {
    if (!name.trim()) return;
    onAddHabit(name.trim(), desc.trim());
  }

  return (
    <div dir="rtl" style={{ fontFamily: BODY_FONT, backgroundColor: COLORS.mist, minHeight: '100vh' }} className="flex flex-col px-6 py-12">
      <div className="max-w-md mx-auto w-full">
        <div className="flex justify-center mb-6">
          <ScoreStamp score="؟" size={84} colorOverride={{ bg: COLORS.goldSoft, text: COLORS.goldText, ring: COLORS.gold }} />
        </div>
        <h1 style={{ fontFamily: DISPLAY_FONT, color: COLORS.ink }} className="text-3xl text-center mb-3">التزام</h1>
        <p style={{ color: COLORS.slate }} className="text-sm text-center mb-8 leading-relaxed">
          حدد أول هدف أو عادة بدك تشتغل عليها. كل مساء بتكتب شو سويت، ومدربك الذكي بيحط لك علامة من عشرة.
        </p>

        <Card>
          <div className="space-y-2">
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="مثلاً: الأكل الصحي، ترك التدخين، النوم بدري"
              className="app-input w-full rounded-xl p-3 text-sm border"
              style={{ backgroundColor: COLORS.mist, borderColor: COLORS.border, color: COLORS.ink }}
            />
            <input
              value={desc}
              onChange={e => setDesc(e.target.value)}
              placeholder="وصف اختياري"
              className="app-input w-full rounded-xl p-3 text-sm border"
              style={{ backgroundColor: COLORS.mist, borderColor: COLORS.border, color: COLORS.ink }}
            />
            <PrimaryButton onClick={add} disabled={!name.trim()}>
              <Plus size={16} /> إضافة هدف وبدء التتبع
            </PrimaryButton>
          </div>
        </Card>
      </div>
    </div>
  );
}

function HabitCard({ habit, entry, inputValue, onChangeInput, isEvaluating, error, onSubmit, onRedo }) {
  if (entry) {
    return (
      <Card>
        <div className="flex items-start gap-3">
          <ScoreStamp score={entry.score} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-bold" style={{ color: COLORS.ink }}>{habit.name}</h3>
              {entry.score === 10 && (
                <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: COLORS.gold, color: '#FFFFFF' }}>
                  🔴⚫ SIUUU!
                </span>
              )}
              <button onClick={onRedo} className="p-1 shrink-0" aria-label="إعادة التسجيل">
                <RotateCcw size={15} color={COLORS.slateLight} />
              </button>
            </div>
            <p className="text-sm mt-1" style={{ color: COLORS.slate }}>{entry.text}</p>
            <div className="mt-2 rounded-xl px-3 py-2" style={{ backgroundColor: scoreColor(entry.score).bg }}>
              <p className="text-sm font-medium" style={{ color: scoreColor(entry.score).text }}>{entry.feedback}</p>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <h3 className="font-bold mb-1" style={{ color: COLORS.ink }}>{habit.name}</h3>
      {habit.description && <p className="text-xs mb-2" style={{ color: COLORS.slateLight }}>{habit.description}</p>}
      <textarea
        value={inputValue}
        onChange={e => onChangeInput(e.target.value)}
        placeholder="شو صار اليوم بخصوص هالهدف؟"
        rows={2}
        className="app-input w-full rounded-xl p-3 text-sm border resize-none"
        style={{ backgroundColor: COLORS.mist, borderColor: COLORS.border, color: COLORS.ink }}
      />
      {error && <p className="text-xs mt-1" style={{ color: COLORS.brick }}>{error}</p>}
      <div className="mt-2">
        <PrimaryButton onClick={onSubmit} disabled={isEvaluating || !inputValue.trim()}>
          {isEvaluating ? (
            <>
              <Loader2 size={16} className="animate-spin" /> جاري التقييم...
            </>
          ) : (
            'تقييم'
          )}
        </PrimaryButton>
      </div>
    </Card>
  );
}

function TodayTab({ habits, todayEntries, inputs, setInputs, evaluating, errors, onSubmit, onRedo, today }) {
  const loggedCount = habits.filter(h => todayEntries[h.id]).length;
  const total = habits.length;
  const avg = loggedCount
    ? habits.reduce((s, h) => s + (todayEntries[h.id]?.score ?? 0), 0) / loggedCount
    : null;

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-medium" style={{ color: COLORS.slateLight }}>{formatArabicDate(today)}</p>
        <div className="flex items-center justify-between mt-1">
          <h2 className="text-xl font-bold" style={{ color: COLORS.ink }}>يومك</h2>
          {loggedCount > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full" style={{ backgroundColor: COLORS.goldSoft }}>
              <Sparkles size={14} color={COLORS.gold} />
              <span className="text-sm font-bold" style={{ color: COLORS.goldText }}>{avg.toFixed(1)} / 10</span>
            </div>
          )}
        </div>
        <div className="w-full rounded-full h-1.5 mt-3" style={{ backgroundColor: COLORS.border }}>
          <div
            className="progress-fill h-1.5 rounded-full transition-all"
            style={{ width: `${total ? (loggedCount / total) * 100 : 0}%`, backgroundColor: COLORS.gold }}
          />
        </div>
        <p className="text-xs mt-1" style={{ color: COLORS.slateLight }}>{loggedCount} من {total} أهداف مسجّلة</p>
      </div>

      {habits.map(habit => (
        <HabitCard
          key={habit.id}
          habit={habit}
          entry={todayEntries[habit.id]}
          inputValue={inputs[habit.id] || ''}
          onChangeInput={v => setInputs(p => ({ ...p, [habit.id]: v }))}
          isEvaluating={!!evaluating[habit.id]}
          error={errors[habit.id]}
          onSubmit={() => onSubmit(habit)}
          onRedo={() => onRedo(habit.id)}
        />
      ))}
    </div>
  );
}

function GoalsTab({ habits, onAddHabit, onDeleteHabit }) {
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [confirmId, setConfirmId] = useState(null);

  function handleDeleteClick(id) {
    if (confirmId === id) {
      onDeleteHabit(id);
      setConfirmId(null);
    } else {
      setConfirmId(id);
      setTimeout(() => setConfirmId(curr => (curr === id ? null : curr)), 3000);
    }
  }

  function handleAdd() {
    if (!name.trim()) return;
    onAddHabit(name.trim(), desc.trim());
    setName('');
    setDesc('');
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold" style={{ color: COLORS.ink }}>أهدافك</h2>

      <Card>
        <div className="space-y-2">
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="اسم هدف جديد"
            className="app-input w-full rounded-xl p-3 text-sm border"
            style={{ backgroundColor: COLORS.mist, borderColor: COLORS.border, color: COLORS.ink }}
          />
          <input
            value={desc}
            onChange={e => setDesc(e.target.value)}
            placeholder="وصف اختياري"
            className="app-input w-full rounded-xl p-3 text-sm border"
            style={{ backgroundColor: COLORS.mist, borderColor: COLORS.border, color: COLORS.ink }}
          />
          <PrimaryButton onClick={handleAdd} disabled={!name.trim()}>
            <Plus size={16} /> إضافة هدف
          </PrimaryButton>
        </div>
      </Card>

      <div className="space-y-2">
        {habits.map(h => (
          <Card key={h.id} className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="font-bold" style={{ color: COLORS.ink }}>{h.name}</p>
              {h.description && <p className="text-xs mt-0.5" style={{ color: COLORS.slateLight }}>{h.description}</p>}
            </div>
            <button
              onClick={() => handleDeleteClick(h.id)}
              className="shrink-0 px-2.5 py-2 rounded-xl"
              style={{ backgroundColor: confirmId === h.id ? COLORS.brick : 'transparent' }}
            >
              {confirmId === h.id ? (
                <span className="text-xs font-bold" style={{ color: '#FFFFFF' }}>تأكيد</span>
              ) : (
                <Trash2 size={16} color={COLORS.slateLight} />
              )}
            </button>
          </Card>
        ))}
      </div>
    </div>
  );
}

function HistoryTab({ habits, history, selectedId, setSelectedId }) {
  if (history === null) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="animate-spin" color={COLORS.gold} size={28} />
      </div>
    );
  }

  const data = history
    .filter(d => d.entries[selectedId])
    .map(d => ({ date: d.date.slice(5).replace('-', '/'), score: d.entries[selectedId].score, fullDate: d.date }));

  const avg = data.length ? (data.reduce((s, d) => s + d.score, 0) / data.length).toFixed(1) : null;

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const sevenDaysAgoStr = sevenDaysAgo.toISOString().slice(0, 10);
  const weekData = data.filter(d => d.fullDate >= sevenDaysAgoStr);
  const weekAvg = weekData.length ? (weekData.reduce((s, d) => s + d.score, 0) / weekData.length).toFixed(1) : null;
  const weekColors = weekAvg !== null ? scoreColor(Math.round(weekAvg)) : null;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold" style={{ color: COLORS.ink }}>سجل التقدم</h2>

      <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4">
        {habits.map(h => (
          <button
            key={h.id}
            onClick={() => setSelectedId(h.id)}
            className="shrink-0 px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap border"
            style={
              selectedId === h.id
                ? { backgroundColor: COLORS.gold, color: '#FFFFFF', borderColor: COLORS.gold }
                : { backgroundColor: '#FFFFFF', color: COLORS.slate, borderColor: COLORS.border }
            }
          >
            {h.name}
          </button>
        ))}
      </div>

      {data.length === 0 ? (
        <Card className="text-center" padding="p-8">
          <p className="text-sm" style={{ color: COLORS.slateLight }}>ما في تسجيلات بعد لهالهدف</p>
        </Card>
      ) : (
        <>
          {weekAvg !== null && (
            <Card style={{ backgroundColor: weekColors.bg, borderColor: weekColors.ring }}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold" style={{ color: weekColors.text }}>تقرير آخر 7 أيام</p>
                  <p className="text-2xl font-bold mt-1" style={{ color: weekColors.text }}>
                    {weekAvg}<span className="text-sm"> / 10</span>
                  </p>
                </div>
                <ScoreStamp score={Math.round(weekAvg)} size={48} colorOverride={weekColors} />
              </div>
            </Card>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Card>
              <p className="text-xs font-medium" style={{ color: COLORS.slateLight }}>المعدل العام</p>
              <p className="text-2xl font-bold mt-1" style={{ color: COLORS.ink }}>
                {avg}<span className="text-sm" style={{ color: COLORS.slateLight }}>/10</span>
              </p>
            </Card>
            <Card>
              <p className="text-xs font-medium" style={{ color: COLORS.slateLight }}>أيام مسجّلة</p>
              <p className="text-2xl font-bold mt-1" style={{ color: COLORS.ink }}>{data.length}</p>
            </Card>
          </div>

          <Card>
            <div dir="ltr" style={{ height: 200 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: COLORS.slateLight }} />
                  <YAxis domain={[0, 10]} tick={{ fontSize: 11, fill: COLORS.slateLight }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="score" stroke={COLORS.gold} strokeWidth={2.5} dot={{ fill: COLORS.gold, r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <div className="space-y-2">
            {[...data].reverse().slice(0, 10).map(d => {
              const fullEntry = history.find(h => h.date === d.fullDate)?.entries[selectedId];
              return (
                <Card key={d.fullDate} padding="p-3" className="flex items-center gap-3">
                  <ScoreStamp score={d.score} size={40} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm truncate" style={{ color: COLORS.ink }}>{fullEntry?.text}</p>
                    <p className="text-xs" style={{ color: COLORS.slateLight }}>{d.date}</p>
                  </div>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
