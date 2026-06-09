import sqlite3

conn = sqlite3.connect("vision.db")
cur = conn.cursor()

cur.execute("""
CREATE TABLE IF NOT EXISTS feeds (
    id INTEGER PRIMARY KEY,
    source TEXT NOT NULL,
    title TEXT NOT NULL,
    summary TEXT NOT NULL,
    link TEXT NOT NULL,
    published TEXT NOT NULL,
    category TEXT NOT NULL,
    country TEXT,
    latitude REAL,
    longitude REAL
)
""")

conn.commit()
conn.close()