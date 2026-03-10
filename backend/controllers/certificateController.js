const db = require("../config/db");
const path = require("path");

const downloadCertificate = async (req, res) => {
  try {
    const paperId = req.params.paper_id;

    // FIX: Changed 'WHERE id = ?' to 'WHERE paper_id = ?'
    const [rows] = await db.query(
      "SELECT certificate_path FROM Certificates WHERE paper_id = ?",
      [paperId],
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "Certificate not found" });
    }

    // path is already required at the top of your file
    const filePath = path.join(
      __dirname,
      "../uploads/certificates",
      rows[0].certificate_path, // Ensure this only contains the filename (e.g., 'cert123.pdf')
    );

    res.download(filePath);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

const getMyCertificates = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT cert.*, p.title as paper_title, c.title as conference_title 
       FROM Certificates cert JOIN Papers p ON cert.paper_id = p.id 
       JOIN Conferences c ON p.conference_id = c.id 
       WHERE cert.user_id = ?`,
      [req.user.id],
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = { downloadCertificate, getMyCertificates };
