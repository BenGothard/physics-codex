(() => {
  'use strict';

  const STORAGE_NAMESPACE = 'physics-codex';
  const ACTIVE_STORAGE_KEY = `${STORAGE_NAMESPACE}:app-state:v2`;
  const LEGACY_LESSON_KEY = `${STORAGE_NAMESPACE}:lesson-state:v1`;
  const LEGACY_PROGRESS_KEY = `${STORAGE_NAMESPACE}:learner-progress:v1`;
  const SCHEMA_VERSION = 2;

  const XP_RULES = Object.freeze({
    lessonCompletion: 30,
    challengeByType: Object.freeze({
      multiple_choice: 15,
      concept_match: 20,
      estimation_puzzle: 24,
      derivation_steps: 32
    }),
    badgeUnlock: 25,
    dailyStreakBonusPerDay: 5,
    maxDailyStreakBonusDays: 7
  });

  const LEVEL_THRESHOLDS = Object.freeze([
    { level: 1, minXp: 0, title: 'Observation Apprentice' },
    { level: 2, minXp: 90, title: 'Vector Reader' },
    { level: 3, minXp: 210, title: 'Kinematics Analyst' },
    { level: 4, minXp: 360, title: 'Problem Builder' },
    { level: 5, minXp: 560, title: 'Mechanics Strategist' },
    { level: 6, minXp: 820, title: 'Codex Scholar' }
  ]);

  const BADGE_DEFINITIONS = Object.freeze({
    first_steps: Object.freeze({
      id: 'first_steps',
      title: 'First Steps',
      criteria: 'Complete the first practice prompt.'
    }),
    consistency_builder: Object.freeze({
      id: 'consistency_builder',
      title: 'Consistency Builder',
      criteria: 'Maintain a 3-day practice streak.'
    }),
    lesson_finisher: Object.freeze({
      id: 'lesson_finisher',
      title: 'Lesson Finisher',
      criteria: 'Complete three lessons in the unit.'
    }),
    practice_variety: Object.freeze({
      id: 'practice_variety',
      title: 'Practice Variety',
      criteria: 'Complete all four challenge modes at least once.'
    })
  });

  const CANONICAL_CHALLENGE_TYPES = Object.freeze({
    multiple_choice: Object.freeze({
      id: 'multiple_choice',
      label: 'Multiple Choice',
      description: 'Choose the best conceptual answer.'
    }),
    concept_match: Object.freeze({
      id: 'concept_match',
      label: 'Concept Match',
      description: 'Match terms to the correct physical interpretation.'
    }),
    estimation_puzzle: Object.freeze({
      id: 'estimation_puzzle',
      label: 'Estimation Puzzle',
      description: 'Write a reasonable estimate and compare with expert reasoning.'
    }),
    derivation_steps: Object.freeze({
      id: 'derivation_steps',
      label: 'Derivation Steps',
      description: 'Assemble a derivation in the correct logical order.'
    })
  });

  const isBrowserStorageAvailable = () => typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

  const toIsoDate = (date = new Date()) => date.toISOString().slice(0, 10);

  const createDefaultState = () => ({
    schemaVersion: SCHEMA_VERSION,
    selectedLectureId: null,
    course: {
      completedLectureIds: [],
      notesByLectureId: {},
      challengeHistory: {}
    },
    learner: {
      xp: 0,
      level: 1,
      levelTitle: LEVEL_THRESHOLDS[0].title,
      streak: {
        current: 0,
        longest: 0,
        lastActiveDate: null
      },
      badges: [],
      metrics: {
        lessonCompletions: 0,
        challengeCompletions: 0,
        challengeByType: {}
      }
    },
    updatedAt: new Date().toISOString()
  });

  const deepClone = (value) => JSON.parse(JSON.stringify(value));

  const saveState = (state) => {
    if (!isBrowserStorageAvailable()) return;
    window.localStorage.setItem(ACTIVE_STORAGE_KEY, JSON.stringify(state));
  };

  const getLevelForXp = (xp) => {
    let current = LEVEL_THRESHOLDS[0];
    for (const threshold of LEVEL_THRESHOLDS) {
      if (xp >= threshold.minXp) {
        current = threshold;
      } else {
        break;
      }
    }
    return current;
  };

  const normalizeState = (state) => {
    const defaults = createDefaultState();
    return {
      ...defaults,
      ...state,
      course: {
        ...defaults.course,
        ...(state?.course || {}),
        completedLectureIds: Array.isArray(state?.course?.completedLectureIds)
          ? [...new Set(state.course.completedLectureIds.filter(Boolean))]
          : [],
        notesByLectureId:
          state?.course?.notesByLectureId && typeof state.course.notesByLectureId === 'object'
            ? state.course.notesByLectureId
            : {},
        challengeHistory:
          state?.course?.challengeHistory && typeof state.course.challengeHistory === 'object'
            ? state.course.challengeHistory
            : {}
      },
      learner: {
        ...defaults.learner,
        ...(state?.learner || {}),
        streak: {
          ...defaults.learner.streak,
          ...(state?.learner?.streak || {})
        },
        badges: Array.isArray(state?.learner?.badges) ? state.learner.badges : [],
        metrics: {
          ...defaults.learner.metrics,
          ...(state?.learner?.metrics || {}),
          challengeByType:
            state?.learner?.metrics?.challengeByType && typeof state.learner.metrics.challengeByType === 'object'
              ? state.learner.metrics.challengeByType
              : {}
        }
      }
    };
  };

  const migrateLegacyState = () => {
    const next = createDefaultState();
    if (!isBrowserStorageAvailable()) return next;

    try {
      const legacyLesson = JSON.parse(window.localStorage.getItem(LEGACY_LESSON_KEY) || 'null');
      if (legacyLesson && typeof legacyLesson === 'object') {
        if (Array.isArray(legacyLesson.completedLectureIds)) {
          next.course.completedLectureIds = [...new Set(legacyLesson.completedLectureIds.filter(Boolean))];
          next.learner.metrics.lessonCompletions = next.course.completedLectureIds.length;
        }
        if (legacyLesson.notesByLectureId && typeof legacyLesson.notesByLectureId === 'object') {
          next.course.notesByLectureId = legacyLesson.notesByLectureId;
        }
      }
    } catch (error) {
      // Ignore malformed legacy lesson state.
    }

    try {
      const legacyProgress = JSON.parse(window.localStorage.getItem(LEGACY_PROGRESS_KEY) || 'null');
      if (legacyProgress && typeof legacyProgress === 'object') {
        next.learner.xp = Number(legacyProgress.xp) || 0;
        next.learner.level = Number(legacyProgress.level) || next.learner.level;
        next.learner.levelTitle = legacyProgress.levelTitle || next.learner.levelTitle;
        next.learner.streak = {
          ...next.learner.streak,
          ...(legacyProgress.streak || {})
        };
        next.learner.badges = Array.isArray(legacyProgress.badges) ? legacyProgress.badges : [];
        next.learner.metrics.challengeCompletions = Number(legacyProgress.metrics?.challengeCompletions) || 0;
        next.learner.metrics.challengeByType =
          legacyProgress.metrics?.challengeByType && typeof legacyProgress.metrics.challengeByType === 'object'
            ? legacyProgress.metrics.challengeByType
            : {};
      }
    } catch (error) {
      // Ignore malformed legacy progress state.
    }

    return next;
  };

  const migrateState = (state) => {
    if (!state || typeof state !== 'object') {
      return migrateLegacyState();
    }

    if (state.schemaVersion === SCHEMA_VERSION) {
      return normalizeState(state);
    }

    return migrateLegacyState();
  };

  const loadState = () => {
    if (!isBrowserStorageAvailable()) {
      return createDefaultState();
    }

    try {
      const raw = window.localStorage.getItem(ACTIVE_STORAGE_KEY);
      if (!raw) {
        return migrateLegacyState();
      }
      return migrateState(JSON.parse(raw));
    } catch (error) {
      return createDefaultState();
    }
  };

  let currentState = loadState();

  const persist = () => {
    currentState.updatedAt = new Date().toISOString();
    saveState(currentState);
  };

  const refreshLevel = () => {
    const level = getLevelForXp(currentState.learner.xp);
    currentState.learner.level = level.level;
    currentState.learner.levelTitle = level.title;
  };

  const unlockBadge = (badgeId, metadata = {}) => {
    if (!BADGE_DEFINITIONS[badgeId]) return;
    const alreadyUnlocked = currentState.learner.badges.some((badge) => badge.id === badgeId);
    if (alreadyUnlocked) return;

    currentState.learner.badges.push({
      id: badgeId,
      unlockedAt: new Date().toISOString(),
      metadata
    });
    currentState.learner.xp += XP_RULES.badgeUnlock;
    refreshLevel();
  };

  const updateStreak = (activityDate = new Date()) => {
    const today = toIsoDate(activityDate);
    const streak = currentState.learner.streak;
    if (streak.lastActiveDate === today) return;

    if (!streak.lastActiveDate) {
      streak.current = 1;
    } else {
      const msDelta = activityDate.getTime() - new Date(streak.lastActiveDate).getTime();
      const dayDelta = Math.round(msDelta / 86400000);
      streak.current = dayDelta === 1 ? streak.current + 1 : 1;
    }

    streak.lastActiveDate = today;
    streak.longest = Math.max(streak.longest, streak.current);

    if (streak.current >= 3) {
      unlockBadge('consistency_builder', { trigger: 'streak' });
    }
  };

  const awardXp = (amount) => {
    const normalizedAmount = Number.isFinite(amount) ? Math.max(0, Math.floor(amount)) : 0;
    if (!normalizedAmount) return;
    currentState.learner.xp += normalizedAmount;
    refreshLevel();
  };

  const saveNotes = (lectureId, notes) => {
    if (!lectureId) return getProgressSnapshot();
    currentState.course.notesByLectureId[lectureId] = String(notes || '').trim();
    persist();
    return getProgressSnapshot();
  };

  const selectLecture = (lectureId) => {
    currentState.selectedLectureId = lectureId || null;
    persist();
    return getProgressSnapshot();
  };

  const markLessonComplete = (lectureId) => {
    if (!lectureId) return getProgressSnapshot();
    const completed = currentState.course.completedLectureIds;
    if (!completed.includes(lectureId)) {
      completed.push(lectureId);
      currentState.learner.metrics.lessonCompletions += 1;
      updateStreak();
      awardXp(XP_RULES.lessonCompletion);
      if (currentState.learner.metrics.lessonCompletions >= 3) {
        unlockBadge('lesson_finisher', { trigger: 'lesson_count' });
      }
      persist();
    } else {
      persist();
    }
    return getProgressSnapshot();
  };

  const recordChallengeResult = ({ lectureId, challengeId, challengeTypeId, isCorrect, response }) => {
    if (!lectureId || !challengeId || !challengeTypeId) return getProgressSnapshot();

    const lectureHistory = currentState.course.challengeHistory[lectureId] || {};
    const prior = lectureHistory[challengeId];
    lectureHistory[challengeId] = {
      challengeId,
      challengeTypeId,
      isCorrect: Boolean(isCorrect),
      response,
      completedAt: new Date().toISOString()
    };
    currentState.course.challengeHistory[lectureId] = lectureHistory;

    if (isCorrect && !(prior && prior.isCorrect)) {
      updateStreak();
      currentState.learner.metrics.challengeCompletions += 1;
      currentState.learner.metrics.challengeByType[challengeTypeId] =
        (currentState.learner.metrics.challengeByType[challengeTypeId] || 0) + 1;

      const streakBonusMultiplier = Math.min(
        currentState.learner.streak.current,
        XP_RULES.maxDailyStreakBonusDays
      );
      const streakBonus = streakBonusMultiplier * XP_RULES.dailyStreakBonusPerDay;
      awardXp((XP_RULES.challengeByType[challengeTypeId] || 0) + streakBonus);

      if (currentState.learner.metrics.challengeCompletions >= 1) {
        unlockBadge('first_steps', { trigger: 'first_challenge' });
      }

      const challengeTypesCompleted = Object.keys(currentState.learner.metrics.challengeByType).filter(
        (key) => currentState.learner.metrics.challengeByType[key] > 0
      );
      if (challengeTypesCompleted.length >= 4) {
        unlockBadge('practice_variety', { trigger: 'challenge_types' });
      }
    }

    persist();
    return getProgressSnapshot();
  };

  const getProgressSnapshot = () => deepClone(currentState);

  const getBadgeDefinitions = () => deepClone(BADGE_DEFINITIONS);

  const api = {
    canonicalChallengeTypes: CANONICAL_CHALLENGE_TYPES,
    levelThresholds: LEVEL_THRESHOLDS,
    xpRules: XP_RULES,
    getBadgeDefinitions,
    getProgressSnapshot,
    markLessonComplete,
    recordChallengeResult,
    saveNotes,
    selectLecture
  };

  if (typeof window !== 'undefined') {
    window.PhysicsCodexGamification = api;
  }
})();
