import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { api, configureApi } from './api.js';
import { monthKey } from './format.js';

const Ctx = createContext(null);
export const useStore = () => useContext(Ctx);

const TOKEN_KEY = 'savesmart.token';
const USER_KEY = 'savesmart.user';

// penyimpanan aman (bisa melempar error di mode privat)
const read = (store, key) => { try { return store.getItem(key); } catch { return null; } };
const write = (store, key, val) => { try { store.setItem(key, val); } catch { /* abaikan */ } };
const drop = (store, key) => { try { store.removeItem(key); } catch { /* abaikan */ } };

function loadSession() {
  const token = read(localStorage, TOKEN_KEY) || read(sessionStorage, TOKEN_KEY);
  const raw = read(localStorage, USER_KEY) || read(sessionStorage, USER_KEY);
  let user = null;
  try { user = raw ? JSON.parse(raw) : null; } catch { /* abaikan */ }
  return { token, user };
}

// ---- router berbasis hash: #/nama[/id] ----
function parseHash() {
  const [name, id] = (window.location.hash.replace(/^#\/?/, '') || 'home').split('/');
  return { name: name || 'home', id: id ? decodeURIComponent(id) : undefined };
}

export function StoreProvider({ children }) {
  const [session, setSession] = useState(loadSession);
  const [route, setRoute] = useState(parseHash);
  const [month, setMonth] = useState(monthKey());
  const [unread, setUnread] = useState(0);
  const [toastState, setToast] = useState(null);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const toastTimer = useRef();

  useEffect(() => {
    const on = () => { setRoute(parseHash()); window.scrollTo(0, 0); };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);

  const nav = useCallback((name, id) => {
    const next = `#/${name}${id !== undefined && id !== null ? '/' + encodeURIComponent(id) : ''}`;
    if (window.location.hash === next) setRoute(parseHash());
    else window.location.hash = next;
  }, []);

  const toast = useCallback((message, kind = 'ok') => {
    setToast({ message, kind, key: Date.now() });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3800);
  }, []);

  const login = useCallback((token, user, remember = true) => {
    const store = remember ? localStorage : sessionStorage;
    drop(localStorage, TOKEN_KEY); drop(sessionStorage, TOKEN_KEY);
    drop(localStorage, USER_KEY); drop(sessionStorage, USER_KEY);
    write(store, TOKEN_KEY, token);
    write(store, USER_KEY, JSON.stringify(user));
    setSession({ token, user });
    window.location.hash = '#/home';
  }, []);

  const logout = useCallback(() => {
    [localStorage, sessionStorage].forEach((s) => { drop(s, TOKEN_KEY); drop(s, USER_KEY); });
    setSession({ token: null, user: null });
    setUnread(0);
    setLogoutOpen(false);
    window.location.hash = '#/home';
  }, []);

  const setUser = useCallback((user) => {
    setSession((s) => {
      const store = read(localStorage, TOKEN_KEY) ? localStorage : sessionStorage;
      write(store, USER_KEY, JSON.stringify(user));
      return { ...s, user };
    });
  }, []);

  // hubungkan klien API dengan sesi saat ini
  const tokenRef = useRef(session.token);
  tokenRef.current = session.token;
  useEffect(() => {
    configureApi({
      getToken: () => tokenRef.current,
      onUnauthorized: () => { logout(); toast('Sesi berakhir. Silakan masuk kembali.', 'err'); },
    });
  }, [logout, toast]);

  const refreshUnread = useCallback(async () => {
    if (!tokenRef.current) return;
    try {
      const items = await api.notifications();
      setUnread(items.filter((n) => !n.read).length);
    } catch { /* badge tidak kritis */ }
  }, []);

  useEffect(() => { if (session.token) refreshUnread(); }, [session.token, route.name, refreshUnread]);

  const value = useMemo(() => ({
    token: session.token, user: session.user, setUser,
    route, nav, month, setMonth,
    unread, setUnread, refreshUnread,
    login, logout, logoutOpen, askLogout: () => setLogoutOpen(true), cancelLogout: () => setLogoutOpen(false),
    toast, toastState,
  }), [session, route, nav, month, unread, refreshUnread, login, logout, logoutOpen, toast, toastState, setUser]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

// Hook pengambilan data: { data, loading, error, reload }
export function useFetch(fn, deps = []) {
  const [state, setState] = useState({ loading: true, error: null, data: null });
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let live = true;
    setState((s) => ({ ...s, loading: true, error: null }));
    fn()
      .then((data) => live && setState({ loading: false, error: null, data }))
      .catch((error) => live && setState({ loading: false, error, data: null }));
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);
  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { ...state, reload };
}
