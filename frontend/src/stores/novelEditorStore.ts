import { create } from "zustand";
import api from "../lib/api";
import { createStreamState, parseAgentChunk, buildMergedContent } from "../lib/ai-stream";
import type { NovelMetadata, NovelInfo, ChapterMetadata, ChatMessage, AppConfig } from "../types";
import { toast } from "../components/ui/Toast";

interface NovelEditorState {
  currentNovel: NovelMetadata | null;
  info: NovelInfo;
  chapters: ChapterMetadata[];
  selectedChapters: string[];
  currentChapterNum: string;
  currentChapterContent: string;
  aiDialogOpen: boolean;
  aiDialogContext: "background" | "characters" | "chapter" | null;
  aiMessages: ChatMessage[];
  aiContextHistory: Record<string, ChatMessage[]>;
  aiUseAgent: boolean;
  loading: boolean;
  error: string | null;

  loadNovelDetail: (id: string) => Promise<void>;
  saveInfo: () => Promise<void>;
  generateFullText: () => Promise<void>;
  selectChapter: (num: string, toggle: boolean) => void;
  loadChapter: (num: string) => Promise<void>;
  saveChapter: (num: string, content: string) => Promise<void>;
  updateInfo: (partial: Partial<NovelInfo>) => void;
  openAIDialog: (context: "background" | "characters" | "chapter") => void;
  closeAIDialog: () => void;
  setAIUseAgent: (value: boolean) => void;
  sendAIMessage: (text: string, selector?: string) => Promise<void>;
  polishText: (text: string, instruction?: string, selector?: string) => Promise<string>;
}

