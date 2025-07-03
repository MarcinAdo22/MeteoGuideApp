const express = require('express');
const path = require('path');
const app = express();
const PORT = 3000;
const bcrypt = require("bcrypt");
const session = require("express-session");
const bodyParser = require("body-parser");
const db = require("./db_users");
const fetch = require('node-fetch').default;


app.use(bodyParser.urlencoded({ extended: true }));

app.set("view engine", "ejs");

app.set("views", path.join(__dirname, "MeteoGuideApp"));

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

app.get('/user_settings', (req, res) => {
  res.sendFile(path.join(__dirname, 'MeteoGuideApp', 'account_settings.html'));
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

app.post("/user_settings", async (req, res) => {
  const { first_name_settings, last_name_settings, passwd_settings, country_name, region_name ,city_name } = req.body;
  const hashed_changed = await bcrypt.hash(passwd_settings, 10);
  console.log(first_name_settings);
  console.log(last_name_settings);
  db.run(`UPDATE users SET region = ?, password = ? WHERE firstname = ? AND lastname = ?`, [city_name, hashed_changed ,first_name_settings, last_name_settings], async err => {
    //if (!user) return res.send("Nieprawidłowe dane logowania. Podany uzytkownik nie istnieje");
    if (!err) {
      req.session.user.password = hashed_changed;
      req.session.user.region = city_name;
      req.session.location_country = country_name;
      req.session.location_region = region_name;
      console.log(req.session.location_country);
      console.log(req.session.location_region);
      res.redirect("/weather_forecast");
      console.log(req.session.user.region);
      
    } else {
      res.send("Niestety, zmiany danych uzytkownika sie nie powiodly. Sprobuj raz jeszcze :)");
    }
  });
});

//Po walidacji user jest zalogowany i poinformowany o tym na stronie z danymi meteo
app.get("/weather_forecast", async (req, res) => {
  console.log(req.session.user.firstname)
  if (!req.session.user) return res.redirect("/login");
  //res.send(`Hejka, ${req.session.user.firstname}! Ciesze sie, ze jestes :) To jest twoja pogoda :)`);
  const apiKey = "1a66f3f14813d8f773616d86e35fdc04";
  const city = req.session.user.region;
  const response = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=metric`);
  const data = await response.json();
  

  const country_wart = req.session.location_country || null;
  const region_wart = req.session.location_region || null;

  console.log(country_wart);
  console.log(region_wart);
  console.log(req.session.location_country);
  console.log(req.session.location_region);
  
  res.render("weather_details", { user: req.session.user ,
                                  weather: data,
                                  country_session: country_wart,
                                  region_session: region_wart
  })
  
  
    
  

});

//Obsługa plików statycznych z katalogu "MeteoGuideApp"
app.use(express.static(path.join(__dirname, 'MeteoGuideApp')));

// Uruchomienie serwera
app.listen(PORT, () => {
  console.log(`App is working on http://localhost:${PORT}`);
});