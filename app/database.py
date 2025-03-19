from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

from app.env import DATABASE_URL

# Create SQLAlchemy engine
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,  # Enables connection pool "pre-ping" feature
    pool_recycle=3600,   # Recycle connections after 1 hour
    echo=False           # Set to True to log all SQL queries
)

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create base class for models
Base = declarative_base()

# Dependency to get DB session
def get_db():
    """
    Dependency function to get a database session.
    This function yields a database session and ensures it's closed after use.
    
    Usage in FastAPI:
    ```
    @app.get("/items/")
    def read_items(db: Session = Depends(get_db)):
        items = db.query(Item).all()
        return items
    ```
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()