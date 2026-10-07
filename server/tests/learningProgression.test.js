const test = require('node:test');
const assert = require('node:assert/strict');
const { evaluateLevelPromotion, PASSING_SCORE } = require('../services/learningProgression');

test('reading difficulty advances only after every current-level module is complete at the passing score', () => {
  const modules = Array.from({ length: 10 }, () => ({ state: 'completed' }));

  assert.deepEqual(
    evaluateLevelPromotion({ effectiveLevel: 'Beginner', modules, accuracySum: PASSING_SCORE * 4, totalAttempts: 4 }),
    { eligible: true, nextLevel: 'Intermediate', averageScore: PASSING_SCORE, allModulesCompleted: true, expectedModuleCount: null, correctModuleCount: true, passingScore: PASSING_SCORE },
  );
  assert.equal(evaluateLevelPromotion({ effectiveLevel: 'Beginner', modules: [{ state: 'completed' }, { state: 'unlocked' }], accuracySum: 1000, totalAttempts: 10 }).eligible, false);
  assert.equal(evaluateLevelPromotion({ effectiveLevel: 'Intermediate', modules, accuracySum: (PASSING_SCORE - 1) * 4, totalAttempts: 4 }).eligible, false);
  assert.equal(evaluateLevelPromotion({ effectiveLevel: 'Intermediate', modules: modules.slice(0, 9), accuracySum: 1000, totalAttempts: 10 }).eligible, false);
  assert.equal(evaluateLevelPromotion({ effectiveLevel: 'Advanced', modules, accuracySum: 1000, totalAttempts: 10 }).eligible, false);
});
