const yearEl = document.querySelector('#year');

if (yearEl) {
  yearEl.textContent = String(new Date().getFullYear());
}

const conceptCards = [
  { title: 'Motion Foundations', chapter: 'Chapter 1', progress: 82, description: 'Displacement, speed, and frame of reference.' },
  { title: 'Forces in Action', chapter: 'Chapter 2', progress: 58, description: 'Newtonian mechanics and free-body reasoning.' },
  { title: 'Energy Transfers', chapter: 'Chapter 3', progress: 36, description: 'Work-energy theorem and conservation patterns.' },
  { title: 'Oscillations', chapter: 'Chapter 4', progress: 14, description: 'Periodic motion and restoring forces.' }
];

const badgeData = [
  { name: 'First Challenge', detail: 'Completed your first challenge' },
  { name: '6-Day Streak', detail: 'Maintained daily momentum' },
  { name: 'Quiz Ace', detail: 'Scored 90%+ on three quizzes' },
  { name: 'Chapter Climber', detail: 'Finished two chapters this week' }
];

const renderProgressBar = (element) => {
  const value = Number(element.dataset.value || 0);
  const label = element.dataset.label || 'Progress';

  element.innerHTML = `
    <h3>${label}</h3>
    <div class="progress-meter" role="progressbar" aria-label="${label}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${value}">
      <span style="width:${Math.min(100, Math.max(0, value))}%"></span>
    </div>
    <p>${value}% complete</p>
  `;
};

const renderStreakIndicator = (element) => {
  const days = Number(element.dataset.days || 0);
  const best = Number(element.dataset.best || 0);

  element.innerHTML = `
    <h3>Streak</h3>
    <p><span class="streak-pill" aria-label="Current streak ${days} days">🔥 ${days} day streak</span></p>
    <p>Best streak: ${best} days</p>
  `;
};

const renderQuizWidget = (element) => {
  const question = element.dataset.question || 'Question unavailable.';
  const answerIndex = Number(element.dataset.answer || -1);
  const options = JSON.parse(element.dataset.options || '[]');

  element.innerHTML = '';
  const title = document.createElement('h3');
  title.textContent = 'Quiz Widget';
  const prompt = document.createElement('p');
  prompt.textContent = question;

  const optionWrapper = document.createElement('div');
  optionWrapper.className = 'quiz-options';

  const feedback = document.createElement('div');
  feedback.className = 'quiz-feedback';
  feedback.setAttribute('aria-live', 'polite');

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
    });
    optionWrapper.appendChild(button);
  });

  element.append(title, prompt, optionWrapper, feedback);
};

const renderConceptCards = () => {
  const container = document.querySelector('#concept-card-grid');
  if (!container) return;

  container.innerHTML = '';

  conceptCards.forEach((card, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'concept-card';
    button.setAttribute('role', 'option');
    button.setAttribute('aria-selected', index === 0 ? 'true' : 'false');
    button.setAttribute('tabindex', index === 0 ? '0' : '-1');
    button.setAttribute('aria-label', `${card.title}, ${card.chapter}, ${card.progress}% complete`);
    button.innerHTML = `<strong>${card.title}</strong><p>${card.chapter} · ${card.progress}% complete</p><p>${card.description}</p>`;
    button.addEventListener('click', () => {
      document.querySelectorAll('.concept-card').forEach((el) => el.setAttribute('aria-selected', 'false'));
      button.setAttribute('aria-selected', 'true');
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

const hydrateReusableComponents = () => {
  document.querySelectorAll('[data-component="progress-bar"]').forEach(renderProgressBar);
  document.querySelectorAll('[data-component="streak-indicator"]').forEach(renderStreakIndicator);
  document.querySelectorAll('[data-component="quiz-widget"]').forEach(renderQuizWidget);
};

hydrateReusableComponents();
renderConceptCards();
renderBadgeGallery();
bindHintTooltips();
