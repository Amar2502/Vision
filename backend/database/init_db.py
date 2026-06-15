from database import get_connection

conn = get_connection()

with open("database/schema.sql", "r") as file:
    conn.executescript(file.read())

conn.commit()
conn.close()

print("Database initialized.")