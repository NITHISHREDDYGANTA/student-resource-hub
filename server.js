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


// ===== File Upload =====
const storage = multer.diskStorage({
    destination: "/tmp",
    filename: (req, file, cb) => {
        cb(null, Date.now() + "_" + file.originalname);
    }
});
const upload = multer({ storage });


// ===== Routes =====
app.get("/", (req, res) => {
    res.sendFile(__dirname + "/views/index.html");
});

app.get("/login", (req, res) => {
    res.sendFile(__dirname + "/views/login.html");
});

app.get("/register", (req, res) => {
    res.sendFile(__dirname + "/views/register.html");
});


// ===== Register =====
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


// ===== Login =====
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


// ===== Dashboard =====
app.get("/dashboard", (req, res) => {

    let resources = [];

    if (fs.existsSync("resources.json")) {
        resources = JSON.parse(fs.readFileSync("resources.json"));
    }

    let cards = "";

    resources.forEach(r => {
        cards += `
        <div class="col-md-4 mb-4">
            <div class="card shadow-lg h-100">
                <div class="card-body">
                    <h5 class="card-title">${r.title}</h5>
                    <p class="card-text text-muted">${r.subject}</p>

                    <a href="/download/${r.file}" class="btn btn-success">
                        <i class="fa fa-download"></i> Download
                    </a>
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
<link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.2/css/all.min.css" rel="stylesheet">

<style>

body{
background: linear-gradient(135deg,#667eea,#764ba2);
min-height:100vh;
color:white;
}

.navbar{
background: rgba(0,0,0,0.3);
backdrop-filter: blur(10px);
}

.card{
border:none;
border-radius:15px;
transition:0.3s;
}

.card:hover{
transform: translateY(-5px);
}

</style>

</head>

<body>

<nav class="navbar navbar-dark p-3">
<div class="container">

<h4>📚 Student Resource Hub</h4>

<div>
<a href="/upload" class="btn btn-warning me-2">
<i class="fa fa-upload"></i> Upload
</a>

<a href="/logout" class="btn btn-danger">
<i class="fa fa-sign-out"></i> Logout
</a>
</div>

</div>
</nav>


<div class="container mt-4">

<h3 class="mb-4">Available Downloads</h3>

<div class="row">

${cards}

</div>

</div>

</body>
</html>
`);
});


// ===== Upload Page =====
app.get("/upload", (req, res) => {

    res.send(`
<!DOCTYPE html>
<html>

<head>

<title>Upload</title>

<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">

<style>

body{
background: linear-gradient(135deg,#667eea,#764ba2);
height:100vh;
display:flex;
justify-content:center;
align-items:center;
}

.card{
border-radius:15px;
padding:30px;
width:400px;
box-shadow:0 10px 30px rgba(0,0,0,0.2);
}

</style>

</head>

<body>

<div class="card">

<h3 class="text-center mb-3">Upload Resource</h3>

<form action="/upload" method="post" enctype="multipart/form-data">

<input name="title" class="form-control mb-3" placeholder="Title">

<input name="subject" class="form-control mb-3" placeholder="Subject">

<input type="file" name="file" class="form-control mb-3">

<button class="btn btn-primary w-100">Upload</button>

</form>

<br>

<a href="/dashboard" class="btn btn-secondary w-100">Back to Dashboard</a>

</div>

</body>
</html>
`);
});


// ===== Upload =====
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


// ===== Download =====
app.get("/download/:file", (req, res) => {
    res.download("/tmp/" + req.params.file);
});


// ===== Logout =====
app.get("/logout", (req, res) => {
    req.session.destroy();
    res.redirect("/");
});


const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log("Server running");
});