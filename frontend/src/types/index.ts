export interface LLMConfig {
  api_key: string;
  base_url: string;
  model_name: string;
  temperature: number;
  max_tokens: number;
  timeout: number;
  interface_format: string;
}

export interface EmbeddingConfig {
  api_key: string;
  base_url: string;
  model_name: string;
  retrieval_k: number;
  interface_format: string;
}

// --- New hierarchical provider config types ---

export interface ModelConfig {
  model_name: string;
  temperature: number;
  max_tokens: number;
}

export interface KeyConfig {
  api_key: string;
  models: ModelConfig[];
}

export interface ProviderConfig {
  provider_name: string;
  interface_format: string;
  base_url: string;
  timeout: number;
  keys: KeyConfig[];
  models: ModelConfig[];
}

// --- Legacy types (kept for compat) ---

export interface OtherParams {
  topic: string;
  genre: string;
  num_chapters: number;
  word_number: number;
  filepath: string;
  chapter_num: string;
  user_guidance: string;
  characters_involved: string;
  key_items: string;
  scene_location: string;
  time_constraint: string;
}

export interface ChooseConfigs {
  architecture_llm: string;
  chapter_outline_llm: string;
  prompt_draft_llm: string;
  final_chapter_llm: string;
  consistency_review_llm: string;
}

export interface ProxySetting {
  proxy_url: string;
  proxy_port: string;
  enabled: boolean;
}

export interface WebDAVConfig {
  webdav_url: string;
  webdav_username: string;
  webdav_password: string;
  enabled?: boolean;
  url?: string;
  username?: string;
  password?: string;
  remote_path?: string;
  sync_interval?: number;
}

export interface AppConfig {
  last_interface_format: string;
  last_embedding_interface_format: string;
  providers: ProviderConfig[];
  llm_configs: Record<string, LLMConfig>;
  embedding_configs: Record<string, EmbeddingConfig>;
  other_params: OtherParams;
  choose_configs: ChooseConfigs;
  proxy_setting: ProxySetting;
  webdav_config: WebDAVConfig;
}

// --- Novel metadata types ---

export interface NovelMetadata {
  id: string;
  title: string;
  genre: string;
  num_chapters: number;
  word_count: number;
  created_at: string;
  updated_at: string;
  cover_path?: string;
  status: string;
  description: string;
  background: string;
  characters: string;
}

export interface NovelInfo {
  background: string;
  characters: string;
  user_guidance: string;
  key_items: string;
  scene_location: string;
  time_constraint: string;
}

// --- Chat types ---

export interface AgentStep {
  id: string;
  type: "status" | "think" | "content" | "tool_start" | "tool_end";
  message?: string;
  content?: string;
  tool?: string;
  arguments?: any;
  result?: any;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  isAgent?: boolean;
  agentSteps?: AgentStep[];
}

// --- Existing types ---

export interface ChapterInfo {
  chapter_number: number;
  chapter_title: string;
  chapter_role: string;
  chapter_purpose: string;
  suspense_level: string;
  foreshadowing: string;
  plot_twist_level: string;
  chapter_summary: string;
}

export interface ChapterMetadata {
  number: string;
  title: string;
  role: string;
  purpose: string;
  suspenseLevel: string;
  foreshadowing: string;
  plotTwistLevel: string;
  summary: string;
  wordCount: number;
}

export interface Role {
  name: string;
  category?: string;
  content?: string;
  attributes?: Record<string, string[]>;
  description?: string;
  character_arc?: string;
  relationships?: string;
}

export interface Category {
  name: string;
  roles: Role[];
}

export interface RoleCategory {
  name: string;
  roles: Role[];
}

export type TaskType = "architecture" | "blueprint" | "draft" | "finalize" | "enrich" | "batch" | "consistency" | "knowledge" | "clear_vectorstore";

export type PipelineStatus = "idle" | "running" | "error" | "completed";

export interface GenerationTask {
  id: string;
  type: TaskType;
  status: "pending" | "running" | "succeeded" | "failed" | "cancelled";
  message: string;
  progress?: number;
  createdAt: number;
  startedAt?: number;
  finishedAt?: number;
  error?: string;
  result?: any;
  payload?: Record<string, any>;
}

export interface LogEntry {
  id: string;
  time: string;
  message: string;
  level: "info" | "success" | "error" | "warning";
}
