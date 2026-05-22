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
}

export interface AppConfig {
  last_interface_format: string;
  last_embedding_interface_format: string;
  llm_configs: Record<string, LLMConfig>;
  embedding_configs: Record<string, EmbeddingConfig>;
  other_params: OtherParams;
  choose_configs: ChooseConfigs;
  proxy_setting: ProxySetting;
  webdav_config: WebDAVConfig;
}

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

export interface Role {
  name: string;
  category: string;
  content: string;
  attributes: Record<string, string[]>;
}

export interface Category {
  name: string;
  roles: Role[];
}

export interface GenerationTask {
  id: string;
  type: 'architecture' | 'blueprint' | 'draft' | 'finalize' | 'batch' | 'consistency' | 'knowledge' | 'clear_vectorstore';
  status: 'pending' | 'running' | 'success' | 'error';
  message: string;
  progress?: number;
  createdAt: number;
}
