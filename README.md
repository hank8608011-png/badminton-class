# 羽球課程報名系統 — 部署說明

## 檔案結構

```
羽球報名系統/
├── index.html      首頁
├── user.html       學員報名頁
├── coach.html      教練管理後台
├── style.css       共用樣式
├── config.js       ⚠️ 需要填入 GAS URL
├── user.js         學員端邏輯
├── coach.js        教練端邏輯
└── Code.gs         Google Apps Script（後端）
```

---

## 第一步：建立 Google Sheet

1. 開啟 [Google Sheets](https://sheets.google.com) 建立新試算表
2. 記下網址中的 Sheet ID（`/d/` 後面那一串）
   - 例：`https://docs.google.com/spreadsheets/d/【這裡就是ID】/edit`
3. 工作表名稱隨意，稍後用 `initSheets()` 自動建立

---

## 第二步：部署 Google Apps Script

1. 在 Google Sheet 頂部選單：**擴充功能 → Apps Script**
2. 刪除預設的 `function myFunction() {}`
3. 將 `Code.gs` 的全部內容貼入
4. 將第 3 行的 `YOUR_GOOGLE_SHEET_ID_HERE` 替換成你的 Sheet ID：
   ```js
   const SPREADSHEET_ID = '你的Sheet ID';
   ```
5. 在函式下拉選單選 `initSheets`，按 ▶ 執行一次（會自動建立兩個 Sheet）
6. 部署為 Web App：
   - 右上角 **部署 → 新增部署作業**
   - 類型：**網路應用程式**
   - 執行身份：**我（你的 Google 帳號）**
   - 存取權限：**所有人**
   - 按「部署」→ 複製 **Web App URL**

> ⚠️ 第一次執行時 Google 會要求授權，點「允許」即可

---

## 第三步：填入 GAS URL

開啟 `config.js`，將 URL 貼入：

```js
const CONFIG = {
  GAS_URL: 'https://script.google.com/macros/s/【你的ID】/exec'
};
```

---

## 第四步：部署到 GitHub Pages

1. 在 GitHub 建立新 Repository（例如 `badminton-booking`）
2. 將整個資料夾（**不含** `Code.gs`，那是 GAS 用的）上傳：
   - `index.html`
   - `user.html`
   - `coach.html`
   - `style.css`
   - `config.js`
   - `user.js`
   - `coach.js`
3. 進入 Repo **Settings → Pages**
   - Source 選 `main` branch → `/ (root)`
   - 按「Save」
4. 等 1~2 分鐘，即可透過 `https://你的帳號.github.io/badminton-booking/` 存取

---

## API 端點一覽

| Action | 方法 | 說明 |
|--------|------|------|
| `getCourses` | GET | 學員：取得開放課程 |
| `getCourseDetail` | GET | 學員：取得課程詳細 + 名單 |
| `register` | POST | 學員：報名 |
| `getAllCourses` | GET | 教練：取得所有課程 |
| `createCourse` | POST | 教練：新增課程 |
| `updateCourse` | POST | 教練：修改課程 |
| `deleteCourse` | POST | 教練：刪除課程 |
| `toggleStatus` | POST | 教練：開放/關閉報名 |
| `getRegistrations` | GET | 教練：取得報名名單 |
| `updateRegistration` | POST | 教練：修改報名/繳費狀態 |
| `cancelRegistration` | POST | 教練：取消報名 |
| `restoreRegistration` | POST | 教練：恢復報名 |

---

## Google Sheet 欄位說明

### `courses` 工作表
| 欄 | 欄位 | 說明 |
|----|------|------|
| A | course_id | UUID |
| B | date | 日期（YYYY/MM/DD）|
| C | time | 時間（例：19:00~21:00）|
| D | location | 地點 |
| E | coach | 教練 |
| F | max_capacity | 最大人數 |
| G | fee | 費用 |
| H | notes | 備註 |
| I | status | `open` / `closed` |
| J | created_at | 建立時間 |

### `registrations` 工作表
| 欄 | 欄位 | 說明 |
|----|------|------|
| A | reg_id | UUID |
| B | course_id | 對應課程 ID |
| C | name | 姓名 |
| D | phone | 手機 |
| E | count | 報名人數 |
| F | notes | 備註 |
| G | reg_status | `active` / `cancelled` |
| H | payment_status | `paid` / `unpaid` |
| I | refund_status | `refunded` / `-` |
| J | created_at | 報名時間 |

---

## 修改 GAS 後需重新部署

> 每次修改 `Code.gs` 後，必須在 GAS 介面重新部署（新版本），否則線上仍使用舊版本。
> 步驟：**部署 → 管理部署作業 → 編輯（鉛筆圖示）→ 版本選「新版本」→ 部署**
