const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("users.db");

db.serialize(() => {
    
    db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE,
      password TEXT,
      firstname TEXT,
      lastname TEXT,
      region TEXT
    )
  `);
  
    /*
    db.run(`ALTER TABLE users ADD COLUMN region TEXT`, err => {
        if (err) {
        // Jeśli kolumna już istnieje, to SQLite zwróci błąd — możesz go zignorować
        console.log("Kolumna 'region' mogła już istnieć:", err.message);
        } else {
            console.log("Dodano kolumnę 'region' do tabeli users.");
        }
    });
    */
});

module.exports = db;