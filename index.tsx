/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import './index.css';

interface Job {
  id: number;
  title: string;
  startDate: string;
  endDate: string;
  description: string;
}

/* ----------------- DOM Elements ----------------- */
const promptForm       = document.getElementById('prompt-form')  as HTMLFormElement;
const promptInput      = document.getElementById('prompt-input') as HTMLTextAreaElement;
const submitButton     = document.getElementById('submit-button')     as HTMLButtonElement;
const buttonText       = document.getElementById('button-text')       as HTMLElement;
const spinner          = document.getElementById('spinner')           as HTMLElement;
const errorMessage     = document.getElementById('error-message')     as HTMLElement;

const calendarGrid     = document.getElementById('calendar-grid')     as HTMLElement;
const monthYearDisplay = document.getElementById('month-year')        as HTMLElement;
const prevMonthButton  = document.getElementById('prev-month')        as HTMLButtonElement;
const nextMonthButton  = document.getElementById('next-month')        as HTMLButtonElement;

const jobModal         = document.getElementById('job-modal')         as HTMLDialogElement;
const jobModalCloseBtn = document.getElementById('job-modal-close')   as HTMLButtonElement;
const jobModalTitle    = document.getElementById('job-modal-title')   as HTMLElement;
const jobModalDate     = document.getElementById('job-modal-date')    as HTMLElement;
const jobModalDesc     = document.getElementById('job-modal-desc')    as HTMLElement;
const deleteJobForm    = document.getElementById('delete-job-form')   as HTMLFormElement;
const jobIdInput       = document.getElementById('job-id-input')      as HTMLInputElement;

/* ----------------- State ----------------- */
let jobs: Job[] = [];
let currentDate = new Date();

/* ----------------- Calendar Rendering ----------------- */
function renderCalendar() {
  calendarGrid.innerHTML = '';
  currentDate.setDate(1);

  const year  = currentDate.getFullYear();
  const month = currentDate.getMonth();

  monthYearDisplay.textContent = `${year}年 ${month + 1}月`;

  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth     = new Date(year, month + 1, 0).getDate();

  /* ---------- ① 先頭の空きマス ---------- */
  for (let i = 0; i < firstDayOfMonth; i++) {
    const empty = document.createElement('div');
    empty.classList.add('day-cell', 'placeholder');
    calendarGrid.appendChild(empty);
  }

  /* ---------- ② 日付セル ---------- */
  for (let day = 1; day <= daysInMonth; day++) {
    const dayCell = document.createElement('div');
    dayCell.classList.add('day-cell');
    dayCell.innerHTML = `<span class="day-number">${day}</span>`;

    /* 今日ならハイライト */
    const today = new Date();
    if (
      year  === today.getFullYear() &&
      month === today.getMonth()   &&
      day   === today.getDate()
    ) {
      dayCell.classList.add('today');
    }

    const cellDate = new Date(year, month, day);

    /* 該当日のジョブを抽出 */
    const jobsForDay = jobs.filter(job => {
      const start = new Date(job.startDate + 'T00:00:00');
      const end   = new Date(job.endDate   + 'T00:00:00');
      return cellDate >= start && cellDate <= end;
    });

    /* ジョブを表示 */
    jobsForDay.forEach(job => {
      const jobEl = document.createElement('div');
      jobEl.classList.add('job');
      jobEl.textContent       = job.title;
      jobEl.dataset.jobId     = String(job.id);
      jobEl.addEventListener('click', (e) => {
        e.stopPropagation();
        openJobModal(job);
      });
      dayCell.appendChild(jobEl);
    });

    calendarGrid.appendChild(dayCell);
  }

  /* ---------- ③ 月末後の空きマス ---------- */
  const totalCells    = firstDayOfMonth + daysInMonth;
  const trailingCells = (7 - (totalCells % 7)) % 7;       // 0〜6
  for (let i = 0; i < trailingCells; i++) {
    const empty = document.createElement('div');
    empty.classList.add('day-cell', 'placeholder');
    calendarGrid.appendChild(empty);
  }
}

/* ----------------- Loading / Error ----------------- */
function setLoading(isLoading: boolean) {
  if (isLoading) {
    buttonText.style.display = 'none';
    spinner.style.display    = 'block';
  } else {
    buttonText.style.display = 'inline';
    spinner.style.display    = 'none';
  }
}

function displayError(msg: string) {
  errorMessage.textContent = msg;
  errorMessage.style.display = msg ? 'block' : 'none';
}

/* ----------------- API ----------------- */
async function handleFormSubmit(event: Event) {
  event.preventDefault();
  const userInput = promptInput.value.trim();
  if (!userInput) return;

  setLoading(true);
  displayError('');

  const today = new Date().toISOString().slice(0, 10);

  try {
    const res = await fetch('/api/generate', {
      method : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body   : JSON.stringify({ prompt: userInput, date: today }),
    });

    if (!res.ok) throw new Error(await res.text());
    const job = await res.json() as Job;

    jobs.push(job);
    saveAndRerender();
    promptInput.value = '';
  } catch (err: unknown) {
    displayError((err as Error).message);
  } finally {
    setLoading(false);
  }
}

function saveAndRerender() {
  localStorage.setItem('jobs', JSON.stringify(jobs));
  renderCalendar();
}

/* ----------------- Modal ----------------- */
function openJobModal(job: Job) {
  jobModalTitle.textContent = job.title;
  jobModalDate.textContent  = `${job.startDate} 〜 ${job.endDate}`;
  jobModalDesc.textContent  = job.description;

  jobIdInput.value = String(job.id);
  jobModal.showModal();
}

function closeJobModal() {
  jobModal.close();
}

/* ----------------- Delete ----------------- */
function handleDeleteJob(e: Event) {
  e.preventDefault();
  if (!jobIdInput.value) return;

  const id = Number(jobIdInput.value);
  jobs = jobs.filter(j => j.id !== id);
  saveAndRerender();
  closeJobModal();
}

/* ----------------- Event Listeners ----------------- */
promptForm .addEventListener('submit', handleFormSubmit);
deleteJobForm.addEventListener('submit', handleDeleteJob);

prevMonthButton.addEventListener('click', () => {
  currentDate.setMonth(currentDate.getMonth() - 1);
  renderCalendar();
});
nextMonthButton.addEventListener('click', () => {
  currentDate.setMonth(currentDate.getMonth() + 1);
  renderCalendar();
});
jobModalCloseBtn.addEventListener('click', closeJobModal);

/* ----------------- Init ----------------- */
(function init() {
  const stored = localStorage.getItem('jobs');
  if (stored) jobs = JSON.parse(stored);
  renderCalendar();
})();
