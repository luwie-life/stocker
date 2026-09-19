import { api, clearSession } from '../api/client.js';
import { requireAuthenticatedSession } from '../auth/guard.js';
import { escapeHtml, formatMoney, showToast } from '../shared/ui.js';
const content = document.getElementById('platform-content');
document.getElementById('platform-logout').addEventListener('click', () => { clearSession(); location.href = 'login.html'; });
const platformSession = await requireAuthenticatedSession();
if (!platformSession.isPlatformAdmin) {
  location.replace('index.html');
  throw new Error('platform admin access required');
}
window.addEventListener('pageshow', async (event) => { if (event.persisted) await requireAuthenticatedSession(); });

function render(data, feedback, users, ambassadors, messages, businesses) {
  content.innerHTML = `
    <div class="stats-grid">
      <div class="card stat-card"><span class="stat-label">Businesses</span><strong class="stat-value">${data.businesses}</strong></div>
      <div class="card stat-card"><span class="stat-label">Users</span><strong class="stat-value">${data.users}</strong></div>
      <div class="card stat-card"><span class="stat-label">Active ambassadors</span><strong class="stat-value">${data.activeAmbassadors}</strong></div>
      <div class="card stat-card"><span class="stat-label">Commission owed</span><strong class="stat-value">${formatMoney(data.commissionsOwedMinor)}</strong></div>
    </div>

    <section class="card">
      <div class="section-header"><div><h2 class="card-title">Plans and trial access</h2><p class="card-subtitle">Set Starter, Growth, or Custom access. Trial and paid access can be extended without database work.</p></div></div>
      ${businesses.length ? `<div class="table-wrap"><table><thead><tr><th>Business</th><th>Current</th><th>Plan</th><th>Trial days</th><th>Paid days</th><th>Save</th></tr></thead><tbody>${businesses.map((business) => `<tr><td>${escapeHtml(business.name)}<br><small>${escapeHtml(business.type)}</small></td><td><span class="badge ${business.subscription?.status === 'PAUSED' ? 'badge-danger' : 'badge-success'}">${escapeHtml(business.subscription?.status || 'TRIAL')}</span></td><td><select class="business-plan" data-id="${business._id}"><option value="STARTER" ${business.subscription?.plan === 'STARTER' ? 'selected' : ''}>Starter · ₦15k</option><option value="GROWTH" ${business.subscription?.plan === 'GROWTH' ? 'selected' : ''}>Growth · ₦25k</option><option value="CUSTOM" ${business.subscription?.plan === 'CUSTOM' ? 'selected' : ''}>Custom</option></select></td><td><input class="business-trial-days" data-id="${business._id}" type="number" min="0" placeholder="7" style="max-width:78px"></td><td><input class="business-access-days" data-id="${business._id}" type="number" min="0" placeholder="30" style="max-width:78px"></td><td><button class="btn btn-secondary save-business-plan" data-id="${business._id}" type="button">Save</button></td></tr>`).join('')}</tbody></table></div>` : '<div class="empty-state">No businesses found.</div>'}
    </section>

    <section class="card">
      <div class="section-header">
        <div><h2 class="card-title">Invite super admin</h2><p class="card-subtitle">Create another platform-level admin without touching the database directly.</p></div>
      </div>
      <form id="invite-super-admin-form" class="stacked-form">
        <div class="field"><label>Full name</label><input name="fullName" required></div>
        <div class="field"><label>Email</label><input name="email" type="email" required></div>
        <div class="field"><label>Temporary password</label><input name="password" placeholder="Optional; random password used if blank"></div>
        <button class="btn btn-primary" type="submit">Invite super admin</button>
      </form>
    </section>

    <section class="card">
      <div class="section-header">
        <div><h2 class="card-title">Marketing video</h2><p class="card-subtitle">Add a YouTube link or embed URL that appears on the public marketing page.</p></div>
      </div>
      <form id="marketing-video-form" class="stacked-form">
        <div class="field"><label>Video title</label><input name="title" required></div>
        <div class="field"><label>YouTube link or embed URL</label><input name="url" required placeholder="https://www.youtube.com/watch?v=... or https://www.youtube.com/embed/..."></div>
        <div class="field"><label>Description</label><textarea name="description" rows="3" placeholder="Short description for the marketing page"></textarea></div>
        <button class="btn btn-primary" type="submit">Publish tutorial</button>
      </form>
    </section>

    <section class="card">
      <div class="section-header"><div><h2 class="card-title">Feedback inbox</h2><p class="card-subtitle">${data.openFeedback} open conversation(s).</p></div></div>
      ${feedback.length ? `<div class="table-wrap"><table><thead><tr><th>Business</th><th>Subject</th><th>Status</th><th>Reply</th></tr></thead><tbody>${feedback.map((item) => `<tr><td>${escapeHtml(item.business?.name || 'Business')}</td><td>${escapeHtml(item.subject)}</td><td>${escapeHtml(item.status)}</td><td><button class="btn btn-secondary reply-feedback" data-id="${item._id}" type="button">Reply</button></td></tr>`).join('')}</tbody></table></div>` : '<div class="empty-state">No feedback needs attention.</div>'}
    </section>

    <section class="card">
      <div class="section-header"><div><h2 class="card-title">Ambassador applications and targets</h2><p class="card-subtitle">Approve applications, suspend access, and set the referral goal shown on each ambassador dashboard.</p></div></div>
      ${ambassadors.length ? `<div class="table-wrap"><table><thead><tr><th>Ambassador</th><th>Status</th><th>Referrals</th><th>Target</th><th>Actions</th></tr></thead><tbody>${ambassadors.map((item) => `<tr><td>${escapeHtml(item.user?.fullName || 'Unknown')}<br><small>${escapeHtml(item.user?.email || '')}</small></td><td><select class="ambassador-status" data-id="${item._id}"><option ${item.status === 'PENDING' ? 'selected' : ''}>PENDING</option><option ${item.status === 'ACTIVE' ? 'selected' : ''}>ACTIVE</option><option ${item.status === 'SUSPENDED' ? 'selected' : ''}>SUSPENDED</option></select></td><td>${item.referralCount || 0}</td><td><input class="ambassador-target" data-id="${item._id}" type="number" min="0" value="${item.target?.referrals || 0}" style="max-width:90px"></td><td><button class="btn btn-secondary save-ambassador" data-id="${item._id}" type="button">Save</button></td></tr>`).join('')}</tbody></table></div>` : '<div class="empty-state">No ambassador applications yet.</div>'}
    </section>

    <section class="card">
      <div class="section-header"><div><h2 class="card-title">User access</h2><p class="card-subtitle">Suspend a user to immediately revoke API access across their sessions.</p></div></div>
      ${users.length ? `<div class="table-wrap"><table><thead><tr><th>User</th><th>Role</th><th>Status</th><th>Action</th></tr></thead><tbody>${users.map((user) => `<tr><td>${escapeHtml(user.fullName)}<br><small>${escapeHtml(user.email)}</small></td><td>${escapeHtml(user.platformRole || 'Business user')}</td><td>${escapeHtml(user.status)}</td><td>${user._id === data.currentUserId ? '<small>Current account</small>' : `<button class="btn btn-secondary toggle-user" data-id="${user._id}" data-status="${user.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE'}" type="button">${user.status === 'ACTIVE' ? 'Suspend' : 'Restore'}</button>`}</td></tr>`).join('')}</tbody></table></div>` : '<div class="empty-state">No users found.</div>'}
    </section>

    <section class="card">
      <div class="section-header"><div><h2 class="card-title">Send platform message</h2><p class="card-subtitle">Send to one user, every ambassador, or all business users.</p></div></div>
      <form id="platform-message-form" class="stacked-form"><div class="field"><label>Audience</label><select id="platform-message-audience"><option value="AMBASSADORS">All ambassadors</option><option value="BUSINESS_USERS">All business users</option>${users.filter((user) => !user.platformRole).map((user) => `<option value="${user._id}">${escapeHtml(user.fullName)} · ${escapeHtml(user.email)}</option>`).join('')}</select></div><div class="field"><label>Subject</label><input id="platform-message-subject" required></div><div class="field"><label>Message</label><textarea id="platform-message-body" rows="4" required></textarea></div><button class="btn btn-primary" type="submit">Send message</button></form>
      ${messages.length ? `<div class="table-wrap" style="margin-top:20px"><table><thead><tr><th>Inbox message</th><th>From</th><th>Sent</th><th>Reply</th></tr></thead><tbody>${messages.slice(0, 8).map((item) => `<tr><td>${escapeHtml(item.subject)}<br><small>${escapeHtml(item.message)}</small></td><td>${escapeHtml(item.sender?.email || 'User')}</td><td>${escapeHtml(new Date(item.createdAt).toLocaleString())}</td><td><button class="btn btn-secondary reply-platform-message" data-id="${item.sender?._id || ''}" data-subject="${escapeHtml(item.subject)}" type="button">Reply</button></td></tr>`).join('')}</tbody></table></div>` : '<div class="empty-state">No incoming platform messages.</div>'}
    </section>
  `;

  content.querySelectorAll('.reply-feedback').forEach((button) => button.addEventListener('click', async () => { const item = feedback.find((entry) => entry._id === button.dataset.id); const response = window.prompt(`Reply to: ${item.subject}`); if (!response) return; try { await api.patch(`/platform-admin/feedback/${item._id}`, { adminResponse: response, status: 'IN_PROGRESS' }); showToast('Reply sent.', 'success'); await load(); } catch (error) { showToast(error.message, 'error'); } }));

  const inviteForm = document.getElementById('invite-super-admin-form');
  inviteForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const formData = new FormData(inviteForm);
    try {
      const payload = {
        fullName: String(formData.get('fullName') || '').trim(),
        email: String(formData.get('email') || '').trim(),
        password: String(formData.get('password') || '').trim(),
      };
      const res = await api.post('/platform-admin/invite-super-admin', payload);
      showToast(`Super admin invited: ${res.data.user.email}`, 'success');
      inviteForm.reset();
    } catch (error) {
      showToast(error.message, 'error');
    }
  });

  const marketingForm = document.getElementById('marketing-video-form');
  marketingForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const formData = new FormData(marketingForm);
    try {
      const payload = {
        title: String(formData.get('title') || '').trim(),
        url: String(formData.get('url') || '').trim(),
        description: String(formData.get('description') || '').trim(),
      };
      await api.post('/platform-admin/marketing', payload);
      showToast('Tutorial published to the marketing page.', 'success');
      marketingForm.reset();
    } catch (error) {
      showToast(error.message, 'error');
    }
  });

  content.querySelectorAll('.save-ambassador').forEach((button) => button.addEventListener('click', async () => {
    const id = button.dataset.id;
    const status = content.querySelector(`.ambassador-status[data-id="${id}"]`).value;
    const referrals = Number(content.querySelector(`.ambassador-target[data-id="${id}"]`).value);
    try { await api.patch(`/platform-admin/ambassadors/${id}`, { status, target: { referrals, period: 'MONTHLY' } }); showToast('Ambassador updated.', 'success'); await load(); } catch (error) { showToast(error.message, 'error'); }
  }));

  content.querySelectorAll('.toggle-user').forEach((button) => button.addEventListener('click', async () => {
    try { await api.patch(`/platform-admin/users/${button.dataset.id}/status`, { status: button.dataset.status }); showToast('User access updated.', 'success'); await load(); } catch (error) { showToast(error.message, 'error'); }
  }));

  document.getElementById('platform-message-form')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const audience = document.getElementById('platform-message-audience').value;
    try { await api.post('/platform-admin/messages', { audience: audience === 'BUSINESS_USERS' ? undefined : audience, recipientId: audience === 'AMBASSADORS' || audience === 'BUSINESS_USERS' ? undefined : audience, subject: document.getElementById('platform-message-subject').value.trim(), message: document.getElementById('platform-message-body').value.trim() }); event.target.reset(); showToast('Message sent.', 'success'); await load(); } catch (error) { showToast(error.message, 'error'); }
  });

  content.querySelectorAll('.reply-platform-message').forEach((button) => button.addEventListener('click', async () => {
    const message = window.prompt(`Reply to ${button.dataset.subject}:`);
    if (!message || !button.dataset.id) return;
    try { await api.post('/platform-admin/messages', { recipientId: button.dataset.id, subject: `Re: ${button.dataset.subject}`, message }); showToast('Reply sent.', 'success'); await load(); } catch (error) { showToast(error.message, 'error'); }
  }));

  content.querySelectorAll('.save-business-plan').forEach((button) => button.addEventListener('click', async () => {
    const id = button.dataset.id;
    const trialValue = content.querySelector(`.business-trial-days[data-id="${id}"]`).value;
    const accessValue = content.querySelector(`.business-access-days[data-id="${id}"]`).value;
    const body = { plan: content.querySelector(`.business-plan[data-id="${id}"]`).value };
    if (trialValue !== '') body.trialDays = Number(trialValue);
    if (accessValue !== '') body.accessDays = Number(accessValue);
    try { await api.patch(`/platform-admin/businesses/${id}/subscription`, body); showToast('Business access updated.', 'success'); await load(); } catch (error) { showToast(error.message, 'error'); }
  }));
}
async function load() { try { const [overview, feedback, users, ambassadors, messages, businesses, currentSession] = await Promise.all([api.get('/platform-admin/overview'), api.get('/platform-admin/feedback'), api.get('/platform-admin/users'), api.get('/platform-admin/ambassadors'), api.get('/platform-admin/messages'), api.get('/platform-admin/businesses'), api.get('/auth/session')]); render({ ...overview.data, currentUserId: currentSession.data.user.id }, feedback.data, users.data, ambassadors.data, messages.data, businesses.data); } catch (error) { content.innerHTML = `<div class="empty-state"><h3>Platform access unavailable</h3><p>${escapeHtml(error.message)}</p></div>`; showToast(error.message, 'error'); } }
await load();
