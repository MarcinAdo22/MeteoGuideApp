const express = require('express');
const path = require('path');
const app = express();
const PORT = 3000;
const bcrypt = require("bcrypt");
const session = require("express-session");
const bodyParser = require("body-parser");
const db = require("./db_users");

app.use(bodyParser.urlencoded({ extended: true }));

app.set("view engine", "ejs");

app.use(session({
  secret: "key_to_secure", 
  resave: false,
  saveUninitialized: false
}));

//Ustawienie strony startowej aplikacji
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'MeteoGuideApp', 'homepage.html'));
});

//Ustawienie strony logowania
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'MeteoGuideApp', 'login_user.html'));
});

//Ustawienie strony rejestracji
app.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, 'MeteoGuideApp', 'register_user.html'));
});

app.use(express.urlencoded({ extended: true }));

//Insertowanie do bazy danych uzytkonikow MeteoGuideApp
app.post("/register", async (req, res) => {
  const { first_name, last_name, user_name, user_password } = req.body;
  const hashed = await bcrypt.hash(user_password, 10);
  db.run(`INSERT INTO users (username, password, firstname, lastname) VALUES (?, ?, ?, ?)`, [user_name, hashed, first_name, last_name], err => {
    if (err) return res.send("Błąd: użytkownik istnieje.");
    res.redirect("/login");
  });
});

//Przeszukiwanie uzytkownika z ocena poprawnosci wpisanych w form: nazwy usera i hasla
app.post("/login", (req, res) => {
  const { username, passwd } = req.body;
  db.get(`SELECT * FROM users WHERE username = ?`, [username], async (err, user) => {
    if (!user) return res.send("Nieprawidłowe dane logowania. Podany uzytkownik nie istnieje");
    const validation = await bcrypt.compare(passwd, user.password);
    if (validation) {
      req.session.user = user;
      res.redirect("/weather_forecast");
    } else {
      res.send("Nieprawidłowe hasło. Sprawdz czy jest poprawne");
    }
  });
});

//Po walidacji user jest zalogowany i poinformowany o tym na stronie z danymi meteo
app.get("/weather_forecast", (req, res) => {
  console.log(req.session.user.firstname)
  if (!req.session.user) return res.redirect("/login");
  res.send(`Hejka, ${req.session.user.firstname}! Ciesze sie, ze jestes :) To jest twoja pogoda :)`);
});

//Obsługa plików statycznych z katalogu "MeteoGuideApp"
app.use(express.static(path.join(__dirname, 'MeteoGuideApp')));

// Uruchomienie serwera
app.listen(PORT, () => {
  console.log(`App is working on http://localhost:${PORT}`);
});