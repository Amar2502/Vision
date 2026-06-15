CREATE TABLE IF NOT EXISTS articles(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    summary TEXT,
    link TEXT UNIQUE NOT NULL,
    source TEXT,
    published TEXT,
    category TEXT,
    country TEXT,
    importance INTEGER
);