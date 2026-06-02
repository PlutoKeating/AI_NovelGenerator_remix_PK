import os
import json
from typing import List, Dict, Any, Optional

# Single source of truth — always import from backend.core.paths so that the
# agent tools, the API layer and the pipeline all read/write the same
# filesystem regardless of how the process is launched.
from backend.core.paths import DATA_DIR as _DATA_DIR_PATH, get_novel_dir as _get_novel_dir

DATA_DIR = str(_DATA_DIR_PATH)


def get_novel_dir(novel_id: str) -> str:
    """Get absolute path to novel directory."""
    return str(_get_novel_dir(novel_id))

def read_json_file(novel_id: str, filename: str, default_val: Any) -> Any:
    """Read structured JSON setting file."""
    ndir = get_novel_dir(novel_id)
    fpath = os.path.join(ndir, filename)
    if not os.path.exists(fpath):
        return default_val
    try:
        with open(fpath, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return default_val

def write_json_file(novel_id: str, filename: str, data: Any):
    """Write structured JSON setting file."""
    ndir = get_novel_dir(novel_id)
    os.makedirs(ndir, exist_ok=True)
    fpath = os.path.join(ndir, filename)
    with open(fpath, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

def write_text_file(novel_id: str, filename: str, content: str):
    """Write plain text/markdown file."""
    ndir = get_novel_dir(novel_id)
    os.makedirs(ndir, exist_ok=True)
    fpath = os.path.join(ndir, filename)
    with open(fpath, "w", encoding="utf-8") as f:
        f.write(content)

# ============== Synchronizers / Compilers ==============

def sync_characters_to_txt(novel_id: str):
    """Compile structured characters.json to legacy characters.txt Markdown."""
    chars = read_json_file(novel_id, "characters.json", [])
    if not chars:
        return
    
    md_lines = ["# 人物设定\n"]
    for char in chars:
        name = char.get("name", "未命名")
        md_lines.append(f"## {name}")
        md_lines.append(f"*   **身份/背景**: {char.get('identity', '未设定')}")
        md_lines.append(f"*   **外貌特征**: {char.get('appearance', '未设定')}")
        md_lines.append(f"*   **性格特征**: {char.get('personality', '未设定')}")
        related = char.get("related_events", [])
        related_str = ", ".join(related) if related else "无"
        md_lines.append(f"*   **关联事件**: {related_str}\n")
    
    write_text_file(novel_id, "characters.txt", "\n".join(md_lines))

def sync_storyline_and_events_to_txt(novel_id: str):
    """Compile storyline.json and events.json into plot_arcs.txt."""
    story_data = read_json_file(novel_id, "storyline.json", {"narrative_type": "chronological", "storyline": []})
    events = read_json_file(novel_id, "events.json", [])
    
    md_lines = ["# 故事剧情线与事件设定\n"]
    
    # 1. Narrative type
    narrative_type = story_data.get("narrative_type", "chronological")
    type_map = {
        "chronological": "顺叙线 (Chronological)",
        "parallel": "并叙线 (Parallel)",
        "flashback": "倒叙线 (Flashback)",
        "interwoven": "插叙/交织线 (Interwoven)"
    }
    md_lines.append(f"## 叙事结构")
    md_lines.append(f"*   **叙事类型**: {type_map.get(narrative_type, narrative_type)}\n")
    
    # 2. Timeline
    md_lines.append("## 故事脉络 Timeline")
    storyline_nodes = story_data.get("storyline", [])
    if storyline_nodes:
        # Sort by sequence
        storyline_nodes = sorted(storyline_nodes, key=lambda x: x.get("sequence", 0))
        for node in storyline_nodes:
            seq = node.get("sequence", 0)
            name = node.get("event_name", "未命名事件")
            ch = f"第{node.get('chapter')}章" if node.get("chapter") else "未分配章节"
            desc = node.get("description", "")
            md_lines.append(f"{seq}. 【{name}】 ({ch}) - {desc}")
    else:
        md_lines.append("*   暂无故事线脉络节点。")
    md_lines.append("")
    
    # 3. Events details
    md_lines.append("## 事件详细设定")
    if events:
        for ev in events:
            name = ev.get("name", "未命名事件")
            md_lines.append(f"### 事件：{name}")
            md_lines.append(f"*   **事件描述**: {ev.get('description', '暂无描述')}")
            chars = ev.get("characters_involved", [])
            chars_str = ", ".join(chars) if chars else "无"
            md_lines.append(f"*   **涉及人物**: {chars_str}")
            md_lines.append(f"*   **发生地点**: {ev.get('location', '未设定')}")
            md_lines.append(f"*   **事件后果**: {ev.get('consequences', '暂无后果设定')}\n")
    else:
        md_lines.append("*   暂无详细事件设定。")
        
    write_text_file(novel_id, "plot_arcs.txt", "\n".join(md_lines))


# ============== Tool Function Implementations ==============

def set_novel_metadata(novel_id: str, title: str, genre: str = None, description: str = None, num_chapters: int = None, word_number: int = None) -> Dict[str, Any]:
    """Tool 1: Set or update novel metadata in novels_index.json."""
    from backend.core.paths import NOVELS_INDEX_PATH
    index_path = str(NOVELS_INDEX_PATH)
    if not os.path.exists(index_path):
        index = []
    else:
        try:
            with open(index_path, "r", encoding="utf-8") as f:
                index = json.load(f)
        except Exception:
            index = []

    novel_found = False
    for novel in index:
        if novel.get("id") == novel_id:
            if title: novel["title"] = title
            if genre is not None: novel["genre"] = genre
            if description is not None: novel["description"] = description
            if num_chapters is not None: novel["num_chapters"] = num_chapters
            novel["updated_at"] = "" # backend refreshes it
            novel_found = True
            break
            
    if not novel_found:
        # Create a new metadata item
        import uuid
        from datetime import datetime
        now = datetime.now().isoformat()
        novel = {
            "id": novel_id,
            "title": title,
            "genre": genre or "",
            "description": description or "",
            "num_chapters": num_chapters or 10,
            "word_count": 0,
            "created_at": now,
            "updated_at": now,
            "status": "draft"
        }
        index.append(novel)
        
    with open(index_path, "w", encoding="utf-8") as f:
        json.dump(index, f, ensure_ascii=False, indent=2)
        
    # Also write Novel_architecture.txt
    arch_content = f"# 小说基本设定\n\n*   **书名**: {title}\n*   **题材**: {genre or '未定'}\n*   **篇幅章节**: {num_chapters or 10}章\n*   **字数要求**: 单章约{word_number or 3000}字\n*   **简介梗概**: {description or '暂无'}\n"
    write_text_file(novel_id, "Novel_architecture.txt", arch_content)
    
    return {"status": "success", "message": "Novel metadata updated successfully.", "novel_id": novel_id}


def get_chapter_content(novel_id: str, chapter_num: str, start_line: int = None, end_line: int = None) -> Dict[str, Any]:
    """Tool 2: Read chapter text content."""
    ndir = get_novel_dir(novel_id)
    fpath = os.path.join(ndir, f"chapter_{chapter_num}.txt")
    if not os.path.exists(fpath):
        return {"status": "error", "message": f"Chapter {chapter_num} file does not exist."}
        
    try:
        with open(fpath, "r", encoding="utf-8") as f:
            lines = f.readlines()
            
        total_lines = len(lines)
        # Handle slice
        s_idx = (start_line - 1) if start_line is not None else 0
        e_idx = end_line if end_line is not None else total_lines
        
        # Guard rails
        s_idx = max(0, min(s_idx, total_lines))
        e_idx = max(0, min(e_idx, total_lines))
        
        selected_lines = lines[s_idx:e_idx]
        content = "".join(selected_lines)
        
        return {
            "status": "success",
            "chapter_num": chapter_num,
            "total_lines": total_lines,
            "read_lines_range": [s_idx + 1, e_idx],
            "content": content
        }
    except Exception as e:
        return {"status": "error", "message": f"Failed to read chapter content: {str(e)}"}


def write_chapter_content(novel_id: str, chapter_num: str, content: str, mode: str = "overwrite") -> Dict[str, Any]:
    """Tool 3: Write or append chapter text content."""
    ndir = get_novel_dir(novel_id)
    os.makedirs(ndir, exist_ok=True)
    fpath = os.path.join(ndir, f"chapter_{chapter_num}.txt")
    
    try:
        if mode == "append" and os.path.exists(fpath):
            with open(fpath, "a", encoding="utf-8") as f:
                f.write("\n" + content)
            msg = f"Chapter {chapter_num} content appended successfully."
        else:
            with open(fpath, "w", encoding="utf-8") as f:
                f.write(content)
            msg = f"Chapter {chapter_num} content written/overwritten successfully."
            
        return {"status": "success", "message": msg, "chapter_num": chapter_num}
    except Exception as e:
        return {"status": "error", "message": f"Failed to write chapter content: {str(e)}"}


def query_characters(novel_id: str, character_name: str = None) -> Dict[str, Any]:
    """Tool 4: Query all characters or a specific character."""
    chars = read_json_file(novel_id, "characters.json", [])
    if not chars:
        # Fallback: check if legacy characters.txt exists
        legacy_path = os.path.join(get_novel_dir(novel_id), "characters.txt")
        if os.path.exists(legacy_path):
            try:
                with open(legacy_path, "r", encoding="utf-8") as f:
                    txt = f.read()
                return {"status": "success", "source": "characters.txt", "raw_text": txt}
            except Exception:
                pass
        return {"status": "success", "characters": []}
        
    if character_name:
        for char in chars:
            if char.get("name").strip().lower() == character_name.strip().lower():
                return {"status": "success", "character": char}
        return {"status": "error", "message": f"Character '{character_name}' not found."}
        
    return {"status": "success", "characters": chars}


def update_characters(novel_id: str, action: str, characters_list: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Tool 5: Add, edit, or delete characters and sync to characters.txt."""
    chars = read_json_file(novel_id, "characters.json", [])
    
    updated_count = 0
    if action == "add":
        for new_char in characters_list:
            # Check duplicates
            exists = False
            for c in chars:
                if c["name"].strip() == new_char["name"].strip():
                    # Update fields instead of full add
                    c.update(new_char)
                    exists = True
                    break
            if not exists:
                chars.append(new_char)
            updated_count += 1
            
    elif action == "edit":
        for edit_char in characters_list:
            found = False
            for c in chars:
                if c["name"].strip().lower() == edit_char["name"].strip().lower():
                    c.update(edit_char)
                    found = True
                    updated_count += 1
                    break
            if not found:
                # Treat as add
                chars.append(edit_char)
                updated_count += 1
                
    elif action == "delete":
        names_to_delete = {c["name"].strip().lower() for c in characters_list}
        old_len = len(chars)
        chars = [c for c in chars if c["name"].strip().lower() not in names_to_delete]
        updated_count = old_len - len(chars)
        
    write_json_file(novel_id, "characters.json", chars)
    # Automatically sync to MD legacy file!
    sync_characters_to_txt(novel_id)
    
    return {"status": "success", "message": f"Successfully performed '{action}' on {updated_count} characters.", "action": action}


def query_events(novel_id: str, event_name: str = None) -> Dict[str, Any]:
    """Tool 6: Query all events or a specific event."""
    events = read_json_file(novel_id, "events.json", [])
    if not events:
        # Check if plot_arcs.txt legacy exists
        legacy_path = os.path.join(get_novel_dir(novel_id), "plot_arcs.txt")
        if os.path.exists(legacy_path):
            try:
                with open(legacy_path, "r", encoding="utf-8") as f:
                    txt = f.read()
                return {"status": "success", "source": "plot_arcs.txt", "raw_text": txt}
            except Exception:
                pass
        return {"status": "success", "events": []}
        
    if event_name:
        for ev in events:
            if ev.get("name").strip().lower() == event_name.strip().lower():
                return {"status": "success", "event": ev}
        return {"status": "error", "message": f"Event '{event_name}' not found."}
        
    return {"status": "success", "events": events}


def update_events(novel_id: str, action: str, events_list: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Tool 7: Add, edit, or delete events and sync to plot_arcs.txt."""
    events = read_json_file(novel_id, "events.json", [])
    
    updated_count = 0
    if action == "add":
        for new_ev in events_list:
            exists = False
            for ev in events:
                if ev["name"].strip() == new_ev["name"].strip():
                    ev.update(new_ev)
                    exists = True
                    break
            if not exists:
                events.append(new_ev)
            updated_count += 1
            
    elif action == "edit":
        for edit_ev in events_list:
            found = False
            for ev in events:
                if ev["name"].strip().lower() == edit_ev["name"].strip().lower():
                    ev.update(edit_ev)
                    found = True
                    updated_count += 1
                    break
            if not found:
                events.append(edit_ev)
                updated_count += 1
                
    elif action == "delete":
        names_to_delete = {ev["name"].strip().lower() for ev in events_list}
        old_len = len(events)
        events = [ev for ev in events if ev["name"].strip().lower() not in names_to_delete]
        updated_count = old_len - len(events)
        
    write_json_file(novel_id, "events.json", events)
    # Automatically compile both events and storyline into plot_arcs.txt!
    sync_storyline_and_events_to_txt(novel_id)
    
    return {"status": "success", "message": f"Successfully performed '{action}' on {updated_count} events.", "action": action}


def query_storyline(novel_id: str) -> Dict[str, Any]:
    """Tool 8: Query novel narrative timeline storyline."""
    story_data = read_json_file(novel_id, "storyline.json", {"narrative_type": "chronological", "storyline": []})
    return {"status": "success", "narrative_type": story_data.get("narrative_type"), "storyline": story_data.get("storyline", [])}


def update_storyline(novel_id: str, storyline: List[Dict[str, Any]], narrative_type: str = None) -> Dict[str, Any]:
    """Tool 9: Set or edit timeline/storyline events."""
    story_data = read_json_file(novel_id, "storyline.json", {"narrative_type": "chronological", "storyline": []})
    
    if narrative_type:
        story_data["narrative_type"] = narrative_type
        
    # Overwrite/Update storyline nodes
    story_data["storyline"] = storyline
    
    write_json_file(novel_id, "storyline.json", story_data)
    # Sync compiling to plot_arcs.txt
    sync_storyline_and_events_to_txt(novel_id)
    
    return {"status": "success", "message": f"Storyline updated successfully with {len(storyline)} points.", "narrative_type": story_data["narrative_type"]}


def modify_chapter_text(novel_id: str, chapter_num: str, instruction: str, llm_selector: str = None) -> Dict[str, Any]:
    """Tool 10: Call independent LLM API to modify/polish/rewrite a chapter based on an instruction."""
    ndir = get_novel_dir(novel_id)
    fpath = os.path.join(ndir, f"chapter_{chapter_num}.txt")
    if not os.path.exists(fpath):
        return {"status": "error", "message": f"Chapter {chapter_num} file does not exist. Cannot modify."}
        
    try:
        with open(fpath, "r", encoding="utf-8") as f:
            original_content = f.read()
            
        from backend.llm_service import LLMService
        service = LLMService()
        
        # Build specialized system/user prompt for the editing LLM call
        system_prompt = (
            "You are a professional novel editor and senior web-novel writer.\n"
            "Your task is to revise, polish, or rewrite the provided chapter content based on the user's instructions.\n\n"
            "CRITICAL RULES:\n"
            "1. You MUST output ONLY the final modified chapter text. Do NOT include any introductory remarks, conversation, greetings, explanation, or markdown code blocks.\n"
            "2. The entire output must be the raw, clean, updated chapter content, ready to be saved directly to the file.\n"
            "3. Maintain original plot points, character names, and writing style unless the instructions explicitly ask to change them."
        )
        
        user_prompt = (
            f"Here is the detailed instruction for modification:\n"
            f"\"\"\"\n{instruction}\n\"\"\"\n\n"
            f"Original Chapter {chapter_num} Content:\n"
            f"\"\"\"\n{original_content}\n\"\"\""
        )
        
        # Combine into a single prompt string since LLMService takes a string
        combined_prompt = f"{system_prompt}\n\nUser:\n{user_prompt}\n\nAssistant:\n"
        
        # Make the independent API call
        modified_content = service.call(combined_prompt, selector=llm_selector if llm_selector else None)
        
        if not modified_content:
            return {"status": "error", "message": "The independent LLM returned empty content."}
            
        modified_content = modified_content.strip()
        
        # Optional: Strip markdown code block wrappers if the LLM ignored the rule
        if modified_content.startswith("```"):
            lines = modified_content.splitlines()
            if lines[0].startswith("```"):
                lines = lines[1:]
            if lines and lines[-1].startswith("```"):
                lines = lines[:-1]
            modified_content = "\n".join(lines).strip()
            
        # Overwrite the file with modified content
        with open(fpath, "w", encoding="utf-8") as f:
            f.write(modified_content)
            
        orig_word_count = len(original_content)
        new_word_count = len(modified_content)
        
        return {
            "status": "success",
            "message": f"Chapter {chapter_num} has been successfully modified by the independent LLM.",
            "chapter_num": chapter_num,
            "original_character_count": orig_word_count,
            "new_character_count": new_word_count,
            "diff_character_count": new_word_count - orig_word_count
        }
    except Exception as e:
        return {"status": "error", "message": f"Failed during independent LLM modification: {str(e)}"}


# ============== Tool Execution Dispatcher ==============

def execute_tool(novel_id: str, tool_name: str, arguments: Dict[str, Any]) -> Dict[str, Any]:
    """Execute any of the designed tool components on behalf of the LLM call."""
    try:
        if tool_name == "set_novel_metadata":
            return set_novel_metadata(
                novel_id=novel_id,
                title=arguments.get("title"),
                genre=arguments.get("genre"),
                description=arguments.get("description"),
                num_chapters=arguments.get("num_chapters"),
                word_number=arguments.get("word_number")
            )
        elif tool_name == "get_chapter_content":
            return get_chapter_content(
                novel_id=novel_id,
                chapter_num=str(arguments.get("chapter_num")),
                start_line=arguments.get("start_line"),
                end_line=arguments.get("end_line")
            )
        elif tool_name == "write_chapter_content":
            return write_chapter_content(
                novel_id=novel_id,
                chapter_num=str(arguments.get("chapter_num")),
                content=arguments.get("content"),
                mode=arguments.get("mode", "overwrite")
            )
        elif tool_name == "modify_chapter_text":
            return modify_chapter_text(
                novel_id=novel_id,
                chapter_num=str(arguments.get("chapter_num")),
                instruction=arguments.get("instruction"),
                llm_selector=arguments.get("llm_selector")
            )
        elif tool_name == "query_characters":
            return query_characters(
                novel_id=novel_id,
                character_name=arguments.get("character_name")
            )
        elif tool_name == "update_characters":
            return update_characters(
                novel_id=novel_id,
                action=arguments.get("action"),
                characters_list=arguments.get("characters_list", [])
            )
        elif tool_name == "query_events":
            return query_events(
                novel_id=novel_id,
                event_name=arguments.get("event_name")
            )
        elif tool_name == "update_events":
            return update_events(
                novel_id=novel_id,
                action=arguments.get("action"),
                events_list=arguments.get("events_list", [])
            )
        elif tool_name == "query_storyline":
            return query_storyline(novel_id=novel_id)
        elif tool_name == "update_storyline":
            return update_storyline(
                novel_id=novel_id,
                storyline=arguments.get("storyline", []),
                narrative_type=arguments.get("narrative_type")
            )
        else:
            return {"status": "error", "message": f"Unknown tool component '{tool_name}'."}
    except Exception as e:
        return {"status": "error", "message": f"Tool execution failed: {str(e)}"}


# ============== Tool Definitions in OpenAPI Format ==============

TOOL_SCHEMAS = [
    {
        "type": "function",
        "function": {
            "name": "set_novel_metadata",
            "description": "Set or update the basic metadata of the novel (title, genre, description, total chapters, etc.)",
            "parameters": {
                "type": "object",
                "properties": {
                    "title": {"type": "string", "description": "The title of the novel."},
                    "genre": {"type": "string", "description": "The genre of the novel (e.g., Science Fiction, Fantasy, Romance)."},
                    "description": {"type": "string", "description": "A brief synopsis or description of the novel."},
                    "num_chapters": {"type": "integer", "description": "Total number of chapters planned."},
                    "word_number": {"type": "integer", "description": "Expected target word count per chapter."}
                },
                "required": ["title"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "modify_chapter_text",
            "description": "Call an independent LLM API to edit, rewrite, or polish a specific chapter's text based on detailed revision instructions. This avoids context bloat in the main chat history.",
            "parameters": {
                "type": "object",
                "properties": {
                    "chapter_num": {"type": "string", "description": "The chapter number to modify (e.g., '1', '2')."},
                    "instruction": {"type": "string", "description": "Detailed instructions on how to edit/polish/rewrite the chapter (e.g., 'Make the emotional dialogue more intense', 'Smooth out the fight scene transition')."},
                    "llm_selector": {"type": "string", "description": "Optional model selector. If omitted, uses the default model."}
                },
                "required": ["chapter_num", "instruction"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_chapter_content",
            "description": "Query the text content of a specific chapter, with optional line slicing parameters.",
            "parameters": {
                "type": "object",
                "properties": {
                    "chapter_num": {"type": "string", "description": "The chapter number (e.g., '1', '2')."},
                    "start_line": {"type": "integer", "description": "Optional starting line number to read (1-indexed)."},
                    "end_line": {"type": "integer", "description": "Optional ending line number to read (1-indexed)."}
                },
                "required": ["chapter_num"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "write_chapter_content",
            "description": "Write, overwrite, or append text content for a specific chapter.",
            "parameters": {
                "type": "object",
                "properties": {
                    "chapter_num": {"type": "string", "description": "The chapter number (e.g., '1', '2')."},
                    "content": {"type": "string", "description": "The text content to write or append."},
                    "mode": {
                        "type": "string",
                        "enum": ["overwrite", "append"],
                        "description": "Write mode. 'overwrite' replaces the whole file; 'append' adds content to the end of the file."
                    }
                },
                "required": ["chapter_num", "content", "mode"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "query_characters",
            "description": "Query all characters, their identities, physical appearance, personality, and associated events.",
            "parameters": {
                "type": "object",
                "properties": {
                    "character_name": {"type": "string", "description": "Optional name of a specific character to look up. If omitted, returns all characters."}
                }
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "update_characters",
            "description": "Add, modify, or delete characters in the novel's settings.",
            "parameters": {
                "type": "object",
                "properties": {
                    "action": {
                        "type": "string",
                        "enum": ["add", "edit", "delete"],
                        "description": "The operation to perform."
                    },
                    "characters_list": {
                        "type": "array",
                        "description": "The list of characters to add/edit/delete.",
                        "items": {
                            "type": "object",
                            "properties": {
                                "name": {"type": "string", "description": "The character's unique name (key)."},
                                "identity": {"type": "string", "description": "Identity, role, or background."},
                                "appearance": {"type": "string", "description": "Visual appearance, age, gender, etc."},
                                "personality": {"type": "string", "description": "Personality traits, strengths, and weaknesses."},
                                "related_events": {
                                    "type": "array",
                                    "items": {"type": "string"},
                                    "description": "List of event names this character is involved in."
                                }
                            },
                            "required": ["name"]
                        }
                    }
                },
                "required": ["action", "characters_list"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "query_events",
            "description": "Query all major events planned or recorded in the novel.",
            "parameters": {
                "type": "object",
                "properties": {
                    "event_name": {"type": "string", "description": "Optional name of a specific event to look up. If omitted, returns all events."}
                }
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "update_events",
            "description": "Add, modify, or delete event settings in the novel.",
            "parameters": {
                "type": "object",
                "properties": {
                    "action": {
                        "type": "string",
                        "enum": ["add", "edit", "delete"],
                        "description": "The operation to perform."
                    },
                    "events_list": {
                        "type": "array",
                        "description": "The list of events to process.",
                        "items": {
                            "type": "object",
                            "properties": {
                                "name": {"type": "string", "description": "The unique name of the event."},
                                "description": {"type": "string", "description": "Detailed description of what happens in this event."},
                                "characters_involved": {
                                    "type": "array",
                                    "items": {"type": "string"},
                                    "description": "List of character names involved."
                                },
                                "location": {"type": "string", "description": "Where the event takes place."},
                                "consequences": {"type": "string", "description": "The outcome or impact of this event on the plot."}
                            },
                            "required": ["name"]
                        }
                    }
                },
                "required": ["action", "events_list"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "query_storyline",
            "description": "Query the timeline storyline and narrative structure (chronological, parallel, flashback, etc.) of events in the novel.",
            "parameters": {
                "type": "object",
                "properties": {}
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "update_storyline",
            "description": "Set, edit, or append storyline events to structure the plot chronology (sequential line, parallel lines, flashback lines etc.).",
            "parameters": {
                "type": "object",
                "properties": {
                    "narrative_type": {
                        "type": "string",
                        "enum": ["chronological", "parallel", "flashback", "interwoven"],
                        "description": "The narrative structure of the story (e.g., chronological chronological/顺叙, parallel parallel/并叙, flashback flashback/倒叙, interwoven interwoven/插叙交织)."
                    },
                    "storyline": {
                        "type": "array",
                        "description": "Ordered list of storyline timeline nodes.",
                        "items": {
                            "type": "object",
                            "properties": {
                                "sequence": {"type": "integer", "description": "The order/sequence index of this timeline node (1-indexed)."},
                                "event_name": {"type": "string", "description": "Name of the associated event."},
                                "chapter": {"type": "string", "description": "Which chapter this node/event corresponds to."},
                                "description": {"type": "string", "description": "Brief narrative description for this timeline point."}
                            },
                            "required": ["sequence", "event_name"]
                        }
                    }
                },
                "required": ["storyline"]
            }
        }
    }
]


# ============== System prompt blocks instructing the LLM ==============

SYSTEM_TOOL_INSTRUCTIONS = """
# LLM Function Calling & Tool Use Guide

You are equipped with professional tool suites to manage, edit, and query the novel's structural settings and chapter text files. Whenever the user requests structural modifications (such as modifying character settings, structuring plot storylines, editing events, or retrieving text), you MUST call the appropriate tool.

## Tool Usage Constraints:
1. Always Query Before Updating: If the user asks you to modify a character, event, or storyline, first call `query_characters`/`query_events`/`query_storyline` to understand the current state before applying edits.
2. Maintain Consistency: Ensure any added character or event is reflected in the corresponding narrative storyline.
3. Keep Text Synced: When editing chapters via `write_chapter_content`, you can append or overwrite.
"""
