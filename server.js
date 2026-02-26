const express = require("express");
const mongoose = require("mongoose");
const multer = require("multer");
const session = require("express-session");
const bcrypt = require("bcryptjs");
const path = require("path");

const app = express();

// MongoDB Connection
mongoose.connect("mongodb+srv://nithishganta02_db_user:nithish126@cluster0.wmtbjpq.mongodb.net/studentDB?retryWrites=true&w=majority")
.then(()=>console.log("MongoDB Connected"))
.catch(err=>console.log("DB Error:", err));
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: "secret",
    resave: false,
    saveUninitialized: true
}));

// Models
const User = mongoose.model("User", {
    name: String,
    email: String,
    password: String
});

const Resource = mongoose.model("Resource", {
    title: String,
    subject: String,
    file: String
});

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

app.get("/register", (req, res) => {
    res.sendFile(__dirname + "/views/register.html");
});

app.post("/register", async (req, res) => {
    try {
        const hash = await bcrypt.hash(req.body.password, 10);

        await User.create({
            name: req.body.name,
            email: req.body.email,
            password: hash
        });

        res.redirect("/login");

    } catch (err) {
        res.send("Register Error");
    }
});
app.get("/login", (req, res) => {
    res.sendFile(__dirname + "/views/login.html");
});
app.get("/logout", (req, res) => {
    req.session.destroy();
    res.redirect("/login");
});
app.post("/login", async (req, res) => {
    const user = await User.findOne({ email: req.body.email });
    if (user && await bcrypt.compare(req.body.password, user.password)) {
        req.session.user = user;
        res.redirect("/dashboard");
    } else {
        res.send("Invalid login");
    }
});

app.get("/dashboard", async (req, res) => {

    const resources = await Resource.find();

    let cards = "";

    resources.forEach(r => {
        cards += `
        <div class="col-md-4 mb-4">
            <div class="card shadow h-100">
                <div class="card-body">
                    <h5 class="card-title">${r.title}</h5>
                    <p class="card-text">${r.subject}</p>
                    <a href="/download/${r.file}" class="btn btn-primary">Download</a>
                </div>
            </div>
        </div>
        `;
    });

    res.send(`
<!DOCTYPE html>
<html>

<head>
<title>Dashboard</title>

<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">

<style>
body{
background: linear-gradient(135deg,#667eea,#764ba2);
min-height:100vh;
}

.navbar{
background: rgba(0,0,0,0.2);
backdrop-filter: blur(10px);
}

</style>

</head>

<body>

<nav class="navbar navbar-dark">
<div class="container">

<span class="navbar-brand">📚 Student Dashboard</span>

<div>
<a href="/upload" class="btn btn-warning me-2">Upload</a>
<a href="/logout" class="btn btn-danger">Logout</a>
</div>

</div>
</nav>

<div class="container mt-4">

<h3 class="text-white mb-4">Available Resources</h3>

<div class="row">

${cards}

</div>

</div>

</body>
</html>
`);
});
app.get("/upload", (req, res) => {
    res.sendFile(__dirname + "/views/upload.html");
});

app.post("/upload", upload.single("file"), async (req, res) => {
    await Resource.create({
        title: req.body.title,
        subject: req.body.subject,
        file: req.file.filename
    });
    res.redirect("/dashboard");
});

app.get("/download/:file", (req, res) => {
    res.download("/tmp/" + req.params.file);
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log("Server running");
});