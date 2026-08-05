/* ============================================================
   user.js — 學員端邏輯
   ============================================================ */

let currentCourseId = null;
let currentCourse   = null;

// ── API 呼叫 ────────────────────────────────────────────────
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

// ── Toast ────────────────────────────────────────────────────
function showToast(msg, type = 'info') {
  const icons = { success: '✅', error: '❌', info: 'ℹ️' };
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `<span>${icons[type]}</span><span>${msg}</span>`;
  document.getElementById('toast-container').appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

// ── 工具 ─────────────────────────────────────────────────────
function getStatusBadge(course) {
  if (course.status === 'closed') return '<span class="badge badge-closed">已關閉</span>';
  if (course.remaining <= 0)      return '<span class="badge badge-full">額滿</span>';
  return '<span class="badge badge-open">開放報名</span>';
}

function isBookable(course) {
  return course.status === 'open' && course.remaining > 0;
}

function getCapacityClass(course) {
  const pct = course.registered_count / course.max_capacity;
  if (pct >= 1)    return 'high';
  if (pct >= 0.7)  return 'mid';
  return 'low';
}

// ── 課程列表 ─────────────────────────────────────────────────
async function loadCourses() {
  const container = document.getElementById('courses-container');
  container.innerHTML = `<div class="loader-wrap"><div class="spinner"></div><p>載入課程中…</p></div>`;

  try {
    const data = await apiGet({ action: 'getCourses' });
    if (!data.success) throw new Error(data.error);

    const courses = data.courses;
    if (!courses.length) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="icon">🏸</div>
          <p>目前暫無課程，請稍後再查看</p>
        </div>`;
      return;
    }

    // 依日期排序
    courses.sort((a, b) => String(a.date).localeCompare(String(b.date)));

    container.innerHTML = `<div class="courses-grid" id="courses-grid"></div>`;
    const grid = document.getElementById('courses-grid');
    courses.forEach(course => grid.appendChild(buildCourseCard(course)));

  } catch (err) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="icon">⚠️</div>
        <p>載入失敗：${err.message}</p>
        <button class="btn btn-secondary" onclick="loadCourses()">重試</button>
      </div>`;
  }
}

function buildCourseCard(course) {
  const pct = Math.min(100, Math.round(course.registered_count / course.max_capacity * 100));
  const cls = getCapacityClass(course);

  const div = document.createElement('div');
  div.className = 'card';
  div.id = `course-card-${course.course_id}`;
  div.innerHTML = `
    <div class="card-header">
      <div>
        <div class="card-date">${course.date}</div>
        <div class="card-time">⏰ ${course.time}</div>
      </div>
      ${getStatusBadge(course)}
    </div>
    <div class="card-meta">
      <div class="card-meta-item"><span class="card-meta-icon">📍</span><span>${course.location}</span></div>
      <div class="card-meta-item"><span class="card-meta-icon">🎯</span><span>教練：${course.coach}</span></div>
      <div class="card-meta-item"><span class="card-meta-icon">💰</span><span>費用：$${course.fee}</span></div>
    </div>
    <div class="card-footer">
      <div class="capacity-bar-wrap">
        <div class="capacity-label">
          <span>已報名 ${course.registered_count} / ${course.max_capacity} 人</span>
          <span>剩餘 <strong style="color:var(--text-1)">${course.remaining}</strong></span>
        </div>
        <div class="capacity-bar">
          <div class="capacity-fill ${cls}" style="width:${pct}%"></div>
        </div>
      </div>
      <button class="btn btn-sm ${isBookable(course) ? 'btn-primary' : 'btn-secondary'}"
        onclick="openDetail('${course.course_id}', event)">
        ${isBookable(course) ? '報名 →' : '查看'}
      </button>
    </div>`;
  return div;
}

// ── 課程詳細 Modal ────────────────────────────────────────────
async function openDetail(courseId, e) {
  if (e) e.stopPropagation();
  currentCourseId = courseId;

  const overlay = document.getElementById('detail-overlay');
  const body    = document.getElementById('detail-body');

  overlay.classList.add('open');
  body.innerHTML = `<div class="loader-wrap"><div class="spinner"></div></div>`;

  try {
    const data = await apiGet({ action: 'getCourseDetail', id: courseId });
    if (!data.success) throw new Error(data.error);
    currentCourse = data.course;
    renderDetailBody(data.course);

    // 控制報名按鈕
    const btn = document.getElementById('open-register-btn');
    btn.disabled = !isBookable(data.course);
    btn.textContent = isBookable(data.course) ? '✍️ 立即報名' : '無法報名';

  } catch (err) {
    body.innerHTML = `<div class="empty-state"><p>載入失敗：${err.message}</p></div>`;
  }
}

function renderDetailBody(course) {
  const body = document.getElementById('detail-body');
  document.getElementById('detail-title').textContent = `${course.date} ${course.time}`;

  const regHtml = course.registrations.length
    ? course.registrations.map(r => `
        <div class="reg-item">
          <span class="reg-item-name">${r.name}</span>
          <span class="reg-item-count">${r.count} 人</span>
        </div>`).join('')
    : `<div style="color:var(--text-3);font-size:.875rem;padding:8px 0">尚無報名</div>`;

  const remainColor = course.remaining <= 0 ? 'var(--danger)' : course.remaining <= 3 ? 'var(--warning)' : 'var(--success)';

  body.innerHTML = `
    <div class="course-detail-grid">
      <div class="detail-item">
        <label>日期</label><span>${course.date}</span>
      </div>
      <div class="detail-item">
        <label>時間</label><span>${course.time}</span>
      </div>
      <div class="detail-item">
        <label>地點</label><span>${course.location}</span>
      </div>
      <div class="detail-item">
        <label>教練</label><span>${course.coach}</span>
      </div>
      <div class="detail-item">
        <label>費用</label><span>$${course.fee}</span>
      </div>
      <div class="detail-item">
        <label>開放人數</label><span>${course.max_capacity} 人</span>
      </div>
      ${course.notes ? `<div class="detail-item full-width"><label>備註</label><span>${course.notes}</span></div>` : ''}
    </div>

    <div class="reg-list">
      <h3>已報名名單</h3>
      ${regHtml}
    </div>

    <div class="remaining-box" style="color:${remainColor}">
      🏸 剩餘名額：<strong style="font-size:1.2rem">${course.remaining}</strong> 人
    </div>`;
}

// ── 報名 Modal ────────────────────────────────────────────────
function openRegister() {
  if (!currentCourse) return;
  document.getElementById('detail-overlay').classList.remove('open');

  const infoEl = document.getElementById('register-course-info');
  infoEl.innerHTML = `📅 ${currentCourse.date} &nbsp;⏰ ${currentCourse.time} &nbsp;📍 ${currentCourse.location} &nbsp;💰 $${currentCourse.fee}`;

  // 限制人數最大值
  const countInput = document.getElementById('reg-count');
  countInput.max = currentCourse.remaining;

  // 清除表單
  document.getElementById('register-form').reset();
  countInput.value = 1;

  document.getElementById('register-overlay').classList.add('open');
}

function closeRegister() {
  document.getElementById('register-overlay').classList.remove('open');
}

async function submitRegister() {
  const name  = document.getElementById('reg-name').value.trim();
  const phone = document.getElementById('reg-phone').value.trim();
  const count = parseInt(document.getElementById('reg-count').value);
  const notes = document.getElementById('reg-notes').value.trim();

  if (!name || !phone || !count) {
    showToast('請填寫姓名、手機與報名人數', 'error');
    return;
  }
  if (count < 1 || count > currentCourse.remaining) {
    showToast(`報名人數需介於 1 ~ ${currentCourse.remaining} 之間`, 'error');
    return;
  }

  const btn = document.getElementById('submit-register-btn');
  btn.disabled = true;
  btn.textContent = '送出中…';

  try {
    const res = await apiPost({
      action: 'register',
      courseId: currentCourseId,
      name, phone, count, notes
    });

    if (!res.success) throw new Error(res.error);

    closeRegister();
    showToast(`✅ 報名成功！${name} 已報名 ${count} 人`, 'success');
    await loadCourses(); // 刷新列表

  } catch (err) {
    showToast(`報名失敗：${err.message}`, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = '確認報名';
  }
}

// ── Modal 關閉 & 事件繫結 ─────────────────────────────────────
function closeDetail() {
  document.getElementById('detail-overlay').classList.remove('open');
}

document.getElementById('detail-close').onclick     = closeDetail;
document.getElementById('detail-close-btn').onclick = closeDetail;
document.getElementById('register-close').onclick   = closeRegister;
document.getElementById('open-register-btn').onclick = openRegister;
document.getElementById('register-back-btn').onclick = () => {
  closeRegister();
  document.getElementById('detail-overlay').classList.add('open');
};
document.getElementById('submit-register-btn').onclick = submitRegister;

// 點擊背景關閉
document.getElementById('detail-overlay').addEventListener('click', e => {
  if (e.target === e.currentTarget) closeDetail();
});
document.getElementById('register-overlay').addEventListener('click', e => {
  if (e.target === e.currentTarget) closeRegister();
});

// ── 啟動 ─────────────────────────────────────────────────────
loadCourses();
