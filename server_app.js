const express = require('express');
const path = require('path');
const app = express();
const PORT = 3000;

//Obsługa plików statycznych z katalogu "MeteoGuideApp"
app.use(express.static(path.join(__dirname, 'MeteoGuideApp')));

//Ustawienie strony startowej aplikacji
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'MeteoGuideApp', 'homepage.html'));
});

//Ustawienie strony logowania
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'MeteoGuideApp', 'login_user.html'));
});

app.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, 'MeteoGuideApp', 'register_user.html'));
});

app.get('/weather_forecast', (req, res) => {
  res.sendFile(path.join(__dirname, 'MeteoGuideApp', 'weather_details.html'));
});

app.use(express.urlencoded({ extended: true }));

app.post('/weather_forecast', (req, res) => {
  const imie = req.body.username;
  console.log('Odebrano imię:', imie);
  res.send(`Cześć, <strong>${imie}</strong>! Twoja pogoda na dzisiaj :).`);
});

// Uruchomienie serwera
app.listen(PORT, () => {
  console.log(`App is working on http://localhost:${PORT}`);
});