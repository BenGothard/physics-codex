const CONTENT_INDEX_PATH = 'content/lectures/v1/index.json';

const appState = {
  lectures: [],
  selectedLectureId: null,
  activeChallengeIndex: 0
};

const yearEl = document.querySelector('#year');
if (yearEl) {
  yearEl.textContent = String(new Date().getFullYear());
}

const escapeHtml = (value) =>
  String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

const slugify = (value) =>
  String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

const getProgressSnapshot = () => window.PhysicsCodexGamification?.getProgressSnapshot?.() || null;

const getCompletedLectureIds = () => new Set(getProgressSnapshot()?.course?.completedLectureIds || []);

const getNotesByLectureId = () => getProgressSnapshot()?.course?.notesByLectureId || {};

const getChallengeHistory = () => getProgressSnapshot()?.course?.challengeHistory || {};

const getSelectedLecture = () => appState.lectures.find((lecture) => lecture.id === appState.selectedLectureId) || null;

const getRecommendedLecture = () => {
  const completed = getCompletedLectureIds();
  return (
    appState.lectures.find((lecture) => !completed.has(lecture.id)) ||
    getSelectedLecture() ||
    appState.lectures[0] ||
    null
  );
};

const getLecturesByUnit = () => {
  const groups = new Map();

  appState.lectures.forEach((lecture) => {
    const key = lecture.unit_slug || `${lecture.volume}-${lecture.chapter}`;
    if (!groups.has(key)) {
      groups.set(key, {
        unitSlug: key,
        unitTitle: lecture.unit_title || `Volume ${lecture.volume} · Chapter ${lecture.chapter}`,
        summary: lecture.unit_summary || lecture.summary,
        lectures: []
      });
    }
    groups.get(key).lectures.push(lecture);
  });

  return [...groups.values()];
};

const getUnitCompletion = (unitLectures) => {
  const completed = getCompletedLectureIds();
  const total = unitLectures.length;
  const done = unitLectures.filter((lecture) => completed.has(lecture.id)).length;
  return {
    total,
    done,
    percent: total ? Math.round((done / total) * 100) : 0
  };
};

const setSelectedLecture = (lectureId, { resetChallengeIndex = true } = {}) => {
  appState.selectedLectureId = lectureId;
  if (resetChallengeIndex) {
    appState.activeChallengeIndex = 0;
  }
  window.PhysicsCodexGamification?.selectLecture?.(lectureId);
};

const updateResumeLink = () => {
  const link = document.querySelector('#resume-link');
  const lecture = getRecommendedLecture();
  if (!link || !lecture) return;
  link.textContent = `Resume ${lecture.title}`;
  link.setAttribute('aria-label', `Resume recommended lesson ${lecture.title}`);
};

const formatPercent = (value) => `${Math.min(100, Math.max(0, Math.round(value)))}%`;

const renderInfoPanel = (targetId, markup) => {
  const element = document.querySelector(targetId);
  if (element) {
    element.innerHTML = markup;
  }
};

const renderDashboard = () => {
  const lecture = getRecommendedLecture();
  const completed = getCompletedLectureIds();
  const snapshot = getProgressSnapshot();
  const unit = getLecturesByUnit()[0];
  const unitCompletion = unit ? getUnitCompletion(unit.lectures) : { done: 0, total: 0, percent: 0 };

  renderInfoPanel(
    '#study-pulse-card',
    `
      <p class="section-label">Study pulse</p>
      <p class="metric">${completed.size}/${appState.lectures.length || 0}</p>
      <p class="metric-note">Lessons completed in the current curriculum.</p>
    `
  );

  renderInfoPanel(
    '#recommended-card',
    `
      <p class="section-label">Recommended next</p>
      <h3>${lecture ? escapeHtml(lecture.title) : 'No lesson loaded'}</h3>
      <p class="metric-note">${lecture ? escapeHtml(lecture.summary) : 'Load lesson content to begin.'}</p>
    `
  );

  renderInfoPanel(
    '#streak-card',
    `
      <p class="section-label">Current streak</p>
      <p class="metric">${snapshot?.learner?.streak?.current || 0}d</p>
      <p class="metric-note">Best streak: ${snapshot?.learner?.streak?.longest || 0} days.</p>
    `
  );

  renderInfoPanel(
    '#level-card',
    `
      <p class="section-label">Scholar level</p>
      <p class="metric">L${snapshot?.learner?.level || 1}</p>
      <p class="metric-note">${escapeHtml(snapshot?.learner?.levelTitle || 'Observation Apprentice')} · ${snapshot?.learner?.xp || 0} XP</p>
    `
  );

  renderInfoPanel(
    '#progress-overview-card',
    `
      <p class="section-label">Course progress</p>
      <h3>Current completion</h3>
      <p class="metric-note">Physics Codex is focused on one complete introductory unit with a deliberate study loop.</p>
      <div class="progress-meter-block">
        <div class="progress-meter-label">
          <span>Lesson completion</span>
          <span>${formatPercent(unitCompletion.percent)}</span>
        </div>
        <div class="progress-meter" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${unitCompletion.percent}">
          <span style="width:${unitCompletion.percent}%"></span>
        </div>
      </div>
      <div class="progress-meter-block">
        <div class="progress-meter-label">
          <span>Challenge reps</span>
          <span>${snapshot?.learner?.metrics?.challengeCompletions || 0}</span>
        </div>
        <p class="metric-note">Every correct first-time solution adds XP and extends the practice ledger.</p>
      </div>
    `
  );

  renderInfoPanel(
    '#unit-progress-card',
    `
      <p class="section-label">Unit status</p>
      <h3>${escapeHtml(unit?.unitTitle || 'No unit loaded')}</h3>
      <p class="metric-note">${escapeHtml(unit?.summary || 'Load the lecture manifest to see the active unit.')}</p>
      <div class="progress-meter-block">
        <div class="progress-meter-label">
          <span>Lessons complete</span>
          <span>${unitCompletion.done}/${unitCompletion.total}</span>
        </div>
        <div class="progress-meter" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${unitCompletion.percent}">
          <span style="width:${unitCompletion.percent}%"></span>
        </div>
      </div>
      <p class="metric-note">Recommended next: ${escapeHtml(lecture?.title || 'Select a lesson')}</p>
    `
  );
};

const renderUnitMap = () => {
  const container = document.querySelector('#unit-grid');
  if (!container) return;

  const completed = getCompletedLectureIds();
  const units = getLecturesByUnit();

  container.innerHTML = units
    .map((unit) => {
      const completion = getUnitCompletion(unit.lectures);
      const lectureMarkup = unit.lectures
        .map((lecture) => {
          const active = lecture.id === appState.selectedLectureId;
          const isComplete = completed.has(lecture.id);
          return `
            <button
              type="button"
              class="lesson-select${active ? ' is-active' : ''}"
              data-lecture-select="${escapeHtml(lecture.id)}"
              aria-pressed="${active ? 'true' : 'false'}"
            >
              <div class="lesson-select-topline">
                <strong>${escapeHtml(lecture.title)}</strong>
                <span class="status-pill${isComplete ? ' completed' : ''}">${isComplete ? 'Completed' : 'Active'}</span>
              </div>
              <p class="metric-note">Section ${lecture.section} · ${lecture.estimated_minutes} min · ${escapeHtml(
                lecture.summary
              )}</p>
            </button>
          `;
        })
        .join('');

      return `
        <article class="unit-card">
          <div class="unit-card-header">
            <div>
              <p class="section-label">Unit</p>
              <h3>${escapeHtml(unit.unitTitle)}</h3>
            </div>
            <span class="unit-tag">${completion.done}/${completion.total} lessons</span>
          </div>
          <p class="metric-note">${escapeHtml(unit.summary)}</p>
          <div class="progress-meter-block">
            <div class="progress-meter-label">
              <span>Unit completion</span>
              <span>${formatPercent(completion.percent)}</span>
            </div>
            <div class="progress-meter" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${completion.percent}">
              <span style="width:${completion.percent}%"></span>
            </div>
          </div>
          <div class="unit-lecture-list">
            ${lectureMarkup}
          </div>
        </article>
      `;
    })
    .join('');

  container.querySelectorAll('[data-lecture-select]').forEach((button) => {
    button.addEventListener('click', () => {
      setSelectedLecture(button.getAttribute('data-lecture-select'));
      renderApp();
    });
  });
};

const buildEquationCards = (lecture) =>
  (lecture.equations || [])
    .map(
      (equation) => `
        <article class="equation-card">
          <p class="section-label">Equation</p>
          <h4>${escapeHtml(equation.name)}</h4>
          <code>${escapeHtml(equation.expression)}</code>
          <p>${escapeHtml(equation.meaning)}</p>
          <p class="metric-note">${escapeHtml(equation.variables)}</p>
        </article>
      `
    )
    .join('');

const buildExampleCards = (lecture) =>
  (lecture.worked_examples || [])
    .map((example) => {
      const steps = (example.steps || []).map((step) => `<li>${escapeHtml(step)}</li>`).join('');
      return `
        <article class="example-card">
          <p class="section-label">Worked example</p>
          <h4>${escapeHtml(example.title)}</h4>
          <p>${escapeHtml(example.problem)}</p>
          <ol class="challenge-meta">${steps}</ol>
          <p class="metric-note"><strong>Answer:</strong> ${escapeHtml(example.answer)}</p>
        </article>
      `;
    })
    .join('');

const buildMistakeCards = (lecture) =>
  (lecture.common_mistakes || [])
    .map(
      (item) => `
        <article class="mistake-card">
          <p class="section-label">Common mistake</p>
          <h4>${escapeHtml(item.mistake)}</h4>
          <p class="metric-note">${escapeHtml(item.correction)}</p>
        </article>
      `
    )
    .join('');

const buildCheckpointCards = (lecture) =>
  (lecture.checkpoints || [])
    .map((checkpoint, index) => {
      const revealId = `checkpoint-reveal-${index}`;
      return `
        <article class="checkpoint-card">
          <p class="section-label">Predict first</p>
          <h4>${escapeHtml(checkpoint.prompt)}</h4>
          <textarea rows="3" placeholder="${escapeHtml(checkpoint.prediction)}"></textarea>
          <button type="button" class="reveal-button" data-checkpoint-toggle="${revealId}">Reveal tutor note</button>
          <div id="${revealId}" class="checkpoint-reveal" hidden>
            <p>${escapeHtml(checkpoint.reveal)}</p>
          </div>
        </article>
      `;
    })
    .join('');

const evaluateFormula = (formula, values) => {
  const entries = Object.entries(values);
  const keys = entries.map(([key]) => key);
  const args = entries.map(([, value]) => value);
  try {
    const fn = new Function(...keys, `return ${formula};`);
    const result = Number(fn(...args));
    return Number.isFinite(result) ? result : 0;
  } catch (error) {
    return 0;
  }
};

const buildLabMarkup = (lab) => {
  if (!lab) {
    return `
      <section class="lab-panel">
        <p class="section-label">Interactive lab</p>
        <p class="empty-state">This lesson does not include an interactive lab yet.</p>
      </section>
    `;
  }

  const xId = slugify(`${lab.title}-${lab.x_key}`);
  const yId = slugify(`${lab.title}-${lab.y_key}`);
  return `
    <section class="lab-panel">
      <p class="section-label">Interactive lab</p>
      <h4>${escapeHtml(lab.title)}</h4>
      <p class="metric-note">${escapeHtml(lab.prompt)}</p>
      <div class="lab-controls">
        <div class="lab-control">
          <label for="${xId}">
            <span>${escapeHtml(lab.x_label)}</span>
            <span data-lab-value="${escapeHtml(lab.x_key)}"></span>
          </label>
          <input
            id="${xId}"
            type="range"
            min="${lab.x_min}"
            max="${lab.x_max}"
            step="${lab.x_step}"
            value="${lab.x_default}"
            data-lab-control="${escapeHtml(lab.x_key)}"
          />
        </div>
        <div class="lab-control">
          <label for="${yId}">
            <span>${escapeHtml(lab.y_label)}</span>
            <span data-lab-value="${escapeHtml(lab.y_key)}"></span>
          </label>
          <input
            id="${yId}"
            type="range"
            min="${lab.y_min}"
            max="${lab.y_max}"
            step="${lab.y_step}"
            value="${lab.y_default}"
            data-lab-control="${escapeHtml(lab.y_key)}"
          />
        </div>
      </div>
      <div class="lab-output-row">
        <div class="lab-readout">
          <span class="lab-readout-label">${escapeHtml(lab.output_label)}</span>
          <span class="lab-readout-value" data-lab-output>${escapeHtml(lab.output_unit)}</span>
        </div>
        <div class="lab-readout">
          <span class="lab-readout-label">Tutor insight</span>
          <span class="metric-note">${escapeHtml(lab.insight)}</span>
        </div>
      </div>
      <svg class="lab-chart" viewBox="0 0 320 160" aria-label="${escapeHtml(lab.title)} chart">
        <polyline data-lab-line fill="none" stroke="#83f0d4" stroke-width="3"></polyline>
        <circle data-lab-point r="5" fill="#f1bc62"></circle>
      </svg>
    </section>
  `;
};

const bindInteractiveLab = (lecture) => {
  const lab = lecture?.interactive_lab;
  if (!lab) return;

  const controls = [...document.querySelectorAll('[data-lab-control]')];
  const line = document.querySelector('[data-lab-line]');
  const point = document.querySelector('[data-lab-point]');
  const output = document.querySelector('[data-lab-output]');

  const render = () => {
    const values = {};
    controls.forEach((control) => {
      const key = control.getAttribute('data-lab-control');
      values[key] = Number(control.value);
      const label = document.querySelector(`[data-lab-value="${key}"]`);
      const unit = key === lab.x_key ? lab.x_unit : lab.y_unit;
      if (label) {
        label.textContent = `${values[key]} ${unit}`;
      }
    });

    const result = evaluateFormula(lab.formula, values);
    if (output) {
      output.textContent = `${result.toFixed(lab.output_precision || 2)} ${lab.output_unit}`;
    }

    if (line) {
      const steps = 24;
      const points = [];
      let maxOutput = 0;
      for (let index = 0; index <= steps; index += 1) {
        const sampleValues = { ...values };
        sampleValues[lab.x_key] = lab.x_min + ((lab.x_max - lab.x_min) / steps) * index;
        const sampleOutput = Math.max(0, evaluateFormula(lab.formula, sampleValues));
        maxOutput = Math.max(maxOutput, sampleOutput);
        points.push({ x: sampleValues[lab.x_key], y: sampleOutput });
      }

      const safeMaxOutput = maxOutput || 1;
      const polylinePoints = points
        .map((sample, index) => {
          const x = 18 + (index / steps) * 284;
          const y = 138 - (sample.y / safeMaxOutput) * 112;
          return `${x},${y}`;
        })
        .join(' ');

      line.setAttribute('points', polylinePoints);

      if (point) {
        const pointX = 18 + ((values[lab.x_key] - lab.x_min) / (lab.x_max - lab.x_min || 1)) * 284;
        const pointY = 138 - (Math.max(0, result) / safeMaxOutput) * 112;
        point.setAttribute('cx', String(pointX));
        point.setAttribute('cy', String(pointY));
      }
    }
  };

  controls.forEach((control) => control.addEventListener('input', render));
  render();
};

const renderLesson = () => {
  const lecture = getSelectedLecture();
  const notes = getNotesByLectureId();
  const badge = document.querySelector('#active-lesson-badge');
  const title = document.querySelector('#active-lesson-title');
  const summary = document.querySelector('#active-lesson-summary');
  const meta = document.querySelector('#lesson-meta');
  const content = document.querySelector('#lesson-content');
  const notesField = document.querySelector('#lesson-notes');
  const status = document.querySelector('#lesson-status');

  if (!badge || !title || !summary || !meta || !content || !notesField || !status) return;

  if (!lecture) {
    badge.textContent = 'Lesson';
    title.textContent = 'Select a lesson';
    summary.textContent = 'Choose a lesson from the unit map to open the lesson workspace.';
    meta.textContent = '';
    content.innerHTML = '';
    notesField.value = '';
    status.textContent = '';
    return;
  }

  badge.textContent = lecture.unit_title || 'Lesson';
  title.textContent = lecture.title;
  summary.textContent = lecture.summary;
  meta.textContent = `Volume ${lecture.volume} · Chapter ${lecture.chapter} · Section ${lecture.section} · ${lecture.estimated_minutes} min`;

  content.innerHTML = `
    <div class="lesson-grid">
      <section class="lesson-panel">
        <p class="section-label">Concept overview</p>
        <h4>Learning objectives</h4>
        <ul class="objective-list">
          ${(lecture.learning_objectives || []).map((item) => `<li>${escapeHtml(item)}</li>`).join('')}
        </ul>
        <h4>Key concepts</h4>
        <ul class="concept-list">
          ${(lecture.key_concepts || []).map((item) => `<li>${escapeHtml(item)}</li>`).join('')}
        </ul>
        <p class="support-copy">${escapeHtml(lecture.quick_recap || '')}</p>
      </section>
      ${buildLabMarkup(lecture.interactive_lab)}
    </div>

    <section class="lesson-panel">
      <p class="section-label">Core equations</p>
      <div class="equation-grid">
        ${buildEquationCards(lecture)}
      </div>
    </section>

    <section class="lesson-panel">
      <p class="section-label">Worked reasoning</p>
      <div class="example-grid">
        ${buildExampleCards(lecture)}
      </div>
    </section>

    <section class="lesson-panel">
      <p class="section-label">Common mistakes</p>
      <div class="mistake-grid">
        ${buildMistakeCards(lecture)}
      </div>
    </section>

    <section class="lesson-panel">
      <p class="section-label">Checkpoints</p>
      <div class="checkpoint-grid">
        ${buildCheckpointCards(lecture)}
      </div>
    </section>
  `;

  notesField.value = notes[lecture.id] || '';
  status.textContent = '';

  content.querySelectorAll('[data-checkpoint-toggle]').forEach((button) => {
    button.addEventListener('click', () => {
      const reveal = document.querySelector(`#${button.getAttribute('data-checkpoint-toggle')}`);
      if (!reveal) return;
      const isHidden = reveal.hasAttribute('hidden');
      if (isHidden) {
        reveal.removeAttribute('hidden');
        button.textContent = 'Hide tutor note';
      } else {
        reveal.setAttribute('hidden', '');
        button.textContent = 'Reveal tutor note';
      }
    });
  });

  bindInteractiveLab(lecture);
};

const getActiveChallenge = (lecture) => {
  if (!lecture?.challenge_sets?.length) return null;
  return lecture.challenge_sets[appState.activeChallengeIndex] || lecture.challenge_sets[0];
};

const getChallengeSolvedState = (lectureId, challengeId) =>
  Boolean(getChallengeHistory()?.[lectureId]?.[challengeId]?.isCorrect);

const setFeedback = (element, message, type = '') => {
  if (!element) return;
  element.textContent = message;
  element.className = `feedback-box${type ? ` is-${type}` : ''}`;
};

const renderChallengeTabs = (lecture) => {
  const tablist = document.querySelector('#challenge-tablist');
  if (!tablist) return;

  if (!lecture?.challenge_sets?.length) {
    tablist.innerHTML = '';
    return;
  }

  tablist.innerHTML = lecture.challenge_sets
    .map((challenge, index) => {
      const solved = getChallengeSolvedState(lecture.id, challenge.id);
      return `
        <button
          type="button"
          role="tab"
          class="challenge-tab"
          aria-selected="${index === appState.activeChallengeIndex ? 'true' : 'false'}"
          aria-controls="challenge-stage"
          data-challenge-index="${index}"
        >
          ${escapeHtml(challenge.type_label || challenge.title)}
          <span class="sr-only">${solved ? ' completed' : ''}</span>
        </button>
      `;
    })
    .join('');

  tablist.querySelectorAll('[data-challenge-index]').forEach((button) => {
    button.addEventListener('click', () => {
      appState.activeChallengeIndex = Number(button.getAttribute('data-challenge-index'));
      renderPractice();
    });
  });
};

const renderMultipleChoice = (container, lecture, challenge) => {
  const feedback = container.querySelector('[data-feedback]');
  container.querySelectorAll('[data-option-index]').forEach((button) => {
    button.addEventListener('click', () => {
      const optionIndex = Number(button.getAttribute('data-option-index'));
      const isCorrect = optionIndex === challenge.answer;
      container.querySelectorAll('[data-option-index]').forEach((optionButton) => {
        optionButton.classList.remove('is-correct', 'is-wrong');
      });
      button.classList.add(isCorrect ? 'is-correct' : 'is-wrong');
      setFeedback(feedback, isCorrect ? challenge.explanation : 'Not quite. Re-read the lesson cues and try again.', isCorrect ? 'success' : 'warning');
      window.PhysicsCodexGamification?.recordChallengeResult?.({
        lectureId: lecture.id,
        challengeId: challenge.id,
        challengeTypeId: challenge.type,
        isCorrect,
        response: challenge.options[optionIndex]
      });
      renderDashboard();
      renderProgress();
      renderChallengeTabs(lecture);
    });
  });
};

const renderConceptMatch = (container, lecture, challenge) => {
  const feedback = container.querySelector('[data-feedback]');
  const button = container.querySelector('[data-check-match]');
  if (!button) return;

  button.addEventListener('click', () => {
    const selects = [...container.querySelectorAll('[data-match-term]')];
    const allCorrect = selects.every((select) => {
      const term = select.getAttribute('data-match-term');
      return challenge.pairs.find((pair) => pair.term === term)?.match === select.value;
    });
    setFeedback(
      feedback,
      allCorrect ? challenge.explanation : 'Some matches are off. Compare each term to the lesson definitions and try again.',
      allCorrect ? 'success' : 'warning'
    );
    window.PhysicsCodexGamification?.recordChallengeResult?.({
      lectureId: lecture.id,
      challengeId: challenge.id,
      challengeTypeId: challenge.type,
      isCorrect: allCorrect,
      response: selects.map((select) => ({ term: select.getAttribute('data-match-term'), value: select.value }))
    });
    renderDashboard();
    renderProgress();
    renderChallengeTabs(lecture);
  });
};

const renderEstimationPuzzle = (container, lecture, challenge) => {
  const feedback = container.querySelector('[data-feedback]');
  const textarea = container.querySelector('.challenge-textarea');
  const button = container.querySelector('[data-submit-estimate]');
  const reveal = container.querySelector('[data-estimate-reveal]');
  if (!button || !textarea || !reveal) return;

  button.addEventListener('click', () => {
    const response = textarea.value.trim();
    if (!response) {
      setFeedback(feedback, 'Write a short estimate before revealing the sample reasoning.', 'warning');
      return;
    }
    reveal.hidden = false;
    setFeedback(feedback, challenge.explanation, 'success');
    window.PhysicsCodexGamification?.recordChallengeResult?.({
      lectureId: lecture.id,
      challengeId: challenge.id,
      challengeTypeId: challenge.type,
      isCorrect: true,
      response
    });
    renderDashboard();
    renderProgress();
    renderChallengeTabs(lecture);
  });
};

const updateDerivationSelection = (container, selection) => {
  const result = container.querySelector('[data-selection-result]');
  if (!result) return;
  result.innerHTML = selection.length
    ? selection
        .map(
          (step, index) => `
            <span class="solution-chip">${index + 1}. ${escapeHtml(step)}</span>
          `
        )
        .join('')
    : '<span class="metric-note">No steps selected yet.</span>';
};

const renderDerivationSteps = (container, lecture, challenge) => {
  const feedback = container.querySelector('[data-feedback]');
  const bankButtons = [...container.querySelectorAll('[data-step-value]')];
  const checkButton = container.querySelector('[data-check-derivation]');
  const clearButton = container.querySelector('[data-clear-derivation]');
  const selection = [];

  bankButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const value = button.getAttribute('data-step-value');
      if (!value || selection.includes(value)) return;
      selection.push(value);
      button.disabled = true;
      updateDerivationSelection(container, selection);
    });
  });

  clearButton?.addEventListener('click', () => {
    selection.length = 0;
    bankButtons.forEach((button) => {
      button.disabled = false;
      button.classList.remove('is-correct', 'is-wrong');
    });
    updateDerivationSelection(container, selection);
    setFeedback(feedback, '', '');
  });

  checkButton?.addEventListener('click', () => {
    const orderedSteps = challenge.solution_order.map((index) => challenge.steps[index]);
    const isCorrect =
      selection.length === orderedSteps.length &&
      selection.every((step, index) => step === orderedSteps[index]);

    setFeedback(
      feedback,
      isCorrect ? challenge.explanation : `Correct order: ${orderedSteps.join(' -> ')}`,
      isCorrect ? 'success' : 'warning'
    );

    window.PhysicsCodexGamification?.recordChallengeResult?.({
      lectureId: lecture.id,
      challengeId: challenge.id,
      challengeTypeId: challenge.type,
      isCorrect,
      response: selection
    });
    renderDashboard();
    renderProgress();
    renderChallengeTabs(lecture);
  });

  updateDerivationSelection(container, selection);
};

const renderChallengeStage = (lecture) => {
  const container = document.querySelector('#challenge-stage');
  const summary = document.querySelector('#practice-summary');
  if (!container || !summary) return;

  const challenge = getActiveChallenge(lecture);
  if (!lecture || !challenge) {
    summary.textContent = 'Select a lesson with challenge content to begin practice.';
    container.innerHTML = '<p class="empty-state">Practice content will appear here.</p>';
    return;
  }

  const solved = getChallengeSolvedState(lecture.id, challenge.id);
  summary.textContent = `${lecture.challenge_sets.length} challenge modes available for ${lecture.title}.`;

  if (challenge.type === 'multiple_choice') {
    container.innerHTML = `
      <article class="challenge-card">
        <div class="challenge-card-header">
          <div>
            <p class="section-label">Practice mode</p>
            <h4>${escapeHtml(challenge.title)}</h4>
          </div>
          <span class="practice-pill${solved ? ' is-complete' : ''}">${solved ? 'Completed' : 'Ready'}</span>
        </div>
        <p>${escapeHtml(challenge.prompt)}</p>
        <div class="option-list">
          ${(challenge.options || [])
            .map(
              (option, index) => `
                <button type="button" class="option-button" data-option-index="${index}">${escapeHtml(option)}</button>
              `
            )
            .join('')}
        </div>
        <div class="feedback-box" data-feedback></div>
      </article>
    `;
    renderMultipleChoice(container, lecture, challenge);
    return;
  }

  if (challenge.type === 'concept_match') {
    const options = challenge.pairs.map((pair) => pair.match);
    container.innerHTML = `
      <article class="challenge-card">
        <div class="challenge-card-header">
          <div>
            <p class="section-label">Practice mode</p>
            <h4>${escapeHtml(challenge.title)}</h4>
          </div>
          <span class="practice-pill${solved ? ' is-complete' : ''}">${solved ? 'Completed' : 'Ready'}</span>
        </div>
        <p>${escapeHtml(challenge.prompt)}</p>
        <div class="match-grid">
          ${(challenge.pairs || [])
            .map(
              (pair) => `
                <label>
                  <span>${escapeHtml(pair.term)}</span>
                  <select class="match-select" data-match-term="${escapeHtml(pair.term)}">
                    <option value="">Choose a match</option>
                    ${options.map((option) => `<option value="${escapeHtml(option)}">${escapeHtml(option)}</option>`).join('')}
                  </select>
                </label>
              `
            )
            .join('')}
        </div>
        <button type="button" class="challenge-button" data-check-match>Check matches</button>
        <div class="feedback-box" data-feedback></div>
      </article>
    `;
    renderConceptMatch(container, lecture, challenge);
    return;
  }

  if (challenge.type === 'estimation_puzzle') {
    container.innerHTML = `
      <article class="challenge-card">
        <div class="challenge-card-header">
          <div>
            <p class="section-label">Practice mode</p>
            <h4>${escapeHtml(challenge.title)}</h4>
          </div>
          <span class="practice-pill${solved ? ' is-complete' : ''}">${solved ? 'Completed' : 'Ready'}</span>
        </div>
        <p>${escapeHtml(challenge.prompt)}</p>
        <p class="metric-note">${escapeHtml(challenge.rubric)}</p>
        <textarea class="challenge-textarea" rows="5" placeholder="State assumptions, estimate, and units."></textarea>
        <button type="button" class="challenge-button" data-submit-estimate>Reveal sample reasoning</button>
        <div class="feedback-box" data-feedback></div>
        <div data-estimate-reveal hidden>
          <p class="section-label">Tutor reasoning</p>
          <p>${escapeHtml(challenge.sample_answer)}</p>
        </div>
      </article>
    `;
    renderEstimationPuzzle(container, lecture, challenge);
    return;
  }

  if (challenge.type === 'derivation_steps') {
    container.innerHTML = `
      <article class="challenge-card">
        <div class="challenge-card-header">
          <div>
            <p class="section-label">Practice mode</p>
            <h4>${escapeHtml(challenge.title)}</h4>
          </div>
          <span class="practice-pill${solved ? ' is-complete' : ''}">${solved ? 'Completed' : 'Ready'}</span>
        </div>
        <p>${escapeHtml(challenge.prompt)}</p>
        <div class="selection-bank">
          ${(challenge.steps || [])
            .map(
              (step) => `
                <button type="button" class="challenge-button" data-step-value="${escapeHtml(step)}">${escapeHtml(step)}</button>
              `
            )
            .join('')}
        </div>
        <div class="selection-result" data-selection-result></div>
        <div class="lesson-toolbar">
          <button type="button" class="challenge-button" data-check-derivation>Check order</button>
          <button type="button" class="challenge-button" data-clear-derivation>Clear selection</button>
        </div>
        <div class="feedback-box" data-feedback></div>
      </article>
    `;
    renderDerivationSteps(container, lecture, challenge);
  }
};

const renderPractice = () => {
  const lecture = getSelectedLecture();
  renderChallengeTabs(lecture);
  renderChallengeStage(lecture);
};

const renderProgress = () => {
  const snapshot = getProgressSnapshot();
  const badgeDefinitions = window.PhysicsCodexGamification?.getBadgeDefinitions?.() || {};
  const badgeGallery = document.querySelector('#badge-gallery');
  const historyPanel = document.querySelector('#history-panel');
  const recommended = getRecommendedLecture();

  if (badgeGallery) {
    const earnedIds = new Set((snapshot?.learner?.badges || []).map((badge) => badge.id));
    badgeGallery.innerHTML = `
      <p class="section-label">Badges</p>
      <h3>Earned through consistent study, not grind for its own sake.</h3>
      <div class="badge-grid">
        ${Object.values(badgeDefinitions)
          .map(
            (badge) => `
              <article class="badge${earnedIds.has(badge.id) ? ' is-earned' : ''}">
                <strong>${escapeHtml(badge.title)}</strong>
                <p class="metric-note">${escapeHtml(badge.criteria)}</p>
              </article>
            `
          )
          .join('')}
      </div>
    `;
  }

  if (historyPanel) {
    const challengeHistory = getChallengeHistory();
    const rows = Object.entries(challengeHistory)
      .flatMap(([lectureId, items]) =>
        Object.values(items).map((item) => ({
          lectureId,
          ...item
        }))
      )
      .sort((left, right) => String(right.completedAt).localeCompare(String(left.completedAt)))
      .slice(0, 5);

    historyPanel.innerHTML = `
      <p class="section-label">Recent history</p>
      <h3>Practice ledger</h3>
      ${
        rows.length
          ? `<ul class="history-list">
              ${rows
                .map((row) => {
                  const lecture = appState.lectures.find((item) => item.id === row.lectureId);
                  return `<li>${escapeHtml(lecture?.title || row.lectureId)} · ${escapeHtml(
                    row.challengeTypeId
                  )} · ${row.isCorrect ? 'correct' : 'attempted'}</li>`;
                })
                .join('')}
            </ul>`
          : '<p class="metric-note">Your recent challenge attempts will appear here.</p>'
      }
      <p class="metric-note">Recommended next lesson: ${escapeHtml(recommended?.title || 'Select a lesson')}</p>
    `;
  }
};

const bindLessonActions = () => {
  const saveButton = document.querySelector('#save-notes-button');
  const completeButton = document.querySelector('#complete-lesson-button');
  const notesField = document.querySelector('#lesson-notes');
  const status = document.querySelector('#lesson-status');

  saveButton?.addEventListener('click', () => {
    const lecture = getSelectedLecture();
    if (!lecture || !notesField) return;
    window.PhysicsCodexGamification?.saveNotes?.(lecture.id, notesField.value);
    if (status) {
      status.textContent = 'Notes saved to your local study history.';
    }
    renderProgress();
  });

  completeButton?.addEventListener('click', () => {
    const lecture = getSelectedLecture();
    if (!lecture || !status) return;
    window.PhysicsCodexGamification?.markLessonComplete?.(lecture.id);
    status.textContent = `${lecture.title} marked complete.`;
    renderApp();
  });
};

const hydrateSelectionFromProgress = () => {
  const snapshot = getProgressSnapshot();
  const storedLectureId = snapshot?.selectedLectureId;
  const validStoredLecture = appState.lectures.find((lecture) => lecture.id === storedLectureId);
  appState.selectedLectureId = validStoredLecture?.id || getRecommendedLecture()?.id || appState.lectures[0]?.id || null;
};

const loadLectures = async () => {
  const response = await fetch(CONTENT_INDEX_PATH);
  if (!response.ok) {
    throw new Error(`Unable to load lecture index (${response.status})`);
  }

  const manifest = await response.json();
  const lectures = await Promise.all(
    (manifest.lectures || []).map(async (record) => {
      const lectureResponse = await fetch(record.path);
      if (!lectureResponse.ok) {
        throw new Error(`Unable to load lecture file ${record.path}`);
      }
      const detail = await lectureResponse.json();
      return {
        ...record,
        ...detail
      };
    })
  );

  return lectures.sort((left, right) => {
    if (left.chapter !== right.chapter) return left.chapter - right.chapter;
    return left.section - right.section;
  });
};

const renderApp = () => {
  updateResumeLink();
  renderDashboard();
  renderUnitMap();
  renderLesson();
  renderPractice();
  renderProgress();
};

const renderLoadError = (error) => {
  const targets = ['#unit-grid', '#lesson-content', '#challenge-stage', '#badge-gallery', '#history-panel'];
  targets.forEach((selector) => {
    const element = document.querySelector(selector);
    if (element) {
      element.innerHTML = `<p class="empty-state">Unable to load course content. Start a local server and refresh. ${escapeHtml(
        error.message || ''
      )}</p>`;
    }
  });
};

const bootstrap = async () => {
  bindLessonActions();

  try {
    appState.lectures = await loadLectures();
    hydrateSelectionFromProgress();
    renderApp();
  } catch (error) {
    renderLoadError(error);
  }
};

bootstrap();
