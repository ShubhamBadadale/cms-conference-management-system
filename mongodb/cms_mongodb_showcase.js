// ConferMS MongoDB Showcase
// Run in mongosh:
//   mongosh mongodb/cms_mongodb_showcase.js
//
// MapReduce is included for syllabus coverage. Aggregation is also shown because
// it is the practical production-style alternative in modern MongoDB projects.

db = db.getSiblingDB("cms_nosql_showcase");

db.conferences.drop();
db.paperEvents.drop();
db.mr_paper_counts.drop();

// Experiment 9: insert/save-style document creation.
db.conferences.insertMany([
  {
    conferenceId: 1,
    title: "International Conference on Data Systems",
    status: "published",
    venue: { city: "Mumbai", country: "India", rooms: ["Hall A", "Lab 2"] },
    topics: ["DBMS", "Big Data", "Distributed Systems"],
    submissionDeadline: ISODate("2026-05-30T23:59:59Z"),
    tracks: [
      {
        name: "Database Engineering",
        sessions: [
          { title: "Indexing and Query Processing", startsAt: ISODate("2026-07-10T09:00:00Z") },
          { title: "Transactions and Recovery", startsAt: ISODate("2026-07-10T11:00:00Z") }
        ]
      }
    ]
  },
  {
    conferenceId: 2,
    title: "Cloud and NoSQL Symposium",
    status: "draft",
    venue: { city: "Pune", country: "India", rooms: ["Auditorium"] },
    topics: ["NoSQL", "Cloud SQL", "CAP Theorem"],
    submissionDeadline: ISODate("2026-08-15T23:59:59Z"),
    tracks: []
  }
]);

db.paperEvents.insertMany([
  {
    paperId: 101,
    conferenceId: 1,
    title: "Cost Based Optimization for Review Assignment",
    author: { userId: 7, name: "Aarav Shah", institution: "MIT-WPU" },
    keywords: ["query optimization", "indexes", "review assignment"],
    status: "accepted",
    scores: { originality: 9, technical: 8, clarity: 8, relevance: 9 },
    submittedAt: ISODate("2026-03-05T10:20:00Z"),
    versions: [
      { version: 1, file: "paper-101-v1.pdf", uploadedAt: ISODate("2026-03-05T10:20:00Z") },
      { version: 2, file: "paper-101-v2.pdf", uploadedAt: ISODate("2026-03-21T12:10:00Z") }
    ]
  },
  {
    paperId: 102,
    conferenceId: 1,
    title: "MongoDB MapReduce for Conference Analytics",
    author: { userId: 8, name: "Diya Patil", institution: "VIT Pune" },
    keywords: ["mongodb", "mapreduce", "analytics"],
    status: "under_review",
    scores: { originality: 7, technical: 7, clarity: 6, relevance: 8 },
    submittedAt: ISODate("2026-03-08T14:00:00Z"),
    versions: [
      { version: 1, file: "paper-102-v1.pdf", uploadedAt: ISODate("2026-03-08T14:00:00Z") }
    ]
  },
  {
    paperId: 103,
    conferenceId: 2,
    title: "CAP-Aware Data Placement for Academic Conferences",
    author: { userId: 9, name: "Kabir Rao", institution: "COEP" },
    keywords: ["cap theorem", "distributed database", "availability"],
    status: "submitted",
    scores: null,
    submittedAt: ISODate("2026-04-02T09:30:00Z"),
    versions: [
      { version: 1, file: "paper-103-v1.pdf", uploadedAt: ISODate("2026-04-02T09:30:00Z") }
    ]
  }
]);

// find and findOne.
print("Published conferences");
printjson(db.conferences.find({ status: "published" }).toArray());

print("One accepted paper");
printjson(db.paperEvents.findOne({ status: "accepted" }));

// Query criteria: $and, $or, $in, comparison operators, regex.
print("Papers matching compound criteria");
printjson(
  db.paperEvents.find({
    $and: [
      { conferenceId: { $in: [1, 2] } },
      { status: { $ne: "rejected" } },
      {
        $or: [
          { title: /analytics/i },
          { keywords: "query optimization" }
        ]
      }
    ]
  }).toArray()
);

// Type-specific queries: dates, arrays, embedded objects, null.
print("Papers submitted after 2026-03-07");
printjson(db.paperEvents.find({ submittedAt: { $gt: ISODate("2026-03-07T00:00:00Z") } }).toArray());

print("Conferences whose topics array contains NoSQL");
printjson(db.conferences.find({ topics: "NoSQL" }).toArray());

print("Papers from a nested author institution");
printjson(db.paperEvents.find({ "author.institution": "MIT-WPU" }).toArray());

print("Papers without scores yet");
printjson(db.paperEvents.find({ scores: null }).toArray());

// Update documents.
db.paperEvents.updateOne(
  { paperId: 103 },
  {
    $set: { status: "under_review" },
    $push: { keywords: "replication" }
  }
);

db.conferences.updateOne(
  { conferenceId: 2 },
  { $set: { status: "published" } }
);

// Remove document.
db.paperEvents.deleteOne({ paperId: 999 });

// Aggregation pipeline: OLAP-style grouped counts.
print("Aggregation: paper counts by conference and status");
printjson(
  db.paperEvents.aggregate([
    {
      $group: {
        _id: { conferenceId: "$conferenceId", status: "$status" },
        paperCount: { $sum: 1 },
        avgOriginality: { $avg: "$scores.originality" }
      }
    },
    { $sort: { "_id.conferenceId": 1, "_id.status": 1 } }
  ]).toArray()
);

// MapReduce: count papers per conference.
var mapPaperToConference = function () {
  emit(this.conferenceId, 1);
};

var reducePaperCounts = function (conferenceId, counts) {
  return Array.sum(counts);
};

print("MapReduce: paper counts by conference");
try {
  printjson(
    db.runCommand({
      mapReduce: "paperEvents",
      map: mapPaperToConference,
      reduce: reducePaperCounts,
      out: "mr_paper_counts"
    })
  );
  printjson(db.mr_paper_counts.find().toArray());
} catch (e) {
  print("MapReduce command is unavailable in this MongoDB version. Use the aggregation output above.");
  print(e.message);
}

