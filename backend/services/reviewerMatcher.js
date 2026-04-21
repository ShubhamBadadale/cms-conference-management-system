const { normalizeKeywords } = require('./paperVersionService');

const expertiseWeightMap = {
  basic: 1,
  intermediate: 2,
  expert: 3,
};

const getTopReviewerSuggestions = async (dbOrConnection, paperId, limit = 3) => {
  const [papers] = await dbOrConnection.query(
    `SELECT p.id, p.title, p.keywords, p.is_active, c.id AS conference_id, c.is_active AS conference_active
     FROM Papers p
     JOIN Conferences c ON c.id = p.conference_id
     WHERE p.id = ?`,
    [paperId]
  );

  if (papers.length === 0) {
    throw new Error('Paper not found');
  }

  const paper = papers[0];
  if (!paper.is_active || !paper.conference_active) {
    throw new Error('Paper is inactive');
  }

  const [paperKeywordRows] = await dbOrConnection.query(
    'SELECT keyword FROM PaperKeywords WHERE paper_id = ?',
    [paperId]
  );

  const paperKeywords = paperKeywordRows.length > 0
    ? paperKeywordRows.map((row) => row.keyword)
    : normalizeKeywords(paper.keywords);

  const [reviewers] = await dbOrConnection.query(
    `SELECT
      u.id,
      u.name,
      u.email,
      u.institution,
      COUNT(DISTINCT CASE WHEN ap.is_active = TRUE THEN ra.paper_id END) AS assigned_count,
      COUNT(DISTINCT r.paper_id) AS completed_count
     FROM Users u
     LEFT JOIN ReviewerAssignments ra ON ra.reviewer_id = u.id
     LEFT JOIN Papers ap ON ap.id = ra.paper_id
     LEFT JOIN Reviews r ON r.reviewer_id = u.id
     WHERE u.role = 'reviewer'
       AND u.is_active = TRUE
       AND NOT EXISTS (
         SELECT 1
         FROM ReviewerAssignments existing
         WHERE existing.paper_id = ? AND existing.reviewer_id = u.id
       )
     GROUP BY u.id, u.name, u.email, u.institution`,
    [paperId]
  );

  if (reviewers.length === 0) {
    return [];
  }

  const reviewerIds = reviewers.map((reviewer) => reviewer.id);
  const [expertiseRows] = await dbOrConnection.query(
    `SELECT reviewer_id, keyword, expertise_level
     FROM ReviewerExpertise
     WHERE reviewer_id IN (?)`,
    [reviewerIds]
  );

  const expertiseByReviewer = expertiseRows.reduce((accumulator, row) => {
    const reviewerEntries = accumulator.get(row.reviewer_id) || [];
    reviewerEntries.push({
      keyword: row.keyword,
      expertiseLevel: row.expertise_level,
      weight: expertiseWeightMap[row.expertise_level] || expertiseWeightMap.basic,
    });
    accumulator.set(row.reviewer_id, reviewerEntries);
    return accumulator;
  }, new Map());

  return reviewers
    .map((reviewer) => {
      const expertiseEntries = expertiseByReviewer.get(reviewer.id) || [];
      const matchedKeywords = expertiseEntries.filter((entry) => paperKeywords.includes(entry.keyword));
      const expertiseWeight = matchedKeywords.reduce((sum, entry) => sum + entry.weight, 0);
      const overlapCount = matchedKeywords.length;
      const pendingCount = Math.max(Number(reviewer.assigned_count || 0) - Number(reviewer.completed_count || 0), 0);
      const score = overlapCount * 20 + expertiseWeight * 10 - pendingCount * 3 - Number(reviewer.assigned_count || 0);

      return {
        reviewer_id: reviewer.id,
        reviewer_name: reviewer.name,
        reviewer_email: reviewer.email,
        institution: reviewer.institution,
        assigned_count: Number(reviewer.assigned_count || 0),
        completed_count: Number(reviewer.completed_count || 0),
        pending_count: pendingCount,
        overlap_count: overlapCount,
        expertise_weight: expertiseWeight,
        matched_keywords: matchedKeywords.map((entry) => ({
          keyword: entry.keyword,
          expertise_level: entry.expertiseLevel,
        })),
        match_score: score,
      };
    })
    .sort((left, right) => (
      right.match_score - left.match_score ||
      left.pending_count - right.pending_count ||
      left.assigned_count - right.assigned_count ||
      left.reviewer_name.localeCompare(right.reviewer_name)
    ))
    .slice(0, limit);
};

module.exports = { getTopReviewerSuggestions };
