/* ============================================================
   coach.js — 教練後台邏輯
   ============================================================ */

let allCourses = [];
let currentRegCourseId = null;

// ── API ──────────────────────────────────────────────────────
async function apiGet(params) {
  const url = CONFIG.GAS_URL + '?' + new URLSearchParams(params);
  const res = await fetch(url, { redirect: 'follow' });
  return res.json();
}

async function apiPost(body) {
  const res = await fetch(CONFIG.GAS_URL, {
    method: 'POST',
    redirect: 'follow',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(body)
  });
  return res.json();
}

// ── Toast ─────────────────────────────────────────────────────
function showToast(msg, type = 'info') {
  const icons = { success: '✅', error: '❌', info: 'ℹ️' };
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `<span>${icons[type]}</span><span>${msg}</span>`;
  document.getElementById('toast-container').appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

// ── Tab 切換 ─────────────────────────────────────────────────
function switchTab(tab) {
  ['courses', 'regs'].forEach(t => {
    document.getElementById(`tab-${t}`).classList.toggle('active', t === tab);
    document.getElementById(`tab-${t}-btn`).classList.toggle('active', t === tab);
  });
}

// ── 統計列 ───────────────────────────────────────────────────
function updateStats(courses) {
  const open   = courses.filter(c => c.status === 'open').length;
  const closed = courses.filter(c => c.status === 'closed').length;
  const regs   = courses.reduce((s, c) => s + c.registered_count, 0);

  document.getElementById('stat-total').textContent  = courses.length;
  document.getElementById('stat-open').textContent   = open;
  document.getElementById('stat-closed').textContent = closed;
  document.getElementById('stat-regs').textContent   = regs;
}

// ── 課程管理 ─────────────────────────────────────────────────
async function loadCourses() {
  const wrap = document.getElementById('courses-table-wrap');
  wrap.innerHTML = `<div class="loader-wrap"><div class="spinner"></div><p>載入中…</p></div>`;

  try {
    const data = await apiGet({ action: 'getAllCourses' });
    if (!data.success) throw new Error(data.error);

    allCourses = data.courses;
    allCourses.sort((a, b) => String(a.date).localeCompare(String(b.date)));

    updateStats(allCourses);
    updateCourseSelector(allCourses);
    renderCoursesTable(allCourses);

  } catch (err) {
    wrap.innerHTML = `
      <div class="empty-state">
        <div class="icon">⚠️</div>
        <p>載入失敗：${err.message}</p>
        <button class="btn btn-secondary" onclick="loadCourses()">重試</button>
      </div>`;
  }
}

function renderCoursesTable(courses) {
  const wrap = document.getElementById('courses-table-wrap');

  if (!courses.length) {
    wrap.innerHTML = `
      <div class="empty-state">
        <div class="icon">📋</div>
        <p>尚無課程，點擊「新增課程」開始建立</p>
      </div>`;
    return;
  }

  wrap.innerHTML = `
    <div class="table-wrap">
      <table class="data-table">
        <thead>
          <tr>
            <th>日期</th>
            <th>時間</th>
            <th>地點</th>
            <th>教練</th>
            <th>費用</th>
            <th>人數</th>
            <th>狀態</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody id="courses-tbody"></tbody>
      </table>
    </div>`;

  const tbody = document.getElementById('courses-tbody');
  courses.forEach(c => {
    const tr = document.createElement('tr');
    const isOpen = c.status === 'open';

    tr.innerHTML = `
      <td><strong>${c.date}</strong></td>
      <td style="color:var(--accent)">${c.time}</td>
      <td>${c.location}</td>
      <td>${c.coach}</td>
      <td>$${c.fee}</td>
      <td>
        <span style="font-size:.85rem">
          ${c.registered_count} / ${c.max_capacity}
          <span style="color:var(--text-3)">（餘 ${c.remaining}）</span>
        </span>
      </td>
      <td>
        <span class="badge ${isOpen ? 'badge-open' : 'badge-closed'}">
          ${isOpen ? '開放中' : '已關閉'}
        </span>
      </td>
      <td>
        <div class="actions-cell">
          <button class="btn btn-info btn-sm" onclick="openCourseModal('${c.course_id}')">編輯</button>
          <button class="btn btn-sm ${isOpen ? 'btn-warning' : 'btn-success'}"
            onclick="toggleCourseStatus('${c.course_id}', '${isOpen ? 'closed' : 'open'}', '${c.date}')">
            ${isOpen ? '關閉' : '開放'}
          </button>
          <button class="btn btn-danger btn-sm" onclick="confirmDelete('${c.course_id}', '${c.date}')">刪除</button>
        </div>
      </td>`;
    tbody.appendChild(tr);
  });
}

// ── 課程 Modal ────────────────────────────────────────────────
function openCourseModal(courseId = null) {
  const isEdit = Boolean(courseId);
  document.getElementById('course-modal-title').textContent = isEdit ? '修改課程' : '新增課程';
  document.getElementById('save-course-btn').textContent = isEdit ? '儲存修改' : '建立課程';
  document.getElementById('edit-course-id').value = courseId || '';

  if (isEdit) {
    const course = allCourses.find(c => c.course_id === courseId);
    if (!course) return;
    // date input 格式需為 YYYY-MM-DD
    const dateParts = String(course.date).replace(/\//g, '-');
    document.getElementById('c-date').value     = dateParts;
    document.getElementById('c-time').value     = course.time;
    document.getElementById('c-location').value = course.location;
    document.getElementById('c-coach').value    = course.coach;
    document.getElementById('c-capacity').value = course.max_capacity;
    document.getElementById('c-fee').value      = course.fee;
    document.getElementById('c-notes').value    = course.notes || '';
  } else {
    document.getElementById('c-date').value     = '';
    document.getElementById('c-time').value     = '';
    document.getElementById('c-location').value = '';
    document.getElementById('c-coach').value    = '';
    document.getElementById('c-capacity').value = '';
    document.getElementById('c-fee').value      = '';
    document.getElementById('c-notes').value    = '';
  }

  document.getElementById('course-modal-overlay').classList.add('open');
}

function closeCourseModal() {
  document.getElementById('course-modal-overlay').classList.remove('open');
}

async function saveCourse() {
  const courseId  = document.getElementById('edit-course-id').value;
  const date      = document.getElementById('c-date').value;
  const time      = document.getElementById('c-time').value.trim();
  const location  = document.getElementById('c-location').value.trim();
  const coach     = document.getElementById('c-coach').value.trim();
  const capacity  = document.getElementById('c-capacity').value;
  const fee       = document.getElementById('c-fee').value;
  const notes     = document.getElementById('c-notes').value.trim();

  if (!date || !time || !location || !coach || !capacity || !fee) {
    showToast('請填寫所有必填欄位', 'error');
    return;
  }

  // 日期格式轉換 YYYY-MM-DD → YYYY/MM/DD
  const formattedDate = date.replace(/-/g, '/');

  const btn = document.getElementById('save-course-btn');
  btn.disabled = true;
  btn.textContent = '儲存中…';

  try {
    const isEdit = Boolean(courseId);
    const action = isEdit ? 'updateCourse' : 'createCourse';
    const body = isEdit
      ? { action, courseId, date: formattedDate, time, location, coach, max_capacity: capacity, fee, notes }
      : { action, date: formattedDate, time, location, coach, max_capacity: capacity, fee, notes };

    const res = await apiPost(body);
    if (!res.success) throw new Error(res.error);

    closeCourseModal();
    showToast(isEdit ? '課程已更新' : '課程已建立', 'success');
    await loadCourses();

  } catch (err) {
    showToast(`儲存失敗：${err.message}`, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = courseId ? '儲存修改' : '建立課程';
  }
}

// ── 切換課程狀態 ──────────────────────────────────────────────
async function toggleCourseStatus(courseId, newStatus, dateLabel) {
  const action = newStatus === 'open' ? '開放' : '關閉';
  try {
    const res = await apiPost({ action: 'toggleStatus', courseId, status: newStatus });
    if (!res.success) throw new Error(res.error);
    showToast(`${dateLabel} 課程已${action}報名`, 'success');
    await loadCourses();
    // 如果當前在報名管理 tab 且選的是同一課程，刷新報名列表
    if (currentRegCourseId === courseId) loadRegistrations(courseId);
  } catch (err) {
    showToast(`操作失敗：${err.message}`, 'error');
  }
}

// ── 確認刪除 ─────────────────────────────────────────────────
let pendingDeleteId = null;

function confirmDelete(courseId, dateLabel) {
  pendingDeleteId = courseId;
  document.getElementById('confirm-title').textContent = '確認刪除課程？';
  document.getElementById('confirm-msg').textContent = `將刪除 ${dateLabel} 的課程，所有報名資料也會一併刪除，且無法復原。`;
  document.getElementById('confirm-ok-btn').onclick = doDeleteCourse;
  document.getElementById('confirm-overlay').classList.add('open');
}

function closeConfirm() {
  pendingDeleteId = null;
  document.getElementById('confirm-overlay').classList.remove('open');
}

async function doDeleteCourse() {
  if (!pendingDeleteId) return;
  const btn = document.getElementById('confirm-ok-btn');
  btn.disabled = true;
  btn.textContent = '刪除中…';

  try {
    const res = await apiPost({ action: 'deleteCourse', courseId: pendingDeleteId });
    if (!res.success) throw new Error(res.error);
    closeConfirm();
    showToast('課程已刪除', 'success');
    await loadCourses();
  } catch (err) {
    showToast(`刪除失敗：${err.message}`, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = '確認刪除';
  }
}

// ── 報名管理 ─────────────────────────────────────────────────
function updateCourseSelector(courses) {
  const sel = document.getElementById('reg-course-select');
  const prevVal = sel.value;
  sel.innerHTML = '<option value="">— 請選擇課程 —</option>';
  courses.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c.course_id;
    opt.textContent = `${c.date} ${c.time} | ${c.location} (${c.registered_count}/${c.max_capacity})`;
    sel.appendChild(opt);
  });
  // 保持原本選擇
  if (prevVal) sel.value = prevVal;
}

function refreshRegs() {
  if (currentRegCourseId) loadRegistrations(currentRegCourseId);
}

async function loadRegistrations(courseId) {
  if (!courseId) return;
  currentRegCourseId = courseId;

  const wrap = document.getElementById('regs-table-wrap');
  wrap.innerHTML = `<div class="loader-wrap"><div class="spinner"></div><p>載入中…</p></div>`;

  try {
    const data = await apiGet({ action: 'getRegistrations', courseId });
    if (!data.success) throw new Error(data.error);

    const regs = data.registrations;
    renderRegsTable(regs, courseId);

  } catch (err) {
    wrap.innerHTML = `
      <div class="empty-state">
        <div class="icon">⚠️</div>
        <p>載入失敗：${err.message}</p>
      </div>`;
  }
}

function renderRegsTable(regs, courseId) {
  const wrap = document.getElementById('regs-table-wrap');

  if (!regs.length) {
    wrap.innerHTML = `
      <div class="empty-state">
        <div class="icon">📭</div>
        <p>此課程尚無報名資料</p>
      </div>`;
    return;
  }

  // 統計
  const active = regs.filter(r => r.reg_status === 'active');
  const totalPeople = active.reduce((s, r) => s + r.count, 0);
  const paid = active.filter(r => r.payment_status === 'paid').reduce((s, r) => s + r.count, 0);
  const unpaid = totalPeople - paid;

  wrap.innerHTML = `
    <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px">
      <div class="stat-card" style="flex:1;min-width:100px">
        <div class="stat-number" style="font-size:1.4rem;color:var(--info)">${regs.length}</div>
        <div class="stat-label">筆報名</div>
      </div>
      <div class="stat-card" style="flex:1;min-width:100px">
        <div class="stat-number" style="font-size:1.4rem;color:var(--success)">${totalPeople}</div>
        <div class="stat-label">有效人數</div>
      </div>
      <div class="stat-card" style="flex:1;min-width:100px">
        <div class="stat-number" style="font-size:1.4rem;color:var(--success)">${paid}</div>
        <div class="stat-label">已繳費</div>
      </div>
      <div class="stat-card" style="flex:1;min-width:100px">
        <div class="stat-number" style="font-size:1.4rem;color:var(--warning)">${unpaid}</div>
        <div class="stat-label">未繳費</div>
      </div>
    </div>
    <div class="table-wrap">
      <table class="data-table">
        <thead>
          <tr>
            <th>姓名</th>
            <th>手機</th>
            <th>人數</th>
            <th>備註</th>
            <th>報名狀態</th>
            <th>繳費狀態</th>
            <th>退費狀態</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody id="regs-tbody"></tbody>
      </table>
    </div>`;

  const tbody = document.getElementById('regs-tbody');
  regs.forEach(r => {
    const isActive    = r.reg_status === 'active';
    const isPaid      = r.payment_status === 'paid';
    const isCancelled = r.reg_status === 'cancelled';
    const isRefunded  = r.refund_status === 'refunded';

    const tr = document.createElement('tr');
    if (isCancelled) tr.style.opacity = '0.55';

    tr.innerHTML = `
      <td><strong>${r.name}</strong></td>
      <td style="color:var(--text-2)">${r.phone}</td>
      <td><span class="badge badge-active">${r.count} 人</span></td>
      <td style="color:var(--text-2);max-width:120px;word-break:break-all">${r.notes || '—'}</td>
      <td>
        <span class="badge ${isActive ? 'badge-active' : 'badge-cancelled'}">
          ${isActive ? '已報名' : '已取消'}
        </span>
      </td>
      <td>
        <span class="badge ${isPaid ? 'badge-paid' : 'badge-unpaid'}">
          ${isPaid ? '已繳' : '未繳'}
        </span>
      </td>
      <td>
        ${isCancelled && isPaid
          ? `<span class="badge ${isRefunded ? 'badge-refunded' : 'badge-unpaid'}">${isRefunded ? '已退費' : '待退費'}</span>`
          : '<span style="color:var(--text-3)">—</span>'}
      </td>
      <td>
        <div class="actions-cell">
          ${isActive
            ? `<button class="btn btn-info btn-sm" onclick="openRegModal('${r.reg_id}')">編輯</button>
               <button class="btn btn-danger btn-sm" onclick="cancelReg('${r.reg_id}', '${r.name}')">取消報名</button>
               <button class="btn btn-sm ${isPaid ? 'btn-warning' : 'btn-success'}"
                 onclick="togglePayment('${r.reg_id}', '${isPaid ? 'unpaid' : 'paid'}')">
                 ${isPaid ? '標記未繳' : '標記已繳'}
               </button>`
            : `<button class="btn btn-success btn-sm" onclick="restoreReg('${r.reg_id}', '${r.name}')">恢復報名</button>
               ${isCancelled && isPaid && !isRefunded
                 ? `<button class="btn btn-warning btn-sm" onclick="markRefunded('${r.reg_id}')">標記已退費</button>`
                 : ''}`
          }
        </div>
      </td>`;
    tbody.appendChild(tr);
  });
}

// ── 報名操作 ─────────────────────────────────────────────────
async function cancelReg(regId, name) {
  if (!confirm(`確定要取消 ${name} 的報名？名額將釋出。`)) return;
  try {
    const res = await apiPost({ action: 'cancelRegistration', regId });
    if (!res.success) throw new Error(res.error);
    showToast(`${name} 的報名已取消`, 'success');
    await loadRegistrations(currentRegCourseId);
    await loadCourses();
  } catch (err) {
    showToast(`操作失敗：${err.message}`, 'error');
  }
}

async function restoreReg(regId, name) {
  try {
    const res = await apiPost({ action: 'restoreRegistration', regId });
    if (!res.success) throw new Error(res.error);
    showToast(`${name} 的報名已恢復`, 'success');
    await loadRegistrations(currentRegCourseId);
    await loadCourses();
  } catch (err) {
    showToast(`恢復失敗：${err.message}`, 'error');
  }
}

async function togglePayment(regId, newStatus) {
  try {
    const res = await apiPost({ action: 'updateRegistration', regId, payment_status: newStatus });
    if (!res.success) throw new Error(res.error);
    showToast(newStatus === 'paid' ? '已標記為已繳費' : '已標記為未繳費', 'success');
    await loadRegistrations(currentRegCourseId);
  } catch (err) {
    showToast(`更新失敗：${err.message}`, 'error');
  }
}

async function markRefunded(regId) {
  try {
    const res = await apiPost({ action: 'updateRegistration', regId, refund_status: 'refunded' });
    if (!res.success) throw new Error(res.error);
    showToast('已標記為退費完成', 'success');
    await loadRegistrations(currentRegCourseId);
  } catch (err) {
    showToast(`更新失敗：${err.message}`, 'error');
  }
}

// ── 報名資料編輯 Modal ────────────────────────────────────────
let currentRegData = {};

function openRegModal(regId) {
  // 從目前已渲染的資料找到這筆（透過 GAS 再 query 也可，但這樣較快）
  const tbody = document.getElementById('regs-tbody');
  if (!tbody) return;

  // 需要從 DOM 或重新 query，這裡透過重新 query 保持資料一致
  apiGet({ action: 'getRegistrations', courseId: currentRegCourseId }).then(data => {
    if (!data.success) return;
    const reg = data.registrations.find(r => r.reg_id === regId);
    if (!reg) return;
    currentRegData = reg;

    document.getElementById('edit-reg-id').value = reg.reg_id;
    document.getElementById('r-name').value       = reg.name;
    document.getElementById('r-phone').value      = reg.phone;
    document.getElementById('r-count').value      = reg.count;
    document.getElementById('r-payment').value    = reg.payment_status;
    document.getElementById('r-notes').value      = reg.notes || '';

    document.getElementById('reg-modal-overlay').classList.add('open');
  });
}

function closeRegModal() {
  document.getElementById('reg-modal-overlay').classList.remove('open');
}

async function saveReg() {
  const regId   = document.getElementById('edit-reg-id').value;
  const name    = document.getElementById('r-name').value.trim();
  const phone   = document.getElementById('r-phone').value.trim();
  const count   = parseInt(document.getElementById('r-count').value);
  const payment = document.getElementById('r-payment').value;
  const notes   = document.getElementById('r-notes').value.trim();

  if (!name || !phone || !count) {
    showToast('請填寫必填欄位', 'error');
    return;
  }

  try {
    const res = await apiPost({
      action: 'updateRegistration',
      regId, name, phone, count, notes, payment_status: payment
    });
    if (!res.success) throw new Error(res.error);
    closeRegModal();
    showToast('報名資料已更新', 'success');
    await loadRegistrations(currentRegCourseId);
    await loadCourses();
  } catch (err) {
    showToast(`更新失敗：${err.message}`, 'error');
  }
}

// ── 背景關閉 Modal ────────────────────────────────────────────
['course-modal-overlay', 'reg-modal-overlay', 'confirm-overlay'].forEach(id => {
  document.getElementById(id).addEventListener('click', e => {
    if (e.target === e.currentTarget) {
      e.currentTarget.classList.remove('open');
    }
  });
});

// ── 啟動 ─────────────────────────────────────────────────────
// 驗證成功後由 coach.html 呼叫 loadCourses()
// loadCourses();
