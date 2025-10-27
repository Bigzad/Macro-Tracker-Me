/* auth-manager.js — Unified Auth Manager */
;(function () {
  if (window.authWrapper && window.__AUTH_MANAGER_READY__) return;

  if (!window.supabaseClient) {
    console.error("[auth-manager] Expected supabase-config.js before this file.");
  }

  var _listeners = { init: [], login: [], logout: [], error: [] };
  var _onceFlags = { init: false };

  function on(event, cb) { (_listeners[event] ||= []).push(cb); }
  function off(event, cb) {
    if (!_listeners[event]) return;
    if (!cb) return (_listeners[event] = []);
    _listeners[event] = _listeners[event].filter(fn => fn !== cb);
  }
  function _emit(event, payload) { (_listeners[event] || []).forEach(fn => { try { fn(payload); } catch(e) { console.error(e); } }); }

  async function init() {
    try {
      var { data: { session } } = await window.supabaseClient.auth.getSession();
      if (!_onceFlags.init) { _emit("init", session); _onceFlags.init = true; }
      if (!window.__AUTH_STATE_SUBSCRIBED__) {
        window.supabaseClient.auth.onAuthStateChange((ev, s) => {
          if (ev === "SIGNED_IN") _emit("login", s);
          else if (ev === "SIGNED_OUT") _emit("logout", null);
        });
        window.__AUTH_STATE_SUBSCRIBED__ = true;
      }
      return session;
    } catch (e) { _emit("error", e); return null; }
  }

  async function signIn(email, password) {
    var { data, error } = await window.supabaseClient.auth.signInWithPassword({ email, password });
    if (error) _emit("error", error); else _emit("login", data.session);
    return { data, error };
  }

  async function signUp(email, password, meta) {
    return window.supabaseClient.auth.signUp({ email, password, options: { data: meta || {} } });
  }

  async function signOut() {
    var res = await window.supabaseClient.auth.signOut();
    if (res.error) _emit("error", res.error); else _emit("logout", null);
    return res;
  }

  async function getSession() {
    var { data: { session } } = await window.supabaseClient.auth.getSession();
    return session;
  }

  async function requireAuthOrRedirect(loginPage) {
    var s = await getSession();
    if (!s) window.location.href = loginPage || "index.html";
    return !!s;
  }
  function redirectIfAuthed(appPage) { getSession().then(s => { if (s) location.href = appPage || "app.html"; }); }

  window.authWrapper = { init, on, off, signIn, signUp, signOut, getSession, requireAuthOrRedirect, redirectIfAuthed };
  window.__AUTH_MANAGER_READY__ = true;
})();