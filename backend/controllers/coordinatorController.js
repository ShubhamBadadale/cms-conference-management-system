const db = require('../config/db');

const getPresentationSchedule = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT p.id, p.title, u.name as author_name, u.institution, c.title as conference_title,
       ps.presentation_quality, ps.communication, ps.content_clarity, ps.audience_engagement, ps.total_score
       FROM Papers p JOIN Users u ON p.author_id = u.id 
       JOIN Conferences c ON p.conference_id = c.id
       LEFT JOIN PresentationScores ps ON p.id = ps.paper_id AND ps.coordinator_id = ?
       WHERE p.status = 'accepted' ORDER BY c.id, p.id`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const scorePresentation = async (req, res) => {
  try {
    const { paper_id, presentation_quality, communication, content_clarity, audience_engagement } = req.body;
    const total = (Number(presentation_quality) + Number(communication) + Number(content_clarity) + Number(audience_engagement)) / 4;
    const [existing] = await db.query(
      'SELECT id FROM PresentationScores WHERE paper_id = ? AND coordinator_id = ?',
      [paper_id, req.user.id]
    );
    if (existing.length > 0) {
      await db.query(
        `UPDATE PresentationScores SET presentation_quality=?, communication=?, content_clarity=?, 
         audience_engagement=?, total_score=? WHERE paper_id=? AND coordinator_id=?`,
        [presentation_quality, communication, content_clarity, audience_engagement, total, paper_id, req.user.id]
      );
    } else {
      await db.query(
        `INSERT INTO PresentationScores (paper_id, coordinator_id, presentation_quality, communication, content_clarity, audience_engagement, total_score) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [paper_id, req.user.id, presentation_quality, communication, content_clarity, audience_engagement, total]
      );
    }
    res.json({ message: 'Presentation scored successfully', total_score: total });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

module.exports = { getPresentationSchedule, scorePresentation };
