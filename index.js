const express = require("express");
const mysql = require("mysql");
const bodyParser = require("body-parser");
const cors = require("cors");
const { Builder } = require("xml2js");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");

//mendefinisikan koneksi ke database mysql
const connection = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "db_aplikasi_manajemen_tugas",
});

//membuat koneksi ke database mysql
connection.connect((error) => {
  if (error) throw error;
  console.log("terhubung ke database MySQL");
});

const app = express();
const port = 3004; // port yang digunakan oleh server

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors());

//membuat endpoint Read /users
app.get("/users", (req, res) => {
  connection.query("SELECT * FROM users", (error, results) => {
    if (error) throw error;
    //mengkonversi model data menjadi  xml
    const builder = new Builder();
    const xmlResults = builder.buildObject({ users: { user: results } });

    res.set("Content-Type", "text/xml");
    res.send(xmlResults);
    console.log("Get :/users");
  });
});

app.post("/users", async (req, res) => {
  const { user_id, username, email, password } = req.body;
  console.log(user_id);

  try {
    // Hash password sebelum disimpan
    const hashedPassword = await bcrypt.hash(password, 8);

    // Query untuk menyimpan data pengguna ke dalam tabel "users"

    connection.query(
      "INSERT INTO users (user_id, username, email, password) VALUES (?, ?, ?, ?)",
      [user_id, username, email, hashedPassword],
      (err, result) => {
        if (err) {
          console.error("Error creating user:", err);
          console.log(user_id);
          res.status(500).send("Failed to create user");
          return;
        }
        console.log(user_id);
        console.log("User created successfully");
        res.status(201).send("User created successfully");
      }
    );
  } catch (err) {
    console.error("Hashing Error:", err);
    res.status(500).send("Failed to create user");
  }
});

// Endpoint untuk proses login
app.post("/login", (req, res) => {
  const { email, password } = req.body;

  // Query untuk mencari pengguna berdasarkan email
  const query = "SELECT * FROM users WHERE email = ?";
  connection.query(query, [email], async (err, results) => {
    if (err) {
      console.error("Error finding user:", err);
      res.status(500).send("Internal server error");
      return;
    }

    if (results.length === 0) {
      res.status(401).send("1. Email or password is incorrect");
      return;
    }

    const user = results[0];

    // Bandingkan password yang di-hash dengan input dari pengguna
    bcrypt.compare(password, user.password, (err, result) => {
      if (err || !result) {
        res.status(401).send("Email or password is incorrect");
        return;
      }

      // Jika kredensial cocok, buat token JWT
      const token = jwt.sign(
        { userId: user.user_id, email: user.email },
        "secret_key",
        { expiresIn: "1h" }
      );

      // Kirim token sebagai respons
      res.status(200).json({ token });
    });
  });
});

const blacklist = []; // Simpan token yang sudah logout di sini

// Endpoint untuk logout
app.post("/logout", (req, res) => {
  const token = req.headers.authorization; // Ambil token dari header Authorization

  // Tambahkan token ke dalam blacklist
  blacklist.push(token);

  res.status(200).send("Logged out successfully");
});

//endpoint untuk READ task-list
app.get("/task-list", (req, res) => {
  connection.query("SELECT * FROM tasklist", (error, results) => {
    if (error) throw error;
    //mengkonversi model data menjadi  xml
    const builder = new Builder();
    const xmlResults = builder.buildObject({ Task: { taskList: results } });

    res.set("Content-Type", "text/xml");
    res.send(xmlResults);
    console.log("Get :/task-list");
  });
});

app.post("/task-list", (req, res) => {
  const { list_id, user_id, nama_daftar_tugas } = req.body;

  //query untuk mysql
  connection.query(
    "INSERT INTO tasklist (list_id, user_id, nama_daftar_tugas) VALUES (?, ?, ?)",
    [list_id, user_id, nama_daftar_tugas],
    (error, results) => {
      if (error) throw error;

      res.status(200).send("Success post task-list ...");
      console.log("Post :/task-list");
    }
  );
});

//endpoint untuk READ task-list
app.get("/task-list/:list_id/tasks", (req, res) => {
  const list_id = req.params.list_id;

  connection.query(
    "SELECT u.username, l.nama_daftar_tugas, d.judul_tugas, d.deskripsi_tugas, d.deadline, d.status_penyelesaian FROM users u join tasklist l on u.user_id = l.user_id JOIN taskdetails d ON l.list_id = d.list_id WHERE l.list_id = ?",
    [list_id],
    (error, results) => {
      if (error) throw error;

      //mengkonversi model data menjadi  xml
      const builder = new Builder();
      const xmlResults = builder.buildObject({
        Task: { taskDetails: results },
      });

      res.set("Content-Type", "text/xml");
      res.send(xmlResults);
      console.log("Get :/task-list");
    }
  );
});
//endpoint untuk post /task-list/:list-id/tasks/:detail_id
app.post("/task-list/:list_id/tasks", (req, res) => {
  const list_id = req.params.list_id;
  const {
    detail_id,
    judul_tugas,
    deksripsi_tugas,
    deadline,
    status_penyelesaian,
  } = req.body;

  //memasukkan script untuk menginput data input ke database mysql
  connection.query(
    "INSERT INTO taskdetails(`detail_id`, `list_id`, `judul_tugas`, `deskripsi_tugas`, `deadline`, `status_penyelesaian`) VALUES (?, ?, ?, ?, ?, ?)",
    [
      detail_id,
      list_id,
      judul_tugas,
      deksripsi_tugas,
      deadline,
      status_penyelesaian,
    ],
    (error, results) => {
      if (error) throw error;

      //respon server ketika sukses
      res.status(200).send("Success post task-list/detail_list ...");
      console.log(`Post :/task-list/${list_id}/tasks`);
    }
  );
});

app.put("/task-list/:list_id/tasks/:detail_id", (req, res) => {
  const list_id = req.params.list_id;
  const detail_id = req.params.detail_id;
  const { judul_tugas, deksripsi_tugas, deadline, status_penyelesaian } =
    req.body;

  connection.query(
    "UPDATE `taskdetails` SET `judul_tugas`=?, `deskripsi_tugas`=?, `deadline`=?, `status_penyelesaian`=? WHERE `detail_id` = ? AND `list_id` = ?;",
    [
      judul_tugas,
      deksripsi_tugas,
      deadline,
      status_penyelesaian,
      detail_id,
      list_id,
    ],
    (error, results) => {
      if (error) {
        console.error("Error:", error);
        res.status(500).send("Error while updating task");
      } else {
        // Response server ketika sukses
        res
          .status(200)
          .send(`Success PUT /task-list/${list_id}/tasks/${detail_id}`);
        console.log(`PUT /task-list/${list_id}/tasks/${detail_id}`);
      }
    }
  );
});

//endpoint DELETE /task-list untuk menghapus detail-list
app.delete("/task-list/:list_id/tasks/:detail_id", (req, res) => {
  const list_id = req.params.list_id;
  const detail_id = req.params.detail_id;

  //query mysql untuk menghapus detail-list
  connection.query(
    "DELETE FROM `taskdetails` WHERE `detail_id` = ? AND `list_id` = ?;",
    [detail_id, list_id],
    (error, results) => {
      if (error) throw error;

      res
        .status(200)
        .send(`Success DELETE /task-list/${list_id}/tasks/${detail_id}`);
      console.log(`DELETE /task-list/${list_id}/tasks/${detail_id}`);
    }
  );
});


app.listen(port, () => {
  console.log(`Server berjalan di http://localhost:${port}`);
});
