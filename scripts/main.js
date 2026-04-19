const yearEl = document.querySelector('#year');

if (yearEl) {
  yearEl.textContent = String(new Date().getFullYear());
}

const CONTENT_INDEX_PATH = 'content/lectures/v1/index.json';
const STORAGE_KEY = 'physics-codex:lesson-state:v1';

const state = {
  lectures: [],
  selectedLectureId: null,
  completedLectureIds: new Set(),
  notesByLectureId: {}
};

const badgeData = [
  { name: 'First Challenge', detail: 'Completed your first challenge' },
  { name: '6-Day Streak', detail: 'Maintained daily momentum' },
  { name: 'Quiz Ace', detail: 'Scored 90%+ on three quizzes' },
  { name: 'Chapter Climber', detail: 'Finished two chapters this week' }
];

const escapeHtml = (value) =>
  String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

const loadLocalState = () => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed.completedLectureIds)) {
      state.completedLectureIds = new Set(parsed.completedLectureIds);
    }
    if (parsed.notesByLectureId && typeof parsed.notesByLectureId === 'object') {
      state.notesByLectureId = parsed.notesByLectureId;
    }
  } catch (error) {
    // Ignore malformed local state and continue with defaults.
  }
};

const persistLocalState = () => {
  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      completedLectureIds: [...state.completedLectureIds],
      notesByLectureId: state.notesByLectureId
    })
  );
};

const renderProgressBar = (element) => {
  const label = element.dataset.label || 'Progress';
  const rawValue = Number(element.dataset.value || 0);
  const completion =
    state.lectures.length > 0 && label.toLowerCase().includes('mastery')
      ? Math.round((state.completedLectureIds.size / state.lectures.length) * 100)
      : rawValue;

  element.innerHTML = `
    <h3>${label}</h3>
    <div class="progress-meter" role="progressbar" aria-label="${label}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${completion}">
      <span style="width:${Math.min(100, Math.max(0, completion))}%"></span>
    </div>
    <p>${completion}% complete</p>
  `;
};

const renderStreakIndicator = (element) => {
  const fallbackDays = Number(element.dataset.days || 0);
  const fallbackBest = Number(element.dataset.best || 0);
  const gamification = window.PhysicsCodexGamification?.getProgressSnapshot?.();
  const streak = gamification?.learner?.streak;
  const days = streak?.current ?? fallbackDays;
  const best = streak?.longest ?? fallbackBest;

  element.innerHTML = `
    <h3>Streak</h3>
    <p><span class="streak-pill" aria-label="Current streak ${days} days">🔥 ${days} day streak</span></p>
    <p>Best streak: ${best} days</p>
  `;
};

const renderQuizWidget = (element, quizData) => {
  const question = quizData.question || 'Question unavailable.';
  const answerIndex = Number(quizData.answer || -1);
  const options = Array.isArray(quizData.options) ? quizData.options : [];
  const onCorrect = typeof quizData.onCorrect === 'function' ? quizData.onCorrect : () => {};

  element.innerHTML = '';
  const title = document.createElement('h3');
  title.textContent = quizData.title || 'Quiz Widget';

  const prompt = document.createElement('p');
  prompt.textContent = question;

  const optionWrapper = document.createElement('div');
  optionWrapper.className = 'quiz-options';

  const feedback = document.createElement('div');
  feedback.className = 'quiz-feedback';
  feedback.setAttribute('aria-live', 'polite');

  let solved = false;

  options.forEach((option, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'quiz-option';
    button.setAttribute('aria-label', `Answer option ${index + 1}: ${option}`);
    button.textContent = option;
    button.addEventListener('click', () => {
      const correct = index === answerIndex;
      feedback.textContent = correct ? '✅ Correct! Nice reasoning.' : '❗ Not quite—try again.';
      feedback.style.color = correct ? 'var(--success)' : 'var(--warning)';

      if (correct && !solved) {
        solved = true;
        onCorrect();
      }
    });
    optionWrapper.appendChild(button);
  });

  element.append(title, prompt, optionWrapper, feedback);
};

