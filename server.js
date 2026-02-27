const express = require("express");
const multer = require("multer");
const session = require("express-session");
const bcrypt = require("bcryptjs");
const fs = require("fs");
const path = require("path");

const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(session({
    secret: "secret",
    resave: false,
    saveUninitialized: true
}));

// ===== Subjects =====
const subjects = ["DS","DBMS","OS","CN","JAVA","MATHS","OTHER"];

// ===== Upload Storage =====
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const subject = req.body.subject || "OTHER";
        const uploadPath = path.join("/tmp/uploads", subject);
        fs.mkdirSync(uploadPath, { recursive: true });
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + "_" + file.originalname);
    }
});

const upload = multer({ storage });

// ===== Helpers =====
function loadJSON(file) {
    if (!fs.existsSync(file)) return [];
    return JSON.parse(fs.readFileSync(file));
}

function saveJSON(file, data) {
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

// ===== Routes =====
app.get("/", (req, res) => res.sendFile(__dirname + "/views/index.html"));
app.get("/login", (req, res) => res.sendFile(__dirname + "/views/login.html"));
app.get("/register", (req, res) => res.sendFile(__dirname + "/views/register.html"));


// ===== Register =====
app.post("/register", async (req, res) => {

    let users = loadJSON("users.json");

    const hash = await bcrypt.hash(req.body.password, 10);

    users.push({
        name: req.body.name,
        email: req.body.email,
        password: hash
    });

    saveJSON("users.json", users);

    res.redirect("/login");
});


// ===== Login =====
app.post("/login", async (req, res) => {

    let users = loadJSON("users.json");

    const user = users.find(u => u.email === req.body.email);

    if (user && await bcrypt.compare(req.body.password, user.password)) {

        req.session.user = user;

        if (user.email === "admin@gmail.com") {
            return res.redirect("/admin");
        }

        res.redirect("/dashboard");

    } else {
        res.send(`<script>alert("Invalid Login");window.location="/login";</script>`);
    }
});


// ===== Dashboard =====
app.get("/dashboard", (req, res) => {

    if (!req.session.user) return res.redirect("/login");

    let resources = loadJSON("resources.json");

    let cards = "";

    resources.forEach((r, index) => {

        cards += `
        <div class="col-md-4 mb-4">
            <div class="card shadow-lg h-100">
                <div class="card-body">

                    <h5>${r.title}</h5>
                    <p class="text-muted">${r.subject}</p>

                    <a href="/preview/${index}" class="btn btn-info btn-sm">Preview</a>
                    <a href="/download/${index}" class="btn btn-success btn-sm">Download</a>

                    <hr>

                    <p>❤️ ${r.likes || 0}</p>

                    <form action="/like/${index}" method="post">
                        <button class="btn btn-outline-danger btn-sm">Like</button>
                    </form>

                    <form action="/comment/${index}" method="post" class="mt-2">
                        <input name="comment" class="form-control mb-1" placeholder="Add comment">
                        <button class="btn btn-primary btn-sm">Comment</button>
                    </form>

                    <small>${(r.comments || []).join("<br>")}</small>

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
color:white;
}
.card{
border-radius:15px;
}
</style>

</head>

<body>

<nav class="navbar navbar-dark bg-dark p-3">
<div class="container">

<h4>📚 Student Hub</h4>

<div>
<a href="/upload" class="btn btn-warning">Upload</a>
<a href="/logout" class="btn btn-danger">Logout</a>
</div>

</div>
</nav>

<div class="container mt-4">
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

    let options = subjects.map(s => `<option>${s}</option>`).join("");

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
padding:30px;
border-radius:15px;
width:400px;
}
</style>

</head>

<body>

<div class="card">

<h3 class="text-center">Upload Resource</h3>

<form action="/upload" method="post" enctype="multipart/form-data">

<input name="title" class="form-control mb-2" placeholder="Title">

<select name="subject" class="form-control mb-2">
${options}
</select>

<input type="file" name="file" class="form-control mb-2">

<button class="btn btn-primary w-100">Upload</button>

</form>

<br>

<a href="/dashboard" class="btn btn-secondary w-100">Back</a>

</div>

</body>
</html>
`);
});


// ===== Upload =====
app.post("/upload", upload.single("file"), (req, res) => {

    let resources = loadJSON("resources.json");

    resources.push({
        title: req.body.title,
        subject: req.body.subject,
        file: req.file.filename,
        likes: 0,
        comments: []
    });

    saveJSON("resources.json", resources);

    res.redirect("/dashboard");
});


// ===== Preview =====
app.get("/preview/:id", (req, res) => {

    let resources = loadJSON("resources.json");
    let r = resources[req.params.id];

    const filePath = path.join("/tmp/uploads", r.subject, r.file);

    res.sendFile(filePath);
});


// ===== Download =====
app.get("/download/:id", (req, res) => {

    let resources = loadJSON("resources.json");
    let r = resources[req.params.id];

    const filePath = path.join("/tmp/uploads", r.subject, r.file);

    res.download(filePath);
});


// ===== Like =====
app.post("/like/:id", (req, res) => {

    let resources = loadJSON("resources.json");

    resources[req.params.id].likes++;

    saveJSON("resources.json", resources);

    res.redirect("/dashboard");
});


// ===== Comment =====
app.post("/comment/:id", (req, res) => {

    let resources = loadJSON("resources.json");

    if (!resources[req.params.id].comments) {
        resources[req.params.id].comments = [];
    }

    resources[req.params.id].comments.push(req.body.comment);

    saveJSON("resources.json", resources);

    res.redirect("/dashboard");
});


// ===== Admin Panel =====
app.get("/admin", (req, res) => {

    if (!req.session.user || req.session.user.email !== "admin@gmail.com") {
        return res.redirect("/login");
    }

    let resources = loadJSON("resources.json");

    let list = resources.map((r,i)=>`
        <li>${r.title} - ${r.subject}
        <a href="/delete/${i}" class="btn btn-sm btn-danger">Delete</a></li>
    `).join("");

    res.send(`
    <h2>Admin Panel</h2>
    <ul>${list}</ul>
    <a href="/dashboard">Back</a>
    `);
});


app.get("/delete/:id", (req, res) => {

    let resources = loadJSON("resources.json");

    resources.splice(req.params.id,1);

    saveJSON("resources.json", resources);

    res.redirect("/admin");
});


// ===== Logout =====
app.get("/logout", (req, res) => {
    req.session.destroy();
    res.redirect("/");
});


const PORT = process.env.PORT || 3000;

app.listen(PORT, () => console.log("Server running"));