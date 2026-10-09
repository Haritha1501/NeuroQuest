import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import connect_to_mongo, close_mongo_connection, engine, Base
from app.services.seed_service import seed_database_content

# Primary Application Routers
from app.routers import (
    auth as auth_router,
    onboarding as onboarding_router,
    learner as learner_router,
    tasks as tasks_router,
    session as session_router,
    telemetry as telemetry_router,
    demo as demo_router,
    game_world as game_world_router,
    progress as progress_router,
    caregiver as caregiver_router,
    medical as medical_router,
    ai_mentor as ai_mentor_router,
    ai_assist as ai_assist_router,
    students as students_router,
    rag as rag_router,
    calibration as calibration_router,
    mastery_game as mastery_game_router,
    skill_map as skill_map_router,
    intelligence_layer as intelligence_layer_router
)

# Relational SQLAlchemy API endpoints
from app.api import auth as api_auth, medical as api_medical

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("neuroquest.main")

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing NeuroQuest FastAPI Backend & AI Agents...")
    await connect_to_mongo()
    try:
        await seed_database_content()
    except Exception as e:
        logger.warning(f"Database seeding notice: {e}")

    if engine is not None:
        try:
            Base.metadata.create_all(bind=engine)
        except Exception as e:
            logger.debug(f"SQLAlchemy schema notice: {e}")

    yield
    logger.info("Shutting down NeuroQuest Backend...")
    await close_mongo_connection()

app = FastAPI(
    title="NeuroQuest AI Adaptive Learning Platform API",
    description="Full Backend & AI Agent Engine for NeuroQuest (SIH 2026)",
    version="4.0.0",
    lifespan=lifespan
)

# Enable CORS for React frontend & local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Attach Primary Application Routers
app.include_router(auth_router.router)
app.include_router(students_router.router)
app.include_router(onboarding_router.router)
app.include_router(learner_router.router)
app.include_router(tasks_router.router)
app.include_router(session_router.router)
app.include_router(telemetry_router.router)
app.include_router(demo_router.router)
app.include_router(game_world_router.router)
app.include_router(progress_router.router)
app.include_router(caregiver_router.router)
app.include_router(medical_router.router)
app.include_router(ai_mentor_router.router)
app.include_router(ai_assist_router.router)
app.include_router(rag_router.router)
app.include_router(calibration_router.router)
app.include_router(mastery_game_router.router)
app.include_router(skill_map_router.router)
app.include_router(intelligence_layer_router.router)

# Attach Relational /api-less endpoints for compatibility
app.include_router(api_auth.router)
app.include_router(api_medical.router)

@app.post("/api/events")
@app.post("/events")
async def record_general_event(event_data: dict):
    load_check = event_data.get("load_check")
    adapted = load_check == "Too much"
    return {
        "success": True,
        "adapted": adapted,
        "action": "reduce_density" if adapted else "maintain"
    }

@app.get("/")
@app.get("/health")
@app.get("/api/health")
async def root_health_check():
    return {
        "status": "online",
        "app": "NeuroQuest AI Backend & Agent Engine",
        "version": "4.0.0",
        "agents": [
            "Cognitive State ML Classifier (Scikit-Learn)",
            "AI Mentor & Mission Generator",
            "NCERT Curriculum Scaffolding RAG",
            "Real-Time Telemetry Adaptation Engine",
            "Dynamic Difficulty & Gamification Engine"
        ]
    }

