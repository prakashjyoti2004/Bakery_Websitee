const express = require("express");
const mysql = require("mysql2");
const multer = require("multer");
const path = require("path");
const cors = require("cors");
const SSE = require("express-sse");

const app = express();
const sse = new SSE();

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static("uploads")); // serve images
app.use(express.static("public")); // owner.html & index.html

// MySQL connection
const db = mysql.createConnection({
  host: "localhost",
  user: "root",     // your MySQL username
  password: "Jyoti@11289",     // your MySQL password
  database: "bakery",
});

db.connect(err => {
  if (err) throw err;
  console.log("MySQL connected");
});

// Multer storage setup
const storage = multer.diskStorage({
  destination: "./uploads/",
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage });

// API: Add item
app.post("/addItem", upload.single("photo"), (req, res) => {
  const { name, description } = req.body;
  if (!req.file) return res.status(400).json({ success: false, message: 'No file' });

  const imageURL = `http://localhost:5000/uploads/${req.file.filename}`;

  const sql = "INSERT INTO items (name, description, imageURL) VALUES (?, ?, ?)";
  db.query(sql, [name, description, imageURL], (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: 'DB insert error' });
    }

    // Send live update to all customers
    sse.send("update");

    res.json({ success: true, message: "Item added successfully" });
  });
});

// API: Get all items
app.get("/items", (req, res) => {
  db.query("SELECT * FROM items ORDER BY id DESC", (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json([]);
    }
    res.json(results);
  });
});

// API: Delete item
app.delete("/delete/:id", (req, res) => {
  const id = req.params.id;

  db.query("DELETE FROM items WHERE id = ?", [id], err => {
    if (err) {
      console.error(err);
      return res.status(500).json({ success: false });
    }

    // send live update
    sse.send("update");

    res.json({ success: true });
  });
});

// SSE endpoint for live updates
app.get("/live-updates", (req, res) => {
  sse.init(req, res);
});

// Start server
app.listen(5000, () => console.log("Server running on http://localhost:5000"));
