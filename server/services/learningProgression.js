const READING_LEVELS = ['Beginner', 'Intermediate', 'Advanced'];
const PASSING_SCORE = 80;
const { requiredModuleCount } = require('./readingCurriculum');

function nextReadingLevel(level) {
  const index = READING_LEVELS.indexOf(level);
  return index >= 0 && index < READING_LEVELS.length - 1 ? READING_LEVELS[index + 1] : null;
}

// A level is finished only when every module supplied by the authoritative
// learning-path RPC is complete and the learner has met the passing score.
// Keeping this as a pure function makes the server gate easy to test.
function evaluateLevelPromotion({ effectiveLevel, modules = [], accuracySum = 0, totalAttempts = 0 }) {
  const nextLevel = nextReadingLevel(effectiveLevel);
  const averageScore = totalAttempts > 0 ? Math.round(Number(accuracySum || 0) / Number(totalAttempts)) : 0;
  const allModulesCompleted = modules.length > 0 && modules.every((module) => module.state === 'completed');
  const expectedModuleCount = requiredModuleCount(effectiveLevel);
  const correctModuleCount = expectedModuleCount == null || modules.length === expectedModuleCount;

  return {
    eligible: Boolean(nextLevel && correctModuleCount && allModulesCompleted && averageScore >= PASSING_SCORE),
    nextLevel,
    averageScore,
    allModulesCompleted,
    expectedModuleCount,
    correctModuleCount,
    passingScore: PASSING_SCORE,
  };
}

module.exports = { PASSING_SCORE, READING_LEVELS, nextReadingLevel, evaluateLevelPromotion };
