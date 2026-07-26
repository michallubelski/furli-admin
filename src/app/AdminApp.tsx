import { useCallback, useEffect, useState } from 'react';
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { LoginScreen } from '../features/auth/LoginScreen';
import { AuthApiError, loginAdmin, logoutSession, type AdminSession } from '../features/auth/api';
import { AdminRoutes } from '../features/admin/routes';
import { loadAuth, saveAuth } from '../shared/utils/furli';
import { registerUnauthorizedHandler } from '../shared/api/client';
import { useI18n } from '../shared/i18n';

function PublicOnly({ session, children }: { session: AdminSession | null; children: JSX.Element }) {
  if (session) {
    return <Navigate to="/" replace />;
  }
  return children;
}

export function AdminApp() {
  const { t } = useI18n();
  const [session, setSession] = useState<AdminSession | null>(() => loadAuth());
  const [loginEmail, setLoginEmail] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginInfo, setLoginInfo] = useState('');
  const [loginPending, setLoginPending] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    registerUnauthorizedHandler((error) => {
      saveAuth(null);
      setSession(null);
      setLoginError('');
      setLoginInfo(error.status === 401 ? t('auth.messages.sessionExpired') : t('auth.messages.sessionExpired'));
      navigate('/login', { replace: true });
    });
    return () => {
      registerUnauthorizedHandler(null);
    };
  }, [navigate, t]);

  const doLogin = useCallback(async (email: string, password: string) => {
    setLoginPending(true);
    setLoginError('');
    setLoginInfo('');
    try {
      const nextSession = await loginAdmin({ email, password });
      saveAuth(nextSession);
      setSession(nextSession);
      setLoginEmail(email);
      navigate('/', { replace: true });
    } catch (error) {
      setLoginError(error instanceof AuthApiError ? error.message : t('auth.messages.loginFailed'));
    } finally {
      setLoginPending(false);
    }
  }, [navigate, t]);

  const doLogout = useCallback(async () => {
    const activeSession = session;
    saveAuth(null);
    setSession(null);
    setLoginInfo(t('auth.messages.loggedOut'));
    setLoginError('');
    navigate('/login', { replace: true });
    if (activeSession?.accessToken) {
      try {
        await logoutSession(activeSession);
      } catch {
        setLoginInfo(t('auth.messages.loggedOutLocally'));
      }
    }
  }, [navigate, session, t]);

  return (
    <Routes>
      <Route
        path="/login"
        element={
          <PublicOnly session={session}>
            <LoginScreen initialEmail={loginEmail} onSubmit={doLogin} error={loginError} info={loginInfo} pending={loginPending} />
          </PublicOnly>
        }
      />
      <Route
        path="/*"
        element={session ? <AdminRoutes accessToken={session.accessToken} onLogout={doLogout} /> : <Navigate to="/login" replace />}
      />
    </Routes>
  );
}
