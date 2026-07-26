import { useEffect, useState } from 'react';
import { AuthShell, Card, FloatField } from '../../shared/components/ui';
import { C, FONT_HEAD } from '../../shared/constants/theme';
import { LanguageSwitcher } from '../../shared/components/LanguageSwitcher';
import { useI18n } from '../../shared/i18n';

export function LoginScreen({
  initialEmail,
  onSubmit,
  error,
  info,
  pending,
}: {
  initialEmail?: string;
  onSubmit: (email: string, password: string) => void | Promise<void>;
  error?: string;
  info?: string;
  pending?: boolean;
}) {
  const { t } = useI18n();
  const [email, setEmail] = useState(initialEmail || '');
  const [pass, setPass] = useState('');

  useEffect(() => {
    setEmail(initialEmail || '');
  }, [initialEmail]);

  return (
    <AuthShell topRight={<LanguageSwitcher compact />}>
      <div style={{ maxWidth: 460, margin: '0 auto', padding: '20px 24px 60px', animation: 'furliRise 0.4s ease' }}>
        <Card style={{ padding: '34px 32px' }}>
          <h2 style={{ fontFamily: FONT_HEAD, fontSize: 26, fontWeight: 700, textAlign: 'center' }}>{t('auth.login.title')}</h2>
          <p style={{ fontSize: 13.5, color: C.textMuted, textAlign: 'center', margin: '8px 0 24px', lineHeight: 1.5 }}>{t('auth.login.description')}</p>
          {info ? <div style={{ marginBottom: 14, borderRadius: 12, background: C.bgInput, border: `1px solid ${C.border}`, color: C.textSecondary, padding: '12px 14px', fontSize: 13, lineHeight: 1.5 }}>{info}</div> : null}
          {error ? <div style={{ marginBottom: 14, borderRadius: 12, border: `1px solid ${C.roseDark}`, background: 'oklch(0.97 0.02 20 / 0.9)', color: C.roseDark, padding: '12px 14px', fontSize: 13, lineHeight: 1.5 }}>{error}</div> : null}
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void onSubmit(email, pass);
            }}
            style={{ display: 'flex', flexDirection: 'column', gap: 14 }}
          >
            <FloatField label={t('auth.login.email')} value={email} onChange={setEmail} type="email" />
            <FloatField label={t('auth.login.password')} value={pass} onChange={setPass} type="password" />
            <button
              type="submit"
              disabled={pending || !email.trim() || !pass.trim()}
              style={{ width: '100%', padding: '15px 0', borderRadius: 14, border: 'none', background: pending || !email.trim() || !pass.trim() ? C.bgMuted : C.primary, color: pending || !email.trim() || !pass.trim() ? C.textMuted : '#fff', fontSize: 15, fontWeight: 700, cursor: pending || !email.trim() || !pass.trim() ? 'not-allowed' : 'pointer' }}
            >
              {pending ? t('auth.login.pending') : t('common.actions.login')}
            </button>
            <div style={{ fontSize: 11.5, color: C.textMuted, textAlign: 'center', lineHeight: 1.5 }}>{t('auth.login.hint')}</div>
          </form>
        </Card>
      </div>
    </AuthShell>
  );
}
