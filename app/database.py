import pymysql
from pymysql.cursors import DictCursor
from app.env import DATABASE_URL

# Parse DATABASE_URL to extract connection parameters
# Expected format: mysql+pymysql://user:password@host:port/dbname
def parse_db_url(url):
    from urllib.parse import urlparse
    parsed = urlparse(url)
    return {
        'host': parsed.hostname,
        'port': parsed.port or 3306,
        'user': parsed.username,
        'password': parsed.password,
        'db': parsed.path.lstrip('/'),
        'charset': 'utf8mb4',
        'cursorclass': DictCursor
    }

db_params = parse_db_url(DATABASE_URL)

# Dependency to get DB connection
def get_db():
    """
    Dependency function to get a database connection.
    This function yields a database connection and ensures it's closed after use.
    
    Usage in FastAPI:
    ```
    @app.get("/items/")
    def read_items(db = Depends(get_db)):
        with db.cursor() as cursor:
            cursor.execute("SELECT * FROM items")
            items = cursor.fetchall()
        return items
    ```
    """
    connection = pymysql.connect(**db_params)
    try:
        yield connection
    finally:
        connection.close()
