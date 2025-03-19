from app.database import Base, engine

def create_tables():
    """
    Create all tables defined in the models if they don't exist.
    This function should be called during application startup.
    """
    Base.metadata.create_all(bind=engine)
    print("Database tables created successfully.")

if __name__ == "__main__":
    # This allows the script to be run directly
    create_tables()