/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// --- DOM Elements ---
const promptForm = document.getElementById('prompt-form') as HTMLFormElement;
const promptInput = document.getElementById('prompt-input') as HTMLTextAreaElement;
const submitButton = document.getElementById('submit-button') as HTMLButtonElement;
const buttonText = document.querySelector('.button-text') as HTMLSpanElement;
const spinner = document.querySelector('.spinner') as HTMLDivElement;
const errorMessage = document.getElementById('error-message') as HTMLDivElement;

const calendarGrid = document.getElementById('calendar-grid') as HTMLDivElement;
const monthYearDisplay = document.getElementById('month-year') as HTMLHeadingElement;
const prevMonthButton = document.getElementById('prev-month') as HTMLButtonElement;
const nextMonthButton = document.getElementById('next-month') as HTMLButtonElement;

const jobModal = document.getElementById('job-modal') as HTMLDivElement;
const editJobForm = document.getElementById('edit-job-form') as HTMLFormElement;
const closeModalButton = document.getElementById('close-modal') as HTMLButtonElement;
const deleteJobButton = document.getElementById('delete-job-button') as HTMLButtonElement;
const jobIdInput = document.getElementById('job-id') as HTMLInputElement;
const jobTitleInput = document.getElementById('job-title') as HTMLInputElement;
const jobStartDateInput = document.getElementById('job-start-date') as HTMLInputElement;
const jobEndDateInput = document.getElementById('job-end-date') as HTMLInputElement;
const jobDescriptionInput = document.getElementById('job-description') as HTMLTextAreaElement;

// --- App State ---
interface Job {
  id: number;
  title: string;
  startDate: string;
  endDate: string;
  description: string;
}

let currentDate = new Date();
let jobs: Job[] = JSON.parse(localStorage.getItem('calendarJobs') || '[]');

// --- UI Helpers ---

function setLoading(isLoading: boolean) {
  if (isLoading) {
    buttonText.style.display = 'none';
    spinner.style.display = 'block';
    submitButton.disabled = true;
    promptInput.disabled = true;
  } else {
    buttonText.style.display = 'block';
    spinner.style.display = 'none';
    submitButton.disabled = false;
    promptInput.disabled = false;
  }
}

function displayError(message: string) {
  errorMessage.textContent = message;
  errorMessage.style.display = message ? 'block' : 'none';
}

function saveAndRerender() {
  localStorage.setItem('calendarJobs', JSON.stringify(jobs));
  renderCalendar();
}

/**
 * Renders the calendar for the current month.
 */
function renderCalendar() {
  calendarGrid.innerHTML = '';
  currentDate.setDate(1);
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  monthYearDisplay.textContent = `${year} / ${month + 1}`;

  // Calculate first day and number of days in month
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Fill in blank cells before first day
  for (let i = 0; i < firstDay; i++) {
    const emptyCell = document.createElement('div');
    emptyCell.classList.add('empty');
    calendarGrid.appendChild(emptyCell);
  }

  // Create day cells
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dayCell = document.createElement('div');
    dayCell.classList.add('day');
    dayCell.dataset.date = dateStr;
    dayCell.textContent = String(day);

    const dayJobs = jobs.filter(j => j.startDate <= dateStr && j.endDate >= dateStr);
    if (dayJobs.length) {
      dayCell.classList.add('has-job');
    }

    dayCell.addEventListener('click', () => openJobModal(dateStr));
    calendarGrid.appendChild(dayCell);
  }
}

// --- Event Handlers ---

/**
 * Handles the form submission to create a new job.
 * Gemini 呼び出しはサーバー側 API に委譲する。
 */
async function handleFormSubmit(event: Event) {
  event.preventDefault();

  const userInput = promptInput.value.trim();
  if (!userInput) return;

  setLoading(true);

  try {
    // バックエンド（server.ts）経由で Gemini を呼び出す
    const resp = await fetch(
      'https://your-app-api.onrender.com/api/schedule',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: userInput }),
      },
    );

    if (!resp.ok) {
      throw new Error(`API error: ${resp.status}`);
    }

    const jobData = await resp.json();

    if (!jobData.title || !jobData.startDate || !jobData.endDate) {
      throw new Error('AIからの応答に必要な情報が含まれていません。');
    }

    const newJob: Job = {
      id: Date.now(),               // 一意な ID（簡易版）
      title: jobData.title,
      startDate: jobData.startDate,
      endDate: jobData.endDate,
      description: jobData.description ?? '',
    };

    jobs.push(newJob);
    saveAndRerender();
    promptInput.value = '';
  } catch (error) {
    console.error(error);
    displayError('予定の抽出に失敗しました。入力内容を変えてもう一度お試しください。');
  } finally {
    setLoading(false);
  }
}

/**
 * Handles saving changes from the edit modal.
 */
function handleEditFormSubmit(event: Event) {
  event.preventDefault();
  const id = parseInt(jobIdInput.value, 10);
  const jobIndex = jobs.findIndex(j => j.id === id);

  if (jobIndex > -1) {
    jobs[jobIndex] = {
      id,
      title: jobTitleInput.value,
      startDate: jobStartDateInput.value,
      endDate: jobEndDateInput.value,
      description: jobDescriptionInput.value,
    };
    saveAndRerender();
  }
  closeJobModal();
}

/**
 * Handles deleting the current job.
 */
function handleDeleteJob() {
  const id = parseInt(jobIdInput.value, 10);
  jobs = jobs.filter(j => j.id !== id);
  saveAndRerender();
  closeJobModal();
}

// --- Modal helpers ---

function openJobModal(dateStr: string) {
  jobIdInput.value = '';
  jobTitleInput.value = '';
  jobStartDateInput.value = dateStr;
  jobEndDateInput.value = dateStr;
  jobDescriptionInput.value = '';
  deleteJobButton.style.display = 'none';
  jobModal.style.display = 'flex';
}

function closeJobModal() {
  jobModal.style.display = 'none';
}

// --- Event Listeners ---
promptForm.addEventListener('submit', handleFormSubmit);

prevMonthButton.addEventListener('click', () => {
  currentDate.setMonth(currentDate.getMonth() - 1);
  renderCalendar();
});

nextMonthButton.addEventListener('click', () => {
  currentDate.setMonth(currentDate.getMonth() + 1);
  renderCalendar();
});

closeModalButton.addEventListener('click', closeJobModal);
deleteJobButton.addEventListener('click', handleDeleteJob);
editJobForm.addEventListener('submit', handleEditFormSubmit);

// Close modal if clicking outside the content area
jobModal.addEventListener('click', event => {
  if (event.target === jobModal) {
    closeJobModal();
  }
});

// --- Initial Load ---
document.addEventListener('DOMContentLoaded', renderCalendar);
