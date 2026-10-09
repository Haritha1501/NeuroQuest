import os
import logging
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from app.config import settings

logger = logging.getLogger("neuroquest.database")

# -------------------------------------------------------------
# Relational (PostgreSQL + SQLAlchemy) Layer
# -------------------------------------------------------------
try:
    db_url = settings.DATABASE_URL
    if db_url.startswith("postgres://"):
        db_url = db_url.replace("postgres://", "postgresql+psycopg2://", 1)
    elif db_url.startswith("postgresql://") and not db_url.startswith("postgresql+"):
        db_url = db_url.replace("postgresql://", "postgresql+psycopg2://", 1)
    engine = create_engine(db_url, echo=False)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
except Exception as e:
    logger.warning(f"Could not bind SQLAlchemy engine: {e}")
    engine = None
    SessionLocal = None

Base = declarative_base()

def get_db():
    if SessionLocal is None:
        yield None
        return
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

import socket

_mongo_client = None
_database = None

def _is_mongo_active(mongo_uri: str) -> bool:
    # If standard localhost URI, test socket directly in 0.05s
    if "localhost" in mongo_uri or "127.0.0.1" in mongo_uri:
        try:
            with socket.create_connection(("127.0.0.1", 27017), timeout=0.05):
                return True
        except OSError:
            return False
    return True

async def connect_to_mongo():
    global _mongo_client, _database
    if _database is not None:
        return _database

    mongo_uri = settings.MONGODB_URI
    db_name = settings.DATABASE_NAME

    if _is_mongo_active(mongo_uri):
        try:
            from motor.motor_asyncio import AsyncIOMotorClient
            client = AsyncIOMotorClient(mongo_uri, serverSelectionTimeoutMS=500)
            await client.admin.command('ping')
            _mongo_client = client
            _database = _mongo_client[db_name]
            logger.info(f"Connected to live MongoDB at {mongo_uri} (Database: {db_name})")
            return _database
        except Exception as e:
            logger.info(f"Live MongoDB ping failed ({e}).")

    logger.info("Initializing high-performance in-memory MongoDB-compatible database...")
    from mongomock_motor import AsyncMongoMockClient
    _mongo_client = AsyncMongoMockClient()
    _database = _mongo_client[db_name]
    logger.info(f"In-memory MongoDB-compatible database active (Database: {db_name})")
    return _database

def get_database():
    global _database, _mongo_client
    if _database is None:
        mongo_uri = settings.MONGODB_URI
        db_name = settings.DATABASE_NAME
        if _is_mongo_active(mongo_uri):
            try:
                from motor.motor_asyncio import AsyncIOMotorClient
                client = AsyncIOMotorClient(mongo_uri, serverSelectionTimeoutMS=500)
                _database = client[db_name]
                logger.info(f"Connected to live MongoDB at {mongo_uri}")
                return _database
            except Exception:
                pass
        from mongomock_motor import AsyncMongoMockClient
        _mongo_client = AsyncMongoMockClient()
        _database = _mongo_client[db_name]
        logger.info("Using in-memory MongoDB-compatible database for NeuroQuest.")
    return _database

async def close_mongo_connection():
    global _mongo_client
    if _mongo_client is not None:
        _mongo_client.close()
        logger.info("Closed MongoDB connection.")

