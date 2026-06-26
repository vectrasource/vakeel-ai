// ─── Vakeel AI — Supabase Auth Client ────────────────────────────────────────

const SUPABASE_URL  = 'https://enqqdltgkpiarfdfkfgm.supabase.co';
const SUPABASE_ANON = 'sb_publishable_O_vvU47MMleOpP5fVBXYtQ_giNwa8Of';

const { createClient } = supabase;
const sb = createClient(SUPABASE_URL, SUPABASE_ANON);

// ─── Core auth helpers ────────────────────────────────────────────────────────

async function getSession() {
  const { data } = await sb.auth.getSession();
  return data.session;
}

async function getUser() {
  const { data } = await sb.auth.getUser();
  return data.user;
}

async function signInWithGoogle() {
  const { error } = await sb.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin + '/app.html' },
  });
  if (error) throw error;
}

async function signInWithEmail(email, password) {
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

async function signUpWithEmail(email, password, fullName) {
  const { data, error } = await sb.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } },
  });
  if (error) throw error;
  return data;
}

async function signOut() {
  await sb.auth.signOut();
  window.location.href = 'login.html';
}

// ─── App auth gate ────────────────────────────────────────────────────────────
// Call on DOMContentLoaded in app.html.
// Shows loading overlay, checks session, redirects to login.html if none,
// then populates the nav user widget.

async function initVakeelAuth() {
  const session = await getSession();

  if (!session) {
    window.location.href = 'login.html';
    return;
  }

  // Hide the auth loading overlay
  const overlay = document.getElementById('auth-loading');
  if (overlay) overlay.style.display = 'none';

  // Populate nav user widget
  const user = session.user;
  const email = user.email || '';
  const initials = (user.user_metadata?.full_name || email || 'U')
    .split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  const widget = document.getElementById('nav-user-widget');
  if (widget) {
    widget.style.display = 'flex';
    widget.innerHTML = `
      <div style="position:relative;display:flex;align-items:center;">
        <button onclick="toggleVakeelMenu()" style="display:flex;align-items:center;gap:7px;background:rgba(212,160,23,0.1);border:1px solid rgba(212,160,23,0.3);border-radius:8px;padding:5px 10px;cursor:pointer;color:#ede8dc;font-size:12px;font-weight:600;font-family:'DM Sans',sans-serif;">
          <div style="width:24px;height:24px;border-radius:50%;background:linear-gradient(135deg,#b8860b,#f0c040);display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:800;color:#07070e;flex-shrink:0;">${initials}</div>
          <span style="max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${email}</span>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M6 9l6 6 6-6"/></svg>
        </button>
        <div id="vakeel-user-menu" style="display:none;position:absolute;right:0;top:calc(100% + 8px);background:#0d0d18;border:1px solid rgba(212,160,23,0.25);border-radius:12px;min-width:190px;padding:8px;box-shadow:0 16px 40px rgba(0,0,0,0.6);z-index:1000;">
          <div style="padding:10px 12px;border-bottom:1px solid rgba(212,160,23,0.15);margin-bottom:6px;">
            <p style="font-size:11px;color:rgba(237,232,220,0.4);margin-bottom:2px;font-family:'DM Sans',sans-serif;">Signed in as</p>
            <p style="font-size:12px;font-weight:600;color:#d4a017;word-break:break-all;font-family:'DM Sans',sans-serif;">${email}</p>
          </div>
          <button onclick="signOut()" style="display:block;width:100%;text-align:left;padding:9px 12px;font-size:13px;color:rgba(237,232,220,0.6);background:none;border:none;cursor:pointer;border-radius:7px;transition:background 0.1s;font-family:'DM Sans',sans-serif;" onmouseover="this.style.background='rgba(212,160,23,0.06)'" onmouseout="this.style.background='transparent'">Sign Out</button>
        </div>
      </div>`;
  }

  // Close dropdown on outside click
  document.addEventListener('click', e => {
    const menu = document.getElementById('vakeel-user-menu');
    if (menu && !menu.parentElement.contains(e.target)) menu.style.display = 'none';
  });
}

function toggleVakeelMenu() {
  const m = document.getElementById('vakeel-user-menu');
  if (m) m.style.display = m.style.display === 'none' ? 'block' : 'none';
}
