import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { supabase } from './lib/supabase';

const COLORS = {
  ink: '#20303F',
  mist: '#EEF2EE',
  slate: '#6B7280',
  slateLight: '#9CA39C',
  border: '#E2E5DF',
  gold: '#B8863B',
  goldSoft: '#FBF1E0',
  goldText: '#8A6422',
  brick: '#A8503D',
};

const BODY_FONT = "'IBM Plex Sans Arabic', sans-serif";
const DISPLAY_FONT = "'Reem Kufi', sans-serif";

export default function Auth() {
  const [mode, setMode] = useState('signin'); // signin | signup
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    if (!email.trim() || !password.trim()) return;
    setLoading(true);
    try {
      if (mode === 'signup') {
        const { error: signErr } = await supabase.auth.signUp({ email: email.trim(), password });
        if (signErr) throw signErr;
        setMessage('تم إنشاء الحساب. إذا كان تفعيل البريد مفعّل بمشروعك، تحقق من إيميلك لتأكيد الحساب.');
      } else {
        const { error: signErr } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (signErr) throw signErr;
      }
    } catch (err) {
      setError(err.message || 'صار خطأ، حاول مرة ثانية');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div dir="rtl" style={{ fontFamily: BODY_FONT, backgroundColor: COLORS.mist, minHeight: '100vh' }} className="flex flex-col justify-center px-6">
      <div className="max-w-sm mx-auto w-full">
        <div className="flex justify-center mb-6">
          <div style={{
            width: 64, height: 64, borderRadius: '9999px',
            border: `2.5px solid ${COLORS.gold}`, outline: `1.5px solid ${COLORS.gold}`,
            outlineOffset: '3px', transform: 'rotate(-8deg)',
            backgroundColor: COLORS.goldSoft,
          }} />
        </div>
        <h1 style={{ fontFamily: DISPLAY_FONT, color: COLORS.ink }} className="text-3xl text-center mb-2">التزام</h1>
        <p style={{ color: COLORS.slate }} className="text-sm text-center mb-8">
          {mode === 'signin' ? 'سجّل دخولك لمتابعة أهدافك' : 'أنشئ حساب جديد لبدء التتبع'}
        </p>

        <form onSubmit={handleSubmit} className="space-y-2">
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="البريد الإلكتروني"
            dir="ltr"
            className="w-full rounded-xl p-3 text-sm border text-right"
            style={{ backgroundColor: '#FFFFFF', borderColor: COLORS.border, color: COLORS.ink }}
            required
          />
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="كلمة المرور"
            dir="ltr"
            className="w-full rounded-xl p-3 text-sm border text-right"
            style={{ backgroundColor: '#FFFFFF', borderColor: COLORS.border, color: COLORS.ink }}
            required
            minLength={6}
          />

          {error && <p className="text-xs" style={{ color: COLORS.brick }}>{error}</p>}
          {message && <p className="text-xs" style={{ color: COLORS.goldText }}>{message}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full font-bold py-2.5 rounded-xl flex items-center justify-center gap-2 mt-2"
            style={{ backgroundColor: loading ? '#E2E5DF' : COLORS.gold, color: loading ? COLORS.slateLight : '#FFFFFF' }}
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : (mode === 'signin' ? 'تسجيل الدخول' : 'إنشاء حساب')}
          </button>
        </form>

        <button
          onClick={() => { setMode(m => (m === 'signin' ? 'signup' : 'signin')); setError(null); setMessage(null); }}
          className="w-full text-center text-sm mt-4 font-medium"
          style={{ color: COLORS.gold }}
        >
          {mode === 'signin' ? 'ما عندك حساب؟ أنشئ واحد' : 'عندك حساب؟ سجّل دخولك'}
        </button>
      </div>
    </div>
  );
}
