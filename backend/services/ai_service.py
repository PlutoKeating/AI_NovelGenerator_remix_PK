"""AI chat prompt assembly."""
from __future__ import annotations

from backend.schemas.ai import AIChatRequest
from backend.services.novel_service import get_novel_by_id, read_novel_file


def build_chat_prompt(req: AIChatRequest) -> str:
    """Assemble the chat prompt with the appropriate context block."""
    novel = get_novel_by_id(req.novel_id)
    context_prefix = ""

    if req.context_type == "background":
        current = read_novel_file(req.novel_id, "background.txt") or (
            (novel or {}).get("background", "")
        )
        context_prefix = "You are helping the user refine the novel's background setting.\n\n"
        if current:
            context_prefix += (
                f"Here is the user's current background setting:\n\"\"\"\n{current.strip()}\n\"\"\"\n\n"
            )
    elif req.context_type == "characters":
        current = read_novel_file(req.novel_id, "characters.txt") or (
            (novel or {}).get("characters", "")
        )
        context_prefix = "You are helping the user develop characters.\n\n"
        if current:
            context_prefix += (
                f"Here are the user's current character definitions:\n\"\"\"\n{current.strip()}\n\"\"\"\n\n"
            )
    elif req.context_type == "chapter":
        context_prefix = "You are helping the user revise a chapter.\n\n"
        if req.chapter_num:
            chapter = read_novel_file(req.novel_id, f"chapter_{req.chapter_num}.txt")
            if chapter:
                context_prefix += (
                    f"Here is the content of Chapter {req.chapter_num}:\n\"\"\"\n{chapter.strip()}\n\"\"\"\n\n"
                )

    convo = context_prefix
    for msg in req.messages:
        label = "User" if msg.role == "user" else "Assistant"
        convo += f"{label}: {msg.content}\n"
    convo += "Assistant:"
    return convo
