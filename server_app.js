const express = require('express');
const path = require('path');
const app = express();
const PORT = 3000;
const bcrypt = require("bcrypt");
const session = require("express-session");
const bodyParser = require("body-parser");
const db = require("./db_users");
const fetch = require('node-fetch').default;


function getSuggestions(weather) {
  const temp = weather.main.temp;
  const wind = weather.wind.speed;
  const rain = weather.weather[0].main.toLowerCase();

  let clothing = [];
  let activities = [];

  // Ubiór
  if (temp < 5) {
    clothing.push({ name: "Ciepła kurtka", icon: "coat.jpg" });
    clothing.push({ name: "Szalik", icon: "scarf.jpg" });
  } else if (temp < 15) {
    clothing.push({ name: "Lekka kurtka", icon: "jacket.jpg" });
  } else if (temp < 25) {
    clothing.push({ name: "Bluza", icon: "hoodie.jpg" });
  } else {
    clothing.push({ name: "Koszulka", icon: "tshirt.avif" });
    clothing.push({ name: "Okulary przeciwsłoneczne", icon: "sunglasses.jpg" });
  }

  // Aktywności
  if (rain.includes("rain") || rain.includes("storm")) {
    activities.push({ name: "Muzeum", icon: "museum.jpg" });
    activities.push({ name: "Kino", icon: "cinema.jpg" });
  } else if (temp > 25 && wind < 5) {
    activities.push({ name: "Spacer", icon: "walk.jpg" });
    activities.push({ name: "Rower", icon: "bike.jpg" });
  } else {
    activities.push({ name: "Bieganie", icon: "running.png" });
    activities.push({ name: "Joga", icon: "yoga.jpg" });
  }

  return { clothing, activities };
}




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
  const { first_name, last_name, user_name, user_password, city } = req.body;
  const hashed = await bcrypt.hash(user_password, 10);
  db.run(`INSERT INTO users (username, password, firstname, lastname, city, country, region) VALUES (?, ?, ?, ?, ?, null, null)`, [user_name, hashed, first_name, last_name, city], err => {
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


  db.run(`UPDATE users SET region = ?, password = ? WHERE firstname = ? AND lastname = ?`, [city_name, hashed_changed ,first_name_settings, last_name_settings], async err => {
    //if (!user) return res.send("Nieprawidłowe dane logowania. Podany uzytkownik nie istnieje");
    if (!err) {

      if (first_name_settings!= ""){
        req.session.user.firstname = first_name_settings;
      }

      if (last_name_settings!= ""){
        req.session.user.lastname = last_name_settings;
      }

      if (hashed_changed != ""){
        req.session.user.password = hashed_changed;
      }
      if (city_name != ""){
        req.session.user.city = city_name;
      }
      if (country_name != ""){
        req.session.user.country = country_name;
      }      
      if (region_name != ""){
        req.session.user.region = region_name;
      }

    res.redirect("/weather_forecast");
      
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
  const city = req.session.user.city?.trim() || "Trzebinia";
  const response = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=metric`);


  const data = await response.json();

  console.log(data);
  console.log(city);

  const suggestions = getSuggestions(data);

  const country_wart = req.session.user.country || null;
  const region_wart = req.session.user.region || null;

  console.log(country_wart);
  console.log(region_wart);
  console.log(req.session.location_country);
  console.log(req.session.location_region);
  
  res.render("weather_details", {
  user: req.session.user,
  weather: data,
  country_session: country_wart,
  region_session: region_wart,
  clothing: suggestions.clothing,
  activities: suggestions.activities
});


  
  
    
  

});

//Obsługa plików statycznych z katalogu "MeteoGuideApp"
app.use(express.static(path.join(__dirname, 'MeteoGuideApp')));

// Uruchomienie serwera
app.listen(PORT, () => {
  console.log(`App is working on http://localhost:${PORT}`);
});