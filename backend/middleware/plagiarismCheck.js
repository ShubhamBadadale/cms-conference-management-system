const computeSimulationScore = (file) => {
  const seed = `${file.originalname || file.filename}:${file.size || 0}`;
  let hash = 0;

  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) % 101;
  }

  const lowerName = String(file.originalname || file.filename || '').toLowerCase();
  if (lowerName.includes('plag') || lowerName.includes('copy') || lowerName.includes('similar')) {
    return Math.max(hash, 88);
  }

  return hash;
};

const plagiarismCheck = (req, res, next) => {
  if (!req.file) {
    return next();
  }

  const threshold = Number(process.env.PLAGIARISM_FLAG_THRESHOLD || 75);
  const score = computeSimulationScore(req.file);
  const flagged = score >= threshold;

  req.plagiarismCheck = {
    score,
    threshold,
    flagged,
    reason: flagged
      ? `Simulated similarity score ${score}% exceeded the review threshold of ${threshold}%.`
      : `Simulated similarity score ${score}% is below the review threshold of ${threshold}%.`,
  };

  next();
};

module.exports = { plagiarismCheck };
