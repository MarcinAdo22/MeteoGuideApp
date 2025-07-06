const express = require('express');
const path = require('path');
const app = express();
const PORT = 3000;
const bcrypt = require("bcrypt");
const session = require("express-session");
const bodyParser = require("body-parser");
const db = require("./db_users");
const fetch = require('node-fetch').default;


function requireLogin(req, res, next) {
  if (!req.session.user) {
    return res.redirect("/login");
  }
  next();
}


function getSuggestions(weather) {
  const temp = weather.main.temp;
  const wind = weather.wind.speed;
  const rain = weather.weather[0].main.toLowerCase();

  let clothing = [];
  let activities = [];

  // Ubiór
  if (temp < 5) {
    clothing.push({ name: "Kurtka", icon: "jacket.jpg" });
    clothing.push({ name: "Szalik", icon: "scarf.jpg" });
  } else if (temp < 15) {
    clothing.push({ name: "Płaszcz/trencz", icon: "coat.jpg" });
    clothing.push({ name: "Bluza", icon: "hoodie.jpg" });
  } else if (temp < 20) {
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
    activities.push({ name: "Muzeum", icon: "museum.jpg" });
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

app.use((req, res, next) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  res.setHeader("Surrogate-Control", "no-store");
  next();
});


//Ustawienie strony startowej aplikacji
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'MeteoGuideApp', 'homepage.html'));
});

//Ustawienie strony logowania
app.get('/login', (req, res) => {
  res.render("login_user", { error: null });
});

//Ustawienie strony rejestracji
app.get('/register', (req, res) => {
  res.render("register_user", { error: null });
});

app.get('/user_settings', (req, res) => {
  if (!req.session.user) return res.redirect("/login");
  res.render("account_settings", { user: req.session.user });
});


app.get('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      console.log("Błąd przy wylogowaniu:", err);
      return res.send("Błąd przy wylogowywaniu.");
    }
    res.redirect('/login');
  });
});

app.get('/data_sources.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'MeteoGuideApp', 'data_sources.html'));
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
    if (!user) {
      return res.render("login_user", { error: "Nieprawidłowa nazwa użytkownika lub hasło." });
    }

    const validation = await bcrypt.compare(passwd, user.password);
    if (validation) {
      req.session.user = user;
      return res.redirect("/weather_forecast");
    } else {
      return res.render("login_user", { error: "Nieprawidłowa nazwa użytkownika lub hasło." });
    }
  });
});


app.post("/user_settings", async (req, res) => {
  const {first_name_settings, last_name_settings, passwd_settings, country_name, region_name, city_name} = req.body;

  const userId = req.session.user.id;

  // Hasło tylko jeśli podano
  let hashedPassword = req.session.user.password;
  if (passwd_settings && passwd_settings.trim() !== "") {
    hashedPassword = await bcrypt.hash(passwd_settings, 10);
  }

  // Wartości do aktualizacji
  const updatedFirstname = first_name_settings || req.session.user.firstname;
  const updatedLastname = last_name_settings || req.session.user.lastname;
  const updatedCountry = country_name || req.session.user.country;
  const updatedRegion = region_name && region_name.trim() !== "" ? region_name : null;
  const updatedCity = city_name && city_name.trim() !== "" ? city_name : null;

  db.run(
    `UPDATE users
     SET firstname = ?, lastname = ?, password = ?, country = ?, region = ?, city = ?
     WHERE id = ?`,
    [
      updatedFirstname,
      updatedLastname,
      hashedPassword,
      updatedCountry,
      updatedRegion,
      updatedCity,
      userId
    ],
    err => {
      if (err) {
        return res.send("Błąd podczas aktualizacji danych.");
      }

      // Aktualizacja sesji
      req.session.user.firstname = updatedFirstname;
      req.session.user.lastname = updatedLastname;
      req.session.user.password = hashedPassword;
      req.session.user.country = updatedCountry;
      req.session.user.region = updatedRegion;
      req.session.user.city = updatedCity;

      res.redirect("/weather_forecast");
    }
  );
});



//Po walidacji user jest zalogowany i poinformowany o tym na stronie z danymi meteo
app.get("/weather_forecast", requireLogin, async (req, res) => {
  console.log(req.session.user.firstname)
  if (!req.session.user) return res.redirect("/login");
  //res.send(`Hejka, ${req.session.user.firstname}! Ciesze sie, ze jestes :) To jest twoja pogoda :)`);
  const apiKey = "1a66f3f14813d8f773616d86e35fdc04";
  const city = req.session.user.city;
  const response = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=metric`);


  const data = await response.json();
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