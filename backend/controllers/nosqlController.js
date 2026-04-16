const mysqlDb = require('../config/db');
const { getMongoDb } = require('../config/mongo');

const toNumber = (value, fallback = 0) => {
  if (value === null || value === undefined) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const buildAnalyticsDocument = (row) => ({
  conferenceId: row.conference_id,
  title: row.conference_title,
  metrics: {
    totalPapers: toNumber(row.total_papers),
    acceptedPapers: toNumber(row.accepted_papers),
    rejectedPapers: toNumber(row.rejected_papers),
    revisionPapers: toNumber(row.revision_papers),
    underReviewPapers: toNumber(row.under_review_papers),
    activeReviewers: toNumber(row.active_reviewers),
    averageReviewScore: row.avg_review_score === null ? null : toNumber(row.avg_review_score, null),
    averagePresentationScore: row.avg_presentation_score === null ? null : toNumber(row.avg_presentation_score, null),
  },
  source: 'vw_conference_metrics_olap',
  refreshedAt: new Date(),
});

const getNoSqlAnalytics = async (req, res) => {
  try {
    const [rows] = await mysqlDb.query(
      `SELECT *
       FROM vw_conference_metrics_olap
       ORDER BY total_papers DESC, conference_title ASC`
    );

    const documents = rows.map(buildAnalyticsDocument);

    try {
      const mongoDb = await getMongoDb();
      const collection = mongoDb.collection('conferenceAnalytics');

      if (documents.length > 0) {
        await collection.bulkWrite(
          documents.map((doc) => ({
            updateOne: {
              filter: { conferenceId: doc.conferenceId },
              update: { $set: doc },
              upsert: true,
            },
          }))
        );
      }

      const analytics = await collection
        .find({}, { projection: { _id: 0 } })
        .sort({ 'metrics.totalPapers': -1, title: 1 })
        .toArray();

      res.json({
        connected: true,
        source: 'mongodb',
        collection: 'conferenceAnalytics',
        generatedFrom: 'vw_conference_metrics_olap',
        items: analytics,
      });
    } catch (mongoErr) {
      res.json({
        connected: false,
        source: 'mysql-fallback',
        collection: 'conferenceAnalytics',
        generatedFrom: 'vw_conference_metrics_olap',
        message: 'MongoDB is not running, so showing analytics directly from MySQL.',
        error: mongoErr.message,
        items: documents,
      });
    }
  } catch (err) {
    res.status(500).json({ message: 'Unable to build NoSQL analytics', error: err.message });
  }
};

module.exports = { getNoSqlAnalytics };
