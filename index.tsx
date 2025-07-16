
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

// --- Functions ---

/**
 * Saves jobs to localStorage and re-renders the calendar.
 */
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

  monthYearDisplay.textContent = `${year}年 ${month + 1}月`;

  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Add empty cells for days before the 1st
  for (let i = 0; i < firstDayOfMonth; i++) {
    calendarGrid.appendChild(document.createElement('div'));
  }

  // Add cells for each day of the month
  for (let day = 1; day <= daysInMonth; day++) {
    const dayCell = document.createElement('div');
    dayCell.classList.add('day-cell');
    dayCell.innerHTML = `<span class="day-number">${day}</span>`;

    const today = new Date();
    if (year === today.getFullYear() && month === today.getMonth() && day === today.getDate()) {
        dayCell.classList.add('today');
    }

    const cellDate = new Date(year, month, day);
    
    // Find and render jobs for this day
    const jobsForDay = jobs.filter(job => {
        const startDate = new Date(job.startDate + 'T00:00:00');
        const endDate = new Date(job.endDate + 'T00:00:00');
        return cellDate >= startDate && cellDate <= endDate;
    });

    jobsForDay.forEach(job => {
        const jobElement = document.createElement('div');
        jobElement.classList.add('job');
        jobElement.textContent = job.title;
        jobElement.dataset.jobId = String(job.id);
        jobElement.addEventListener('click', (e) => {
            e.stopPropagation();
            openJobModal(job);
        });
        dayCell.appendChild(jobElement);
    });

    calendarGrid.appendChild(dayCell);
  }
}

/**
 * Shows/hides the loading state of the submit button.
 * @param isLoading - Whether to show the loader.
 */
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

/**
 * Displays an error message.
 * @param message - The error message to display.
 */
function displayError(message: string) {
    errorMessage.textContent = message;
    errorMessage.style.display = 'block';
    setTimeout(() => {
        errorMessage.style.display = 'none';
    }, 5000);
}


/**
 * Opens the modal to edit a job.
 * @param job - The job object to edit.
 */
function openJobModal(job: Job) {
  jobIdInput.value = String(job.id);
  jobTitleInput.value = job.title;
  jobStartDateInput.value = job.startDate;
  jobEndDateInput.value = job.endDate;
  jobDescriptionInput.value = job.description;
  jobModal.style.display = 'flex';
}

/**
 * Closes the job editing modal.
 */
function closeJobModal() {
  jobModal.style.display = 'none';
}

// --- Event Handlers ---

/**
 * Handles the form submission to create a new job by calling the backend.
 */
async function handleFormSubmit(event: Event) {
    event.preventDefault();
    const userInput = promptInput.value.trim();
    if (!userInput) return;

    setLoading(true);
    displayError('');

    const today = new Date().toISOString().slice(0, 10);

    try {
        const apiResponse = await fetch('/api/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ userInput, today }),
        });

        if (!apiResponse.ok) {
            const errorData = await apiResponse.json().catch(() => ({ error: 'サーバーとの通信に失敗しました。' }));
            throw new Error(errorData.error || `HTTP error! status: ${apiResponse.status}`);
        }

        const jobData = await apiResponse.json();

        if (!jobData.title || !jobData.startDate || !jobData.endDate) {
            throw new Error("AIからの応答に必要な情報が含まれていません。");
        }

        const newJob: Job = {
            id: Date.now(),
            title: jobData.title,
            startDate: jobData.startDate,
            endDate: jobData.endDate,
            description: jobData.description || '',
        };

        jobs.push(newJob);
        saveAndRerender();
        promptInput.value = '';
    } catch (error) {
        console.error("Error generating content:", error);
        const errorMessage = error instanceof Error ? error.message : "予定の抽出に失敗しました。入力内容を変えてもう一度お試しください。";
        displayError(errorMessage);
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
            id: id,
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
 * Handles deleting a job.
 */
function handleDeleteJob() {
    if (!confirm("この予定を本当に削除しますか？")) {
        return;
    }
    const id = parseInt(jobIdInput.value, 10);
    jobs = jobs.filter(j => j.id !== id);
    saveAndRerender();
    closeJobModal();
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
jobModal.addEventListener('click', (event) => {
    if (event.target === jobModal) {
        closeJobModal();
    }
});


// --- Initial Load ---
document.addEventListener('DOMContentLoaded', renderCalendar);
