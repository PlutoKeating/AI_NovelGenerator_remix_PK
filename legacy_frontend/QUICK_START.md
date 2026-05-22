# Frontend Quick Start

## Running the GUI

```bash
python frontend/main.py
```

## Configuration

1. Open the **LLM Model settings** tab.
2. Add a new config or edit an existing one.
3. Fill in API Key, Base URL, Model Name, Temperature, Max Tokens, Timeout.
4. Click **保存** to persist.
5. Switch to the **Embedding settings** tab and configure your embedding model.
6. In **Config choose**, select which model to use for each pipeline stage.

## Generating a Novel

1. Go to the **Main Functions** tab.
2. Set the save path (浏览...).
3. Fill in Topic, Genre, Number of chapters, Word count.
4. Click **Step 1. 生成架构**.
5. Click **Step 2. 生成目录**.
6. Set the chapter number and click **Step 3. 生成草稿**.
7. Edit the draft in the left panel.
8. Click **Step 4. 定稿章节**.

## Other Features

- **一致性审校**: Check chapter consistency against setting/character state.
- **导入知识库**: Import a text file into the vector store.
- **清空向量库**: Clear all vector store data.
- **角色库**: Manage character files.
- **批量生成**: Generate multiple chapters automatically.