export const useNovelEditorStore = create<NovelEditorState>((set, get) => ({
  currentNovel: null,
  info: {
    background: "",
    characters: "",
    user_guidance: "",
    key_items: "",
    scene_location: "",
    time_constraint: "",
  },
  chapters: [],
  selectedChapters: [],
  currentChapterNum: "1",
  currentChapterContent: "",
  aiDialogOpen: false,
  aiDialogContext: null,
  aiMessages: [],
  aiContextHistory: {},
  aiUseAgent: false,
  loading: false,
  error: null,

  loadNovelDetail: async (id) => {
    set({ loading: true, error: null });
    try {
      const [metaRes, infoRes, chaptersRes] = await Promise.all([
        api.get<NovelMetadata>(`/novels/${id}`),
        api.get<NovelInfo>(`/novels/${id}/info`),
        api.get<ChapterMetadata[]>("/chapters", { params: { novel_path: id } }),
      ]);
      set({
        currentNovel: metaRes.data,
        info: infoRes.data,
        chapters: chaptersRes.data,
        currentChapterNum: chaptersRes.data[0]?.number || "1",
        currentChapterContent: "",
        loading: false,
      });
    } catch (e: any) {
      set({ error: e.message, loading: false });
      toast({ title: "加载小说详情失败", description: e.message, variant: "destructive" });
    }
  },

  saveInfo: async () => {
    const { currentNovel, info } = get();
    if (!currentNovel) return;
    set({ loading: true });
    try {
      await api.post(`/novels/${currentNovel.id}/info`, info);
      toast({ title: "保存成功", description: "小说设定已更新" });
    } catch (e: any) {
      toast({ title: "保存失败", description: e.message, variant: "destructive" });
    } finally {
      set({ loading: false });
    }
  },

  generateFullText: async () => {
    const { currentNovel, info, chapters } = get();
    if (!currentNovel) return;
    set({ loading: true, error: null });
    try {
      const configRes = await api.get<AppConfig>("/config");
      const config = configRes.data;
      const wordNumber = config?.other_params?.word_number || 3000;

      await api.post("/generate/batch", {
        novel_path: currentNovel.id,
        chapter_num: 1,
        topic: currentNovel.title,
        genre: currentNovel.genre,
        num_chapters: currentNovel.num_chapters,
        word_number: wordNumber,
        user_guidance: info.user_guidance,
        characters_involved: info.characters,
        key_items: info.key_items,
        scene_location: info.scene_location,
        time_constraint: info.time_constraint,
        llm_config_name: config?.choose_configs?.prompt_draft_llm || "",
        embedding_config_name: Object.keys(config?.embedding_configs || {})[0] || "",
        start_chapter: 1,
        end_chapter: currentNovel.num_chapters || chapters.length || 1,
        expected_word_count: wordNumber,
        min_word_count: Math.floor(wordNumber * 0.7),
        auto_enrich: false,
      });

      toast({ title: "生成完成", description: "全文生成任务已完成" });
      await get().loadNovelDetail(currentNovel.id);
    } catch (e: any) {
      const msg = e.response?.data?.detail || e.message || "生成失败";
      set({ error: msg, loading: false });
      toast({ title: "生成失败", description: msg, variant: "destructive" });
    } finally {
      set({ loading: false });
    }
  },

  selectChapter: (num, toggle) => {
    set((state) => {
      if (toggle) {
        const exists = state.selectedChapters.includes(num);
        return {
          selectedChapters: exists
            ? state.selectedChapters.filter((n) => n !== num)
            : [...state.selectedChapters, num],
        };
      }
      return {
        selectedChapters: state.selectedChapters.includes(num) ? state.selectedChapters : [num],
        currentChapterNum: num,
      };
    });
  },

  loadChapter: async (num) => {
    const { currentNovel } = get();
    if (!currentNovel) return;
    try {
      const res = await api.get<string>(`/files/chapters/${num}`, { params: { novel_path: currentNovel.id } });
      set({ currentChapterNum: num, currentChapterContent: res.data || "" });
    } catch {
      set({ currentChapterNum: num, currentChapterContent: "" });
    }
  },

  saveChapter: async (num, content) => {
    const { currentNovel } = get();
    if (!currentNovel) return;
    await api.put(`/files/chapters/${num}`, { novel_path: currentNovel.id, content });
    set({ currentChapterContent: content });
    toast({ title: "保存成功", description: `第${num}章已保存` });
  },

  updateInfo: (partial) => {
    set((state) => ({
      info: { ...state.info, ...partial },
    }));
  },

  openAIDialog: (context) => {
    const { aiContextHistory } = get();
    set({
      aiDialogOpen: true,
      aiDialogContext: context,
      aiMessages: aiContextHistory[context] || [],
    });
  },

  closeAIDialog: () => {
    set({ aiDialogOpen: false, aiDialogContext: null });
  },

  setAIUseAgent: (value) => set({ aiUseAgent: value }),

  sendAIMessage: async (text, selector) => {
    const { currentNovel, aiMessages, aiDialogContext, aiContextHistory, currentChapterNum, aiUseAgent } = get();
    if (!currentNovel || !aiDialogContext) return;
    const newMessages: ChatMessage[] = [...aiMessages, { role: "user", content: text }];

    const assistantMsgIndex = newMessages.length;
    const updatedMessages: ChatMessage[] = [
      ...newMessages,
      { role: "assistant" as const, content: "", isAgent: aiUseAgent, agentSteps: aiUseAgent ? [] : undefined },
    ];

    set({
      aiMessages: updatedMessages,
      aiContextHistory: {
        ...aiContextHistory,
        [aiDialogContext]: updatedMessages,
      },
      loading: true,
    });

    try {
      const baseURL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api";
      const response = await fetch(`${baseURL}/ai/chat/stream`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          novel_id: currentNovel.id,
          context_type: aiDialogContext,
          messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
          llm_selector: selector || "",
          chapter_num: currentChapterNum,
          use_agent: aiUseAgent,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `HTTP error ${response.status}`);
      }

      if (!response.body) {
        throw new Error("ReadableStream not supported on response");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");

      set({ loading: false });

      if (aiUseAgent) {
        const streamState = createStreamState();
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          const { dirty } = parseAgentChunk(streamState, chunk);
          if (dirty) {
            const currentMessages = [...get().aiMessages];
            if (currentMessages[assistantMsgIndex]) {
              currentMessages[assistantMsgIndex].content = buildMergedContent(streamState);
              currentMessages[assistantMsgIndex].isAgent = true;
              currentMessages[assistantMsgIndex].agentSteps = [...streamState.stepsList];
              set({
                aiMessages: currentMessages,
                aiContextHistory: {
                  ...get().aiContextHistory,
                  [aiDialogContext]: currentMessages,
                },
              });
            }
          }
        }
      } else {
        let accumulatedContent = "";
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          accumulatedContent += chunk;
          const currentMessages = [...get().aiMessages];
          if (currentMessages[assistantMsgIndex]) {
            currentMessages[assistantMsgIndex].content = accumulatedContent;
            currentMessages[assistantMsgIndex].isAgent = false;
            set({
              aiMessages: currentMessages,
              aiContextHistory: {
                ...get().aiContextHistory,
                [aiDialogContext]: currentMessages,
              },
            });
          }
        }
      }
    } catch (e: any) {
      const errMsg = e.message || "请求失败";
      toast({
        title: "AI 对话失败",
        description: errMsg,
        variant: "destructive",
      });

      const currentMessages = [...get().aiMessages];
      const accumulated = currentMessages[assistantMsgIndex]?.content || "";
      const separator = accumulated ? "\n\n" : "";

      if (currentMessages[assistantMsgIndex]) {
        currentMessages[assistantMsgIndex].content = `${accumulated}${separator}❌ 错误: ${errMsg}`;
        set({
          aiMessages: currentMessages,
          aiContextHistory: {
            ...get().aiContextHistory,
            [aiDialogContext]: currentMessages,
          },
          error: errMsg,
          loading: false,
        });
      }
    }
  },

  polishText: async (text, instruction, selector) => {
    try {
      const res = await api.post("/ai/polish", {
        text,
        instruction: instruction || "",
        llm_selector: selector || "",
      });
      return res.data.polished || text;
    } catch (e: any) {
      const errMsg = e.response?.data?.detail || e.message || "请求失败";
      toast({
        title: "润色失败",
        description: errMsg,
        variant: "destructive",
      });
      return text;
    }
  },
}));
