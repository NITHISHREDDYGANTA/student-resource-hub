const express = require("express");
const multer = require("multer");
const session = require("express-session");
const bcrypt = require("bcryptjs");
const fs = require("fs");

const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(session({
    secret: "secret",
    resave: false,
    saveUninitialized: true
}));

// File Upload
const storage = multer.diskStorage({
    destination: "/tmp",
    filename: (req, file, cb) => {
        cb(null, Date.now() + file.originalname);
    }
});
const upload = multer({ storage });


// Routes
app.get("/", (req, res) => {
    res.sendFile(__dirname + "/views/index.html");
});

app.get("/login", (req, res) => {
    res.sendFile(__dirname + "/views/login.html");
});

app.get("/register", (req, res) => {
    res.sendFile(__dirname + "/views/register.html");
});


// Register
app.post("/register", async (req, res) => {

    let users = [];

    if (fs.existsSync("users.json")) {
        users = JSON.parse(fs.readFileSync("users.json"));
    }

    const hash = await bcrypt.hash(req.body.password, 10);

    users.push({
        name: req.body.name,
        email: req.body.email,
        password: hash
    });

    fs.writeFileSync("users.json", JSON.stringify(users));

    res.redirect("/login");
});


// Login
app.post("/login", async (req, res) => {

    let users = [];

    if (fs.existsSync("users.json")) {
        users = JSON.parse(fs.readFileSync("users.json"));
    }

    const user = users.find(u => u.email === req.body.email);

    if (user && await bcrypt.compare(req.body.password, user.password)) {
        req.session.user = user;
        res.redirect("/dashboard");
    } else {
        res.send("Invalid login");
    }
});


// Dashboard
app.get("/dashboard", (req, res) => {

    let resources = [];

    if (fs.existsSync("resources.json")) {
        resources = JSON.parse(fs.readFileSync("resources.json"));
    }

    let cards = "";

    resources.forEach(r => {
        cards += `
        <div class="col-md-4 mb-4">
            <div class="card shadow h-100">
                <div class="card-body">
                    <h5>${r.title}</h5>
                    <p>${r.subject}</p>
                    <a href="/download/${r.file}" class="btn btn-primary">Download</a>
                </div>
            </div>
        </div>
        `;
    });

    res.send(`
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">

    <div class="container mt-4">

    <h3>Dashboard</h3>

    <a href="/upload" class="btn btn-warning">Upload</a>
    <a href="/logout" class="btn btn-danger">Logout</a>

    <div class="row mt-3">
    ${cards}
    </div>

    </div>
    `);
});


// Upload Page
app.get("/upload", (req, res) => {
    res.sendFile(__dirname + "/views/upload.html");
});


// Upload
app.post("/upload", upload.single("file"), (req, res) => {

    let resources = [];

    if (fs.existsSync("resources.json")) {
        resources = JSON.parse(fs.readFileSync("resources.json"));
    }

    resources.push({
        title: req.body.title,
        subject: req.body.subject,
        file: req.file.filename
    });

    fs.writeFileSync("resources.json", JSON.stringify(resources));

    res.redirect("/dashboard");
});


// Download
app.get("/download/:file", (req, res) => {
    res.download("/tmp/" + req.params.file);
});


// Logout
app.get("/logout", (req, res) => {
    req.session.destroy();
    res.redirect("/");
});


const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log("Server running");
});