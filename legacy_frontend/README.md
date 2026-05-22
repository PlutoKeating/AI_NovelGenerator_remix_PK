# Frontend

The frontend is a `customtkinter` GUI for the AI Novel Generator.

## Files

- `main.py` — Entry point. Launches the GUI.
- `config_manager.py` — Configuration management (`config.json`), LLM/embedding config testing.
- `tooltips.py` — Tooltip strings for UI parameters.
- `ui/` — All GUI modules.

## UI Modules

| Module | Purpose |
|--------|---------|
| `main_window.py` | Main `NovelGeneratorGUI` class, initializes tabs and variables |
| `generation_handlers.py` | Threaded handlers for generation steps |
| `main_tab.py` | Main Functions tab layout |
| `config_tab.py` | LLM / Embedding / Config choose / Proxy tabs |
| `novel_params_tab.py` | Novel parameter inputs |
| `other_settings.py` | WebDAV settings |
| `chapters_tab.py` | Chapter list & editor |
| `setting_tab.py` | Novel Architecture editor |
| `directory_tab.py` | Chapter Blueprint editor |
| `character_tab.py` | Character State editor |
| `summary_tab.py` | Global Summary editor |
| `role_library.py` | Character library manager |
| `context_menu.py` | Right-click context menu |
| `helpers.py` | Minimal error logging helper |

## Running

```bash
python frontend/main.py
```
