"""
FastAPI backend for AI Novel Generator
"""
import os
import json
import logging
from typing import Optional, List, Dict, Any
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, UploadFile, File, Form, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import PlainTextResponse
from pydantic import BaseModel

# Configure logging
logging.basicConfig(
    level=getattr(logging, os.getenv("LOG_LEVEL", "INFO").upper()),
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

# Data directory
DATA_DIR = os.getenv("DATA_DIR", "./data")
os.makedirs(DATA_DIR, exist_ok=True)

# Config file path
CONFIG_PATH = os.path.join(DATA_DIR, "config.json")


# ============== Pydantic Models ==============

class LLMConfig(BaseModel):
    api_key: str
    base_url: str
    model_name: str
    temperature: float = 0.7
    max_tokens: int = 4096
    timeout: int = 600
    interface_format: str = "OpenAI"


class EmbeddingConfig(BaseModel):
    api_key: str
    base_url: str
    model_name: str
    retrieval_k: int = 4
    interface_format: str = "OpenAI"


class OtherParams(BaseModel):
    topic: str = ""
    genre: str = ""
    filepath: str = ""
    num_chapters: int = 10
    word_number: int = 3000
    chapter_num: str = "1"
    user_guidance: str = ""
    characters_involved: str = ""
    key_items: str = ""
    scene_location: str = ""
    time_constraint: str = ""


class ChooseConfigs(BaseModel):
    prompt_draft_llm: str = "default"
    chapter_outline_llm: str = "default"
    architecture_llm: str = "default"
    final_chapter_llm: str = "default"
    consistency_review_llm: str = "default"


class ProxySetting(BaseModel):
    proxy_url: str = ""
    proxy_port: str = ""
    enabled: bool = False


class WebDAVConfig(BaseModel):
    webdav_url: str = ""
    webdav_username: str = ""
    webdav_password: str = ""


class AppConfig(BaseModel):
    last_interface_format: str = "OpenAI"
    last_embedding_interface_format: str = "OpenAI"
    llm_configs: Dict[str, LLMConfig] = {}
    embedding_configs: Dict[str, EmbeddingConfig] = {}
    other_params: OtherParams = OtherParams()
    choose_configs: ChooseConfigs = ChooseConfigs()
    proxy_setting: ProxySetting = ProxySetting()
    webdav_config: WebDAVConfig = WebDAVConfig()


class GenerationRequest(BaseModel):
    novel_path: str
    chapter_num: int = 1
    topic: str = ""
    genre: str = ""
    num_chapters: int = 10
    word_number: int = 3000
    user_guidance: str = ""
    characters_involved: str = ""
    key_items: str = ""
    scene_location: str = ""
    time_constraint: str = ""
    llm_config_name: str = "default"
    embedding_config_name: str = "default"


class DraftRequest(GenerationRequest):
    custom_prompt: Optional[str] = None


class EnrichRequest(GenerationRequest):
    chapter_text: str


class BatchRequest(GenerationRequest):
    start_chapter: int = 1
    end_chapter: int = 1
    expected_word_count: int = 3000
    min_word_count: int = 2000
    auto_enrich: bool = False


class ConsistencyRequest(GenerationRequest):
    chapter_text: str


class FileRequest(BaseModel):
    novel_path: str
    content: str


class RoleData(BaseModel):
    name: str
    description: str = ""
    character_arc: str = ""
    relationships: str = ""


class RoleCreateRequest(BaseModel):
    novel_path: str
    category: str
    role: RoleData


class CategoryCreateRequest(BaseModel):
    novel_path: str
    category: str


class RoleAnalyzeRequest(BaseModel):
    novel_path: str
    text: str


class WebDAVRequest(BaseModel):
    webdav_config: Dict[str, Any]


class TestLLMRequest(BaseModel):
    config_name: str
    llm_config: LLMConfig


class TestEmbeddingRequest(BaseModel):
    config_name: str
    embedding_config: EmbeddingConfig


class ChapterInfo(BaseModel):
    number: str
    title: str
    wordCount: int


class RoleCategory(BaseModel):
    name: str
    roles: List[RoleData]


# ============== Helper Functions ==============

def load_config_file() -> dict:
    """Load config from file or return defaults."""
    if os.path.exists(CONFIG_PATH):
        try:
            with open(CONFIG_PATH, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            logger.error(f"Failed to load config: {e}")
    # Return default config
    return AppConfig().model_dump()


def save_config_file(config: dict):
    """Save config to file."""
    os.makedirs(os.path.dirname(CONFIG_PATH), exist_ok=True)
    with open(CONFIG_PATH, "w", encoding="utf-8") as f:
        json.dump(config, f, ensure_ascii=False, indent=2)


def get_novel_dir(novel_path: str) -> str:
    """Resolve novel directory path."""
    if os.path.isabs(novel_path):
        return novel_path
    return os.path.join(DATA_DIR, novel_path)


def read_novel_file(novel_path: str, filename: str) -> str:
    """Read a file from the novel directory."""
    novel_dir = get_novel_dir(novel_path)
    filepath = os.path.join(novel_dir, filename)
    if not os.path.exists(filepath):
        return ""
    with open(filepath, "r", encoding="utf-8") as f:
        return f.read()


def write_novel_file(novel_path: str, filename: str, content: str):
    """Write a file to the novel directory."""
    novel_dir = get_novel_dir(novel_path)
    os.makedirs(novel_dir, exist_ok=True)
    filepath = os.path.join(novel_dir, filename)
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(content)


def get_word_count(text: str) -> int:
    """Count words (Chinese chars + English words)."""
    if not text:
        return 0
    chinese_chars = len([c for c in text if "\u4e00" <= c <= "\u9fff"])
    english_words = len([w for w in text.split() if w.strip() and any(c.isalpha() for c in w)])
    return chinese_chars + english_words


def list_chapters(novel_path: str) -> List[ChapterInfo]:
    """List all chapters in a novel directory."""
    novel_dir = get_novel_dir(novel_path)
    chapters = []
    if not os.path.exists(novel_dir):
        return chapters
    for fname in sorted(os.listdir(novel_dir)):
        if fname.startswith("chapter_") and fname.endswith(".txt"):
            num = fname.replace("chapter_", "").replace(".txt", "")
            filepath = os.path.join(novel_dir, fname)
            with open(filepath, "r", encoding="utf-8") as f:
                content = f.read()
            # Try to extract title from first line
            lines = content.strip().split("\n")
            title = lines[0][:50] if lines else "Untitled"
            chapters.append(ChapterInfo(
                number=num,
                title=title,
                wordCount=get_word_count(content)
            ))
    return chapters


def load_roles(novel_path: str) -> List[RoleCategory]:
    """Load role library from novel directory."""
    novel_dir = get_novel_dir(novel_path)
    roles_path = os.path.join(novel_dir, "roles.json")
    if not os.path.exists(roles_path):
        return []
    with open(roles_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    return [RoleCategory(**cat) for cat in data]


def save_roles(novel_path: str, categories: List[RoleCategory]):
    """Save role library to novel directory."""
    novel_dir = get_novel_dir(novel_path)
    os.makedirs(novel_dir, exist_ok=True)
    roles_path = os.path.join(novel_dir, "roles.json")
    with open(roles_path, "w", encoding="utf-8") as f:
        json.dump([cat.model_dump() for cat in categories], f, ensure_ascii=False, indent=2)


# ============== FastAPI App ==============

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler."""
    logger.info("AI Novel Generator backend starting...")
    # Ensure config exists
    if not os.path.exists(CONFIG_PATH):
        default_cfg = AppConfig()
        default_cfg.other_params.filepath = os.path.join(DATA_DIR, "my_novel")
        save_config_file(default_cfg.model_dump())
        logger.info(f"Created default config at {CONFIG_PATH}")
    yield
    logger.info("AI Novel Generator backend shutting down...")


app = FastAPI(
    title="AI Novel Generator API",
    description="REST API for AI-powered novel generation",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS
origins = os.getenv("CORS_ORIGINS", "*").split(",")
if "*" in origins:
    origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============== Config Endpoints ==============

@app.get("/api/config", response_model=dict)
async def get_config():
    """Get current configuration."""
    return load_config_file()


@app.put("/api/config")
async def update_config(config: AppConfig):
    """Update configuration."""
    save_config_file(config.model_dump())
    return {"status": "success"}


@app.post("/api/config/test-llm")
async def test_llm(req: TestLLMRequest):
    """Test LLM configuration."""
    try:
        from backend.llm_adapters import create_llm_adapter
        adapter = create_llm_adapter(
            interface_format=req.llm_config.interface_format,
            base_url=req.llm_config.base_url,
            model_name=req.llm_config.model_name,
            api_key=req.llm_config.api_key,
            temperature=req.llm_config.temperature,
            max_tokens=req.llm_config.max_tokens,
            timeout=req.llm_config.timeout,
        )
        result = adapter.invoke("Hello, this is a test. Please respond with 'OK'.")
        return {"status": "success", "response": result}
    except Exception as e:
        logger.error(f"LLM test failed: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/api/config/test-embedding")
async def test_embedding(req: TestEmbeddingRequest):
    """Test embedding configuration."""
    try:
        from backend.embedding_adapters import create_embedding_adapter
        adapter = create_embedding_adapter(
            interface_format=req.embedding_config.interface_format,
            api_key=req.embedding_config.api_key,
            base_url=req.embedding_config.base_url,
            model_name=req.embedding_config.model_name,
        )
        result = adapter.embed_query("test")
        return {"status": "success", "dimensions": len(result)}
    except Exception as e:
        logger.error(f"Embedding test failed: {e}")
        raise HTTPException(status_code=400, detail=str(e))


# ============== Generation Endpoints ==============

@app.post("/api/generate/architecture")
async def generate_architecture(req: GenerationRequest):
    """Generate novel architecture."""
    try:
        from backend.novel_generator import Novel_architecture_generate
        config = load_config_file()
        llm_cfg = config.get("llm_configs", {}).get(req.llm_config_name, {})
        Novel_architecture_generate(
            interface_format=llm_cfg.get("interface_format", "OpenAI"),
            api_key=llm_cfg.get("api_key", ""),
            base_url=llm_cfg.get("base_url", ""),
            llm_model=llm_cfg.get("model_name", ""),
            topic=req.topic,
            genre=req.genre,
            number_of_chapters=req.num_chapters,
            word_number=req.word_number,
            filepath=get_novel_dir(req.novel_path),
            user_guidance=req.user_guidance,
            temperature=llm_cfg.get("temperature", 0.7),
            max_tokens=llm_cfg.get("max_tokens", 8192),
            timeout=llm_cfg.get("timeout", 600),
        )
        return {"status": "success", "message": "Architecture generated"}
    except Exception as e:
        logger.error(f"Architecture generation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/generate/blueprint")
async def generate_blueprint(req: GenerationRequest):
    """Generate chapter blueprint."""
    try:
        from backend.novel_generator import Chapter_blueprint_generate
        config = load_config_file()
        llm_cfg = config.get("llm_configs", {}).get(req.llm_config_name, {})
        Chapter_blueprint_generate(
            interface_format=llm_cfg.get("interface_format", "OpenAI"),
            api_key=llm_cfg.get("api_key", ""),
            base_url=llm_cfg.get("base_url", ""),
            llm_model=llm_cfg.get("model_name", ""),
            filepath=get_novel_dir(req.novel_path),
            number_of_chapters=req.num_chapters,
            user_guidance=req.user_guidance,
            temperature=llm_cfg.get("temperature", 0.7),
            max_tokens=llm_cfg.get("max_tokens", 4096),
            timeout=llm_cfg.get("timeout", 600),
        )
        return {"status": "success", "message": "Blueprint generated"}
    except Exception as e:
        logger.error(f"Blueprint generation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/generate/prompt", response_class=PlainTextResponse)
async def generate_prompt(req: GenerationRequest):
    """Build chapter prompt."""
    try:
        from backend.novel_generator import build_chapter_prompt
        config = load_config_file()
        llm_cfg = config.get("llm_configs", {}).get(req.llm_config_name, {})
        emb_cfg = config.get("embedding_configs", {}).get(req.embedding_config_name, {})
        prompt = build_chapter_prompt(
            api_key=llm_cfg.get("api_key", ""),
            base_url=llm_cfg.get("base_url", ""),
            model_name=llm_cfg.get("model_name", ""),
            filepath=get_novel_dir(req.novel_path),
            novel_number=req.chapter_num,
            word_number=req.word_number,
            temperature=llm_cfg.get("temperature", 0.7),
            user_guidance=req.user_guidance,
            characters_involved=req.characters_involved,
            key_items=req.key_items,
            scene_location=req.scene_location,
            time_constraint=req.time_constraint,
            embedding_api_key=emb_cfg.get("api_key", ""),
            embedding_url=emb_cfg.get("base_url", ""),
            embedding_interface_format=emb_cfg.get("interface_format", "OpenAI"),
            embedding_model_name=emb_cfg.get("model_name", ""),
            embedding_retrieval_k=emb_cfg.get("retrieval_k", 4),
            interface_format=llm_cfg.get("interface_format", "OpenAI"),
            max_tokens=llm_cfg.get("max_tokens", 8192),
            timeout=llm_cfg.get("timeout", 600),
        )
        return prompt
    except Exception as e:
        logger.error(f"Prompt build failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/generate/draft", response_class=PlainTextResponse)
async def generate_draft(req: DraftRequest):
    """Generate chapter draft."""
    try:
        from backend.novel_generator import generate_chapter_draft
        config = load_config_file()
        llm_cfg = config.get("llm_configs", {}).get(req.llm_config_name, {})
        emb_cfg = config.get("embedding_configs", {}).get(req.embedding_config_name, {})
        draft = generate_chapter_draft(
            api_key=llm_cfg.get("api_key", ""),
            base_url=llm_cfg.get("base_url", ""),
            model_name=llm_cfg.get("model_name", ""),
            filepath=get_novel_dir(req.novel_path),
            novel_number=req.chapter_num,
            word_number=req.word_number,
            temperature=llm_cfg.get("temperature", 0.7),
            user_guidance=req.user_guidance,
            characters_involved=req.characters_involved,
            key_items=req.key_items,
            scene_location=req.scene_location,
            time_constraint=req.time_constraint,
            embedding_api_key=emb_cfg.get("api_key", ""),
            embedding_url=emb_cfg.get("base_url", ""),
            embedding_interface_format=emb_cfg.get("interface_format", "OpenAI"),
            embedding_model_name=emb_cfg.get("model_name", ""),
            embedding_retrieval_k=emb_cfg.get("retrieval_k", 4),
            interface_format=llm_cfg.get("interface_format", "OpenAI"),
            max_tokens=llm_cfg.get("max_tokens", 8192),
            timeout=llm_cfg.get("timeout", 600),
            custom_prompt_text=req.custom_prompt,
        )
        return draft
    except Exception as e:
        logger.error(f"Draft generation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/generate/finalize")
async def finalize_chapter_endpoint(req: GenerationRequest):
    """Finalize a chapter."""
    try:
        from backend.novel_generator import finalize_chapter
        config = load_config_file()
        llm_cfg = config.get("llm_configs", {}).get(req.llm_config_name, {})
        emb_cfg = config.get("embedding_configs", {}).get(req.embedding_config_name, {})
        finalize_chapter(
            novel_number=req.chapter_num,
            word_number=req.word_number,
            api_key=llm_cfg.get("api_key", ""),
            base_url=llm_cfg.get("base_url", ""),
            model_name=llm_cfg.get("model_name", ""),
            temperature=llm_cfg.get("temperature", 0.7),
            filepath=get_novel_dir(req.novel_path),
            embedding_api_key=emb_cfg.get("api_key", ""),
            embedding_url=emb_cfg.get("base_url", ""),
            embedding_interface_format=emb_cfg.get("interface_format", "OpenAI"),
            embedding_model_name=emb_cfg.get("model_name", ""),
            interface_format=llm_cfg.get("interface_format", "OpenAI"),
            max_tokens=llm_cfg.get("max_tokens", 8192),
            timeout=llm_cfg.get("timeout", 600),
        )
        return {"status": "success", "message": f"Chapter {req.chapter_num} finalized"}
    except Exception as e:
        logger.error(f"Finalization failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/generate/enrich", response_class=PlainTextResponse)
async def enrich_chapter(req: EnrichRequest):
    """Enrich chapter text."""
    try:
        from backend.novel_generator import enrich_chapter_text
        config = load_config_file()
        llm_cfg = config.get("llm_configs", {}).get(req.llm_config_name, {})
        enriched = enrich_chapter_text(
            chapter_text=req.chapter_text,
            word_number=req.word_number,
            api_key=llm_cfg.get("api_key", ""),
            base_url=llm_cfg.get("base_url", ""),
            model_name=llm_cfg.get("model_name", ""),
            temperature=llm_cfg.get("temperature", 0.7),
            interface_format=llm_cfg.get("interface_format", "OpenAI"),
            max_tokens=llm_cfg.get("max_tokens", 8192),
            timeout=llm_cfg.get("timeout", 600),
        )
        return enriched
    except Exception as e:
        logger.error(f"Enrichment failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/generate/batch")
async def batch_generate(req: BatchRequest):
    """Batch generate chapters."""
    try:
        from backend.novel_generator import generate_chapter_draft, finalize_chapter
        config = load_config_file()
        llm_cfg = config.get("llm_configs", {}).get(req.llm_config_name, {})
        emb_cfg = config.get("embedding_configs", {}).get(req.embedding_config_name, {})
        novel_dir = get_novel_dir(req.novel_path)

        for ch_num in range(req.start_chapter, req.end_chapter + 1):
            # Generate draft
            draft = generate_chapter_draft(
                api_key=llm_cfg.get("api_key", ""),
                base_url=llm_cfg.get("base_url", ""),
                model_name=llm_cfg.get("model_name", ""),
                filepath=novel_dir,
                novel_number=ch_num,
                word_number=req.word_number,
                temperature=llm_cfg.get("temperature", 0.7),
                user_guidance=req.user_guidance,
                characters_involved=req.characters_involved,
                key_items=req.key_items,
                scene_location=req.scene_location,
                time_constraint=req.time_constraint,
                embedding_api_key=emb_cfg.get("api_key", ""),
                embedding_url=emb_cfg.get("base_url", ""),
                embedding_interface_format=emb_cfg.get("interface_format", "OpenAI"),
                embedding_model_name=emb_cfg.get("model_name", ""),
                embedding_retrieval_k=emb_cfg.get("retrieval_k", 4),
                interface_format=llm_cfg.get("interface_format", "OpenAI"),
                max_tokens=llm_cfg.get("max_tokens", 8192),
                timeout=llm_cfg.get("timeout", 600),
            )

            # Auto-enrich if needed
            if req.auto_enrich and get_word_count(draft) < req.min_word_count:
                from backend.novel_generator import enrich_chapter_text
                draft = enrich_chapter_text(
                    chapter_text=draft,
                    word_number=req.expected_word_count,
                    api_key=llm_cfg.get("api_key", ""),
                    base_url=llm_cfg.get("base_url", ""),
                    model_name=llm_cfg.get("model_name", ""),
                    temperature=llm_cfg.get("temperature", 0.7),
                    interface_format=llm_cfg.get("interface_format", "OpenAI"),
                    max_tokens=llm_cfg.get("max_tokens", 8192),
                    timeout=llm_cfg.get("timeout", 600),
                )

            # Save draft
            write_novel_file(req.novel_path, f"chapter_{ch_num}.txt", draft)

            # Finalize
            finalize_chapter(
                novel_number=ch_num,
                word_number=req.word_number,
                api_key=llm_cfg.get("api_key", ""),
                base_url=llm_cfg.get("base_url", ""),
                model_name=llm_cfg.get("model_name", ""),
                temperature=llm_cfg.get("temperature", 0.7),
                filepath=novel_dir,
                embedding_api_key=emb_cfg.get("api_key", ""),
                embedding_url=emb_cfg.get("base_url", ""),
                embedding_interface_format=emb_cfg.get("interface_format", "OpenAI"),
                embedding_model_name=emb_cfg.get("model_name", ""),
                interface_format=llm_cfg.get("interface_format", "OpenAI"),
                max_tokens=llm_cfg.get("max_tokens", 8192),
                timeout=llm_cfg.get("timeout", 600),
            )

        return {"status": "success", "message": f"Batch {req.start_chapter}~{req.end_chapter} completed"}
    except Exception as e:
        logger.error(f"Batch generation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/generate/consistency", response_class=PlainTextResponse)
async def check_consistency_endpoint(req: ConsistencyRequest):
    """Check plot consistency."""
    try:
        from backend.consistency_checker import check_consistency
        config = load_config_file()
        llm_cfg = config.get("llm_configs", {}).get(req.llm_config_name, {})
        novel_dir = get_novel_dir(req.novel_path)

        novel_setting = read_novel_file(req.novel_path, "Novel_architecture.txt")
        character_state = read_novel_file(req.novel_path, "character_state.txt")
        global_summary = read_novel_file(req.novel_path, "global_summary.txt")
        plot_arcs = read_novel_file(req.novel_path, "plot_arcs.txt")

        result = check_consistency(
            novel_setting=novel_setting,
            character_state=character_state,
            global_summary=global_summary,
            chapter_text=req.chapter_text,
            api_key=llm_cfg.get("api_key", ""),
            base_url=llm_cfg.get("base_url", ""),
            model_name=llm_cfg.get("model_name", ""),
            temperature=llm_cfg.get("temperature", 0.7),
            plot_arcs=plot_arcs,
            interface_format=llm_cfg.get("interface_format", "OpenAI"),
            max_tokens=llm_cfg.get("max_tokens", 4096),
            timeout=llm_cfg.get("timeout", 600),
        )
        return result
    except Exception as e:
        logger.error(f"Consistency check failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============== File Endpoints ==============

FILE_NAME_MAP = {
    "architecture": "Novel_architecture.txt",
    "blueprint": "Novel_directory.txt",
    "character_state": "character_state.txt",
    "global_summary": "global_summary.txt",
    "style": "style.txt",
    "knowledge_base": "knowledge_base.txt",
    "plot_arcs": "plot_arcs.txt",
}


@app.get("/api/files/{name}", response_class=PlainTextResponse)
async def get_file(name: str, novel_path: str = Query(...)):
    """Read a file."""
    filename = FILE_NAME_MAP.get(name, name)
    content = read_novel_file(novel_path, filename)
    return content


@app.put("/api/files/{name}")
async def put_file(name: str, req: FileRequest):
    """Write a file."""
    filename = FILE_NAME_MAP.get(name, name)
    write_novel_file(req.novel_path, filename, req.content)
    return {"status": "success"}


@app.get("/api/files/chapters/{num}", response_class=PlainTextResponse)
async def get_chapter(num: str, novel_path: str = Query(...)):
    """Read a chapter file."""
    content = read_novel_file(novel_path, f"chapter_{num}.txt")
    return content


@app.put("/api/files/chapters/{num}")
async def put_chapter(num: str, req: FileRequest):
    """Write a chapter file."""
    write_novel_file(req.novel_path, f"chapter_{num}.txt", req.content)
    return {"status": "success"}


# ============== Chapter Endpoints ==============

@app.get("/api/chapters", response_model=List[ChapterInfo])
async def list_chapters_endpoint(novel_path: str = Query(...)):
    """List all chapters."""
    return list_chapters(novel_path)


# ============== Knowledge Endpoints ==============

@app.post("/api/knowledge/import")
async def import_knowledge(
    file: UploadFile = File(...),
    novel_path: str = Form(...),
    embedding_config_name: str = Form("default"),
):
    """Import a knowledge file into vector store."""
    try:
        from backend.novel_generator import import_knowledge_file
        config = load_config_file()
        emb_cfg = config.get("embedding_configs", {}).get(embedding_config_name, {})

        content = await file.read()
        text = content.decode("utf-8")

        # Save to temp file
        temp_path = os.path.join(DATA_DIR, "temp_knowledge.txt")
        with open(temp_path, "w", encoding="utf-8") as f:
            f.write(text)

        import_knowledge_file(
            embedding_api_key=emb_cfg.get("api_key", ""),
            embedding_url=emb_cfg.get("base_url", ""),
            embedding_interface_format=emb_cfg.get("interface_format", "OpenAI"),
            embedding_model_name=emb_cfg.get("model_name", ""),
            file_path=temp_path,
            filepath=get_novel_dir(novel_path),
        )

        # Clean up temp file
        os.remove(temp_path)

        return {"status": "success", "message": "Knowledge imported"}
    except Exception as e:
        logger.error(f"Knowledge import failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/api/vectorstore")
async def clear_vectorstore(novel_path: str = Query(...)):
    """Clear vector store."""
    try:
        from backend.novel_generator import clear_vector_store
        result = clear_vector_store(get_novel_dir(novel_path))
        return {"status": "success", "cleared": result}
    except Exception as e:
        logger.error(f"Vector store clear failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============== Role Endpoints ==============

@app.get("/api/roles", response_model=List[RoleCategory])
async def get_roles(novel_path: str = Query(...)):
    """Get all role categories."""
    return load_roles(novel_path)


@app.post("/api/roles")
async def create_role(req: RoleCreateRequest):
    """Create or update a role."""
    categories = load_roles(req.novel_path)
    category = next((c for c in categories if c.name == req.category), None)
    if category is None:
        category = RoleCategory(name=req.category, roles=[])
        categories.append(category)

    # Update or add role
    existing = next((r for r in category.roles if r.name == req.role.name), None)
    if existing:
        category.roles = [r if r.name != req.role.name else req.role for r in category.roles]
    else:
        category.roles.append(req.role)

    save_roles(req.novel_path, categories)
    return {"status": "success"}


@app.delete("/api/roles")
async def delete_role(
    novel_path: str = Query(...),
    category: str = Query(...),
    role_name: str = Query(...),
):
    """Delete a role."""
    categories = load_roles(novel_path)
    cat = next((c for c in categories if c.name == category), None)
    if cat:
        cat.roles = [r for r in cat.roles if r.name != role_name]
        if not cat.roles:
            categories = [c for c in categories if c.name != category]
        save_roles(novel_path, categories)
    return {"status": "success"}


@app.post("/api/roles/category")
async def create_category(req: CategoryCreateRequest):
    """Create a new category."""
    categories = load_roles(req.novel_path)
    if not any(c.name == req.category for c in categories):
        categories.append(RoleCategory(name=req.category, roles=[]))
        save_roles(req.novel_path, categories)
    return {"status": "success"}


@app.post("/api/roles/analyze")
async def analyze_roles(req: RoleAnalyzeRequest):
    """Analyze text for roles."""
    try:
        # Simple heuristic: extract names and create placeholder roles
        import re
        names = re.findall(r'[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*', req.text)
        names = list(set([n for n in names if len(n) > 2]))[:20]  # Limit to 20

        categories = load_roles(req.novel_path)
        auto_cat = next((c for c in categories if c.name == "Auto Detected"), None)
        if auto_cat is None:
            auto_cat = RoleCategory(name="Auto Detected", roles=[])
            categories.append(auto_cat)

        for name in names:
            if not any(r.name == name for r in auto_cat.roles):
                auto_cat.roles.append(RoleData(name=name, description="Auto-detected from text"))

        save_roles(req.novel_path, categories)
        return {"status": "success", "count": len(names)}
    except Exception as e:
        logger.error(f"Role analysis failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============== WebDAV Endpoints ==============

@app.post("/api/webdav/test")
async def test_webdav(req: WebDAVRequest):
    """Test WebDAV connection."""
    try:
        import requests
        cfg = req.webdav_config
        url = cfg.get("url", "")
        auth = (cfg.get("username", ""), cfg.get("password", ""))
        response = requests.request("PROPFIND", url, auth=auth, timeout=10)
        if response.status_code in [200, 207]:
            return {"status": "success", "message": "WebDAV connected"}
        else:
            raise HTTPException(status_code=400, detail=f"WebDAV returned {response.status_code}")
    except Exception as e:
        logger.error(f"WebDAV test failed: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/api/webdav/backup")
async def backup_webdav(req: WebDAVRequest):
    """Backup config to WebDAV."""
    try:
        import requests
        cfg = req.webdav_config
        url = cfg.get("url", "").rstrip("/") + "/" + cfg.get("remote_path", "").lstrip("/") + "config.json"
        auth = (cfg.get("username", ""), cfg.get("password", ""))
        config_data = load_config_file()
        response = requests.put(url, auth=auth, data=json.dumps(config_data, ensure_ascii=False), timeout=30)
        if response.status_code in [200, 201, 204]:
            return {"status": "success", "message": "Backup completed"}
        else:
            raise HTTPException(status_code=400, detail=f"WebDAV returned {response.status_code}")
    except Exception as e:
        logger.error(f"WebDAV backup failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/webdav/restore")
async def restore_webdav(req: WebDAVRequest):
    """Restore config from WebDAV."""
    try:
        import requests
        cfg = req.webdav_config
        url = cfg.get("url", "").rstrip("/") + "/" + cfg.get("remote_path", "").lstrip("/") + "config.json"
        auth = (cfg.get("username", ""), cfg.get("password", ""))
        response = requests.get(url, auth=auth, timeout=30)
        if response.status_code == 200:
            config_data = response.json()
            save_config_file(config_data)
            return {"status": "success", "message": "Restore completed"}
        else:
            raise HTTPException(status_code=400, detail=f"WebDAV returned {response.status_code}")
    except Exception as e:
        logger.error(f"WebDAV restore failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============== Health Check ==============

@app.get("/api/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "ok", "service": "ai-novel-generator"}


# ============== Main ==============

if __name__ == "__main__":
    import uvicorn
    host = os.getenv("APP_HOST", "0.0.0.0")
    port = int(os.getenv("APP_PORT", "8000"))
    uvicorn.run("backend.main:app", host=host, port=port, reload=True)