const renderConceptCards = () => {
  const container = document.querySelector('#concept-card-grid');
  if (!container) return;

  container.innerHTML = '';

  state.lectures.forEach((lecture, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'concept-card';
    button.setAttribute('role', 'option');
    button.setAttribute('aria-selected', lecture.id === state.selectedLectureId ? 'true' : 'false');
    button.setAttribute('tabindex', index === 0 ? '0' : '-1');
    button.setAttribute(
      'aria-label',
      `${lecture.title}, Chapter ${lecture.chapter}, ${state.completedLectureIds.has(lecture.id) ? 'completed' : 'not completed'}`
    );

    const completionTag = state.completedLectureIds.has(lecture.id)
      ? '<span class="status-pill completed">Completed</span>'
      : '<span class="status-pill">In progress</span>';

    button.innerHTML = `
      <strong>${escapeHtml(lecture.title)}</strong>
      <p>Chapter ${lecture.chapter} · Section ${lecture.section}</p>
      <p>${completionTag}</p>
    `;

    button.addEventListener('click', () => {
      state.selectedLectureId = lecture.id;
      renderConceptCards();
      renderLesson();
      renderChallengeQuiz();
    });

    container.appendChild(button);
  });

  container.addEventListener('keydown', (event) => {
    const cards = [...container.querySelectorAll('.concept-card')];
    const current = document.activeElement;
    const currentIndex = cards.indexOf(current);

    if (currentIndex < 0) return;

    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      const next = cards[(currentIndex + 1) % cards.length];
      cards.forEach((card) => (card.tabIndex = -1));
      next.tabIndex = 0;
      next.focus();
      event.preventDefault();
    }

    if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      const prev = cards[(currentIndex - 1 + cards.length) % cards.length];
      cards.forEach((card) => (card.tabIndex = -1));
      prev.tabIndex = 0;
      prev.focus();
      event.preventDefault();
    }
  });
};

const renderLesson = () => {
  const lecture = state.lectures.find((item) => item.id === state.selectedLectureId);
  const titleEl = document.querySelector('#active-lesson-title');
  const summaryEl = document.querySelector('#active-lesson-summary');
  const contentEl = document.querySelector('#lesson-content');
  const notesEl = document.querySelector('#lesson-notes');

  if (!titleEl || !summaryEl || !contentEl || !notesEl || !lecture) return;

  titleEl.textContent = `Lesson: ${lecture.title}`;
  summaryEl.textContent = lecture.summary || 'Explore this lesson and complete the challenge to reinforce your understanding.';

  const concepts = (lecture.key_concepts || []).map((concept) => `<li>${escapeHtml(concept)}</li>`).join('');
  const examples = (lecture.examples || []).map((example) => `<li>${escapeHtml(example)}</li>`).join('');

  contentEl.innerHTML = `
    <div class="lesson-columns">
      <div>
        <h4>Key concepts</h4>
        <ul>${concepts || '<li>Content coming soon.</li>'}</ul>
      </div>
      <div>
        <h4>Worked examples</h4>
        <ul>${examples || '<li>Examples coming soon.</li>'}</ul>
      </div>
    </div>
  `;

  notesEl.value = state.notesByLectureId[lecture.id] || '';
};

const getLectureForChallenge = () => state.lectures.find((item) => item.id === state.selectedLectureId);

const buildChallengeForLecture = (lecture) => {
  const concepts = lecture?.key_concepts || [];
  const answer = concepts[0] || 'Constant acceleration kinematics';
  const distractors = [
    'Momentum is always conserved in isolated systems',
    'Electric fields are created only by moving charges',
    'Wave speed is independent of medium properties'
  ];

  const options = [answer, ...distractors.slice(0, 2)].sort(() => Math.random() - 0.5);
  return {
    title: 'Concept Check',
    question: `Which idea is directly emphasized in ${lecture?.title || 'this lesson'}?`,
    options,
    answer: options.indexOf(answer)
  };
};

const updateDashboardWidgets = () => {
  document.querySelectorAll('[data-component="progress-bar"]').forEach(renderProgressBar);
  document.querySelectorAll('[data-component="streak-indicator"]').forEach(renderStreakIndicator);
};

const renderChallengeQuiz = () => {
  const container = document.querySelector('#challenge-quiz');
  const lecture = getLectureForChallenge();
  if (!container || !lecture) return;

  const quiz = buildChallengeForLecture(lecture);
  renderQuizWidget(container, {
    ...quiz,
    onCorrect: () => {
      window.PhysicsCodexGamification?.recordChallengeCompletion?.('multiple_choice');
      updateDashboardWidgets();
    }
  });
};

const renderBadgeGallery = () => {
  const badgeGallery = document.querySelector('#badge-gallery');
  if (!badgeGallery) return;

  badgeGallery.innerHTML = '<h3>Badge Gallery</h3>';
  const grid = document.createElement('div');
  grid.className = 'badge-grid';

  badgeData.forEach((badge) => {
    const card = document.createElement('article');
    card.className = 'badge';
    card.setAttribute('tabindex', '0');
    card.setAttribute('aria-label', `${badge.name}: ${badge.detail}`);
    card.innerHTML = `<strong>${badge.name}</strong><br /><small>${badge.detail}</small>`;
    grid.appendChild(card);
  });

  badgeGallery.appendChild(grid);
};

const bindHintTooltips = () => {
  const liveRegion = document.querySelector('#tooltip-live');
  const chips = document.querySelectorAll('.hint-chip');

  chips.forEach((chip) => {
    const message = chip.dataset.tooltip || '';
    chip.setAttribute('aria-label', `${chip.textContent}. Hint available.`);
    chip.addEventListener('focus', () => {
      if (liveRegion) liveRegion.textContent = message;
    });
    chip.addEventListener('mouseenter', () => {
      if (liveRegion) liveRegion.textContent = message;
    });
  });
};

const bindLessonActions = () => {
  const saveButton = document.querySelector('#save-notes-button');
  const completeButton = document.querySelector('#complete-lesson-button');
  const notesEl = document.querySelector('#lesson-notes');
  const statusEl = document.querySelector('#lesson-status');

  if (saveButton && notesEl) {
    saveButton.addEventListener('click', () => {
      const lecture = getLectureForChallenge();
      if (!lecture) return;
      state.notesByLectureId[lecture.id] = notesEl.value.trim();
      persistLocalState();
      if (statusEl) statusEl.textContent = 'Notes saved locally on this device.';
    });
  }

  if (completeButton) {
    completeButton.addEventListener('click', () => {
      const lecture = getLectureForChallenge();
      if (!lecture) return;
      state.completedLectureIds.add(lecture.id);
      window.PhysicsCodexGamification?.completeQuest?.('quest-motion-basics', { lectureId: lecture.id });
      persistLocalState();
      renderConceptCards();
      updateDashboardWidgets();
      if (statusEl) statusEl.textContent = `${lecture.title} marked complete.`;
    });
  }
};

const loadLectures = async () => {
  const response = await fetch(CONTENT_INDEX_PATH);
  if (!response.ok) {
    throw new Error(`Unable to load lecture index (${response.status}).`);
  }

  const index = await response.json();
  const lectureRecords = Array.isArray(index.lectures) ? index.lectures : [];

  const lectures = await Promise.all(
    lectureRecords.map(async (record) => {
      const lectureResponse = await fetch(record.path);
      if (!lectureResponse.ok) {
        throw new Error(`Unable to load lecture file: ${record.path}`);
      }

      const detail = await lectureResponse.json();
      return {
        ...record,
        ...detail
      };
    })
  );

  return lectures;
};

const bootstrap = async () => {
  bindHintTooltips();
  bindLessonActions();
  renderBadgeGallery();
  loadLocalState();

  try {
    state.lectures = await loadLectures();
    state.selectedLectureId = state.lectures[0]?.id || null;

    renderConceptCards();
    renderLesson();
    renderChallengeQuiz();
    updateDashboardWidgets();
  } catch (error) {
    const conceptGrid = document.querySelector('#concept-card-grid');
    if (conceptGrid) {
      conceptGrid.innerHTML = `<p>Unable to load lecture content. Run a local server (for example, <code>python3 -m http.server 8080</code>) and refresh.</p>`;
    }
  }
};

bootstrap();
