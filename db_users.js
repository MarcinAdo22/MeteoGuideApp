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
      city TEXT,
      country TEXT,
      region TEXT
    )
  `);

  
  
    
    
});

module.exports = db;