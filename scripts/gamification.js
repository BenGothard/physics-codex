(() => {
  'use strict';

  const STORAGE_NAMESPACE = 'physics-codex';
  const STORAGE_DOMAIN = 'learner-progress';
  const SCHEMA_VERSION = 1;
  const ACTIVE_STORAGE_KEY = `${STORAGE_NAMESPACE}:${STORAGE_DOMAIN}:v${SCHEMA_VERSION}`;

  const XP_RULES = Object.freeze({
    challengeByType: Object.freeze({
      multiple_choice: 15,
      concept_match: 20,
      derivation_steps: 35,
      estimation_puzzle: 30
    }),
    questCompletion: 45,
    dailyStreakBonusPerDay: 5,
    maxDailyStreakBonusDays: 7,
    badgeUnlock: 25
  });

  const LEVEL_THRESHOLDS = Object.freeze([
    { level: 1, minXp: 0, title: 'Apprentice Observer' },
    { level: 2, minXp: 100, title: 'Vector Navigator' },
    { level: 3, minXp: 240, title: 'Kinematics Analyst' },
    { level: 4, minXp: 420, title: 'Dynamics Strategist' },
    { level: 5, minXp: 650, title: 'Physics Pathfinder' },
    { level: 6, minXp: 950, title: 'Codex Luminary' }
  ]);

  const CANONICAL_CHALLENGE_TYPES = Object.freeze({
    multiple_choice: Object.freeze({
      id: 'multiple_choice',
      label: 'Multiple Choice',
      description: 'Select the best answer from candidate options tied to the core concept.',
      lectureConcepts: Object.freeze([
        'Position and displacement',
        'Average vs instantaneous velocity'
      ])
    }),
    concept_match: Object.freeze({
      id: 'concept_match',
      label: 'Concept Match',
      description: 'Match terms, graphs, and units to the correct conceptual interpretation.',
      lectureConcepts: Object.freeze([
        'Position and displacement',
        'Constant acceleration kinematics'
      ])
    }),
    derivation_steps: Object.freeze({
      id: 'derivation_steps',
      label: 'Derivation Steps',
      description: 'Order and justify each algebraic/physical step used to derive an equation.',
      lectureConcepts: Object.freeze([
        'Constant acceleration kinematics'
      ])
    }),
    estimation_puzzle: Object.freeze({
      id: 'estimation_puzzle',
      label: 'Estimation Puzzle',
      description: 'Estimate a physical quantity with assumptions and unit-consistent reasoning.',
      lectureConcepts: Object.freeze([
        'Average vs instantaneous velocity',
        'Position and displacement'
      ])
    })
  });

  const BADGE_DEFINITIONS = Object.freeze({
    first_steps: Object.freeze({
      id: 'first_steps',
      title: 'First Steps',
      criteria: 'Complete your first challenge.'
    }),
    consistency_builder: Object.freeze({
      id: 'consistency_builder',
      title: 'Consistency Builder',
      criteria: 'Maintain a 3-day streak.'
    }),
    kinematics_specialist: Object.freeze({
      id: 'kinematics_specialist',
      title: 'Kinematics Specialist',
      criteria: 'Complete three motion-focused quests.'
    }),
    derivation_pro: Object.freeze({
      id: 'derivation_pro',
      title: 'Derivation Pro',
      criteria: 'Finish five derivation-step challenges.'
    })
  });

  const QUEST_DEFINITIONS = Object.freeze({
    'quest-motion-basics': Object.freeze({
      id: 'quest-motion-basics',
      title: 'Motion Basics',
      lectureRef: 'v01-c01-s01',
      requiredChallengeTypes: Object.freeze(['multiple_choice', 'concept_match'])
    }),
    'quest-kinematics-proofs': Object.freeze({
      id: 'quest-kinematics-proofs',
      title: 'Kinematics Proof Sprint',
      lectureRef: 'v01-c01-s01',
      requiredChallengeTypes: Object.freeze(['derivation_steps'])
    }),
    'quest-reasonable-estimates': Object.freeze({
      id: 'quest-reasonable-estimates',
      title: 'Reasonable Physics Estimates',
      lectureRef: 'v01-c01-s01',
      requiredChallengeTypes: Object.freeze(['estimation_puzzle'])
    })
  });

  const isBrowserStorageAvailable = () => typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

  const toIsoDate = (date = new Date()) => date.toISOString().slice(0, 10);

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

  const createDefaultState = () => ({
    schemaVersion: SCHEMA_VERSION,
    xp: 0,
    level: 1,
    levelTitle: LEVEL_THRESHOLDS[0].title,
    streak: {
      current: 0,
      longest: 0,
      lastActiveDate: null
    },
    badges: [],
    quests: {},
    metrics: {
      challengeCompletions: 0,
      challengeByType: {},
      motionQuestsCompleted: 0
    },
    updatedAt: new Date().toISOString()
  });

  const saveState = (state) => {
    if (!isBrowserStorageAvailable()) return;
    window.localStorage.setItem(ACTIVE_STORAGE_KEY, JSON.stringify(state));
  };

  const migrateState = (state) => {
    if (!state || typeof state !== 'object') {
      return createDefaultState();
    }

    if (state.schemaVersion === SCHEMA_VERSION) {
      return { ...createDefaultState(), ...state };
    }

    // Migration guard: only migrate forward from known historical versions.
    if (!Number.isInteger(state.schemaVersion) || state.schemaVersion < 1 || state.schemaVersion > SCHEMA_VERSION) {
      return createDefaultState();
    }

    // Reserved for future schema changes.
    return { ...createDefaultState(), ...state, schemaVersion: SCHEMA_VERSION };
  };

  const loadState = () => {
    if (!isBrowserStorageAvailable()) {
      return createDefaultState();
    }

    const raw = window.localStorage.getItem(ACTIVE_STORAGE_KEY);
    if (!raw) {
      return createDefaultState();
    }

    try {
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
    const level = getLevelForXp(currentState.xp);
    currentState.level = level.level;
    currentState.levelTitle = level.title;
  };

  const updateStreak = (activityDate = new Date()) => {
    const today = toIsoDate(activityDate);
    const priorDate = currentState.streak.lastActiveDate;
    if (priorDate === today) {
      return currentState.streak;
    }

    if (!priorDate) {
      currentState.streak.current = 1;
    } else {
      const msDelta = activityDate.getTime() - new Date(priorDate).getTime();
      const dayDelta = Math.round(msDelta / 86400000);
      currentState.streak.current = dayDelta === 1 ? currentState.streak.current + 1 : 1;
    }

    currentState.streak.lastActiveDate = today;
    currentState.streak.longest = Math.max(currentState.streak.longest, currentState.streak.current);

    if (currentState.streak.current >= 3) {
      unlockBadge('consistency_builder', { reason: '3-day streak reached' });
    }

    return currentState.streak;
  };

  const awardXp = (amount, metadata = {}) => {
    const normalizedAmount = Number.isFinite(amount) ? Math.max(0, Math.floor(amount)) : 0;
    if (normalizedAmount <= 0) return getProgressSnapshot();

    currentState.xp += normalizedAmount;
    refreshLevel();

    if (metadata.source === 'badge_unlock') {
      // No-op bookkeeping hook for analytics compatibility.
    }

    persist();
    return getProgressSnapshot();
  };

  const unlockBadge = (badgeId, metadata = {}) => {
    if (!BADGE_DEFINITIONS[badgeId]) {
      return getProgressSnapshot();
    }

    const alreadyUnlocked = currentState.badges.some((badge) => badge.id === badgeId);
    if (alreadyUnlocked) {
      return getProgressSnapshot();
    }

    currentState.badges.push({
      id: badgeId,
      unlockedAt: new Date().toISOString(),
      metadata
    });

    awardXp(XP_RULES.badgeUnlock, { source: 'badge_unlock', badgeId });
    persist();
    return getProgressSnapshot();
  };

  const recordChallengeCompletion = (challengeTypeId, activityDate = new Date()) => {
    const typeDef = CANONICAL_CHALLENGE_TYPES[challengeTypeId];
    if (!typeDef) return getProgressSnapshot();

    updateStreak(activityDate);

    const byType = currentState.metrics.challengeByType;
    byType[challengeTypeId] = (byType[challengeTypeId] || 0) + 1;
    currentState.metrics.challengeCompletions += 1;

    const streakBonusMultiplier = Math.min(currentState.streak.current, XP_RULES.maxDailyStreakBonusDays);
    const streakBonus = streakBonusMultiplier * XP_RULES.dailyStreakBonusPerDay;

    const baseXp = XP_RULES.challengeByType[challengeTypeId] || 0;
    awardXp(baseXp + streakBonus, { source: 'challenge_completion', challengeTypeId });

    if (currentState.metrics.challengeCompletions >= 1) {
      unlockBadge('first_steps', { trigger: 'first_challenge' });
    }

    if ((byType.derivation_steps || 0) >= 5) {
      unlockBadge('derivation_pro', { trigger: 'derivation_steps_count', count: byType.derivation_steps });
    }

    persist();
    return getProgressSnapshot();
  };

  const completeQuest = (questId, metadata = {}) => {
    const questDef = QUEST_DEFINITIONS[questId];
    if (!questDef) return getProgressSnapshot();

    const existing = currentState.quests[questId];
    if (existing && existing.completedAt) {
      return getProgressSnapshot();
    }

    currentState.quests[questId] = {
      ...questDef,
      completedAt: new Date().toISOString(),
      metadata
    };

    if (questDef.lectureRef === 'v01-c01-s01') {
      currentState.metrics.motionQuestsCompleted += 1;
      if (currentState.metrics.motionQuestsCompleted >= 3) {
        unlockBadge('kinematics_specialist', { trigger: 'motion_quest_milestone' });
      }
    }

    awardXp(XP_RULES.questCompletion, { source: 'quest_completion', questId });
    persist();
    return getProgressSnapshot();
  };

  const getProgressSnapshot = () => ({
    schemaVersion: currentState.schemaVersion,
    storageKey: ACTIVE_STORAGE_KEY,
    xpRules: XP_RULES,
    levelThresholds: LEVEL_THRESHOLDS,
    canonicalChallengeTypes: CANONICAL_CHALLENGE_TYPES,
    badgeDefinitions: BADGE_DEFINITIONS,
    questDefinitions: QUEST_DEFINITIONS,
    learner: {
      xp: currentState.xp,
      level: currentState.level,
      levelTitle: currentState.levelTitle,
      streak: { ...currentState.streak },
      badges: [...currentState.badges],
      quests: { ...currentState.quests },
      metrics: {
        challengeCompletions: currentState.metrics.challengeCompletions,
        challengeByType: { ...currentState.metrics.challengeByType },
        motionQuestsCompleted: currentState.metrics.motionQuestsCompleted
      },
      updatedAt: currentState.updatedAt
    }
  });

  const api = {
    awardXp,
    unlockBadge,
    completeQuest,
    getProgressSnapshot,
    updateStreak,
    recordChallengeCompletion
  };

  if (typeof window !== 'undefined') {
    window.PhysicsCodexGamification = api;
  }
})();
