import React from "react";
import { Dialog, DialogHeader, DialogTitle } from "./ui/Dialog";
import { Button } from "./ui/Button";
import { Textarea } from "./ui/Textarea";
import { Send, Check, Sparkles, X, Brain, Wrench, Loader2 } from "lucide-react";
import type { ChatMessage } from "../types";
import { designSystem } from "../designSystem";

interface AIDialogModalProps {
  open: boolean;
  context: "background" | "characters" | "chapter" | null;
  messages: ChatMessage[];
  useAgent: boolean;
  onUseAgentChange: (val: boolean) => void;
  onClose: () => void;
  onSend: (text: string, selector?: string) => Promise<void>;
  onApply: (text: string) => void;
}

const contextTitles: Record<string, string> = {
  background: "AI 润色 / 生成背景环境",
  characters: "AI 润色 / 生成人物角色",
  chapter: "AI 修改章节内容",
};

const AIDialogModal: React.FC<AIDialogModalProps> = ({
  open,
  context,
  messages,
  useAgent,
  onUseAgentChange,
  onClose,
  onSend,
  onApply,
}) => {
  const [input, setInput] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || sending) return;
    const text = input.trim();
    setInput("");
    setSending(true);
    await onSend(text);
    setSending(false);
  };

  const lastAssistantMessage = messages.filter((m) => m.role === "assistant").pop();

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <div className="flex flex-col h-[550px]">
        <DialogHeader className="border-b border-fuchsia-950/60 pb-3 mb-2 flex flex-row items-center justify-between space-y-0">
          <DialogTitle className="flex items-center gap-2 text-sm">
            <Sparkles size={16} className="text-pink-500 animate-pulse filter drop-shadow-[0_0_4px_rgba(236,72,153,0.5)]" />
            {context ? contextTitles[context] || "AI 助手" : "AI 助手"}
          </DialogTitle>
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0 text-zinc-400 hover:text-pink-500 rounded-full transition-colors flex items-center justify-center"
            onClick={onClose}
          >
            <X size={16} />
          </Button>
        </DialogHeader>

        {/* Messages */}
        <div ref={scrollRef} className={`${designSystem.aiModal.messagesContainer} flex-1 overflow-y-auto pr-1`}>
          {messages.length === 0 && (
            <div className={designSystem.aiModal.emptyStateText}>
              <Sparkles size={24} className={designSystem.aiModal.emptyStateIcon} />
              <p className="font-semibold text-zinc-400">开始多轮对话，让 AI 帮你完善内容</p>
              <p className="mt-1 font-mono text-zinc-500">你可以说："帮我扩写背景设定"、"增加几个反派角色"等</p>
            </div>
          )}
          {messages.map((msg, idx) => {
            const isUser = msg.role === "user";
            
            // Skip rendering empty messages from assistant if they have no content yet
            if (!isUser && !msg.content) {
              return null;
            }

            const thinkStart = msg.content.indexOf("<think>");
            const thinkEnd = msg.content.indexOf("</think>");
            
            let thinkingContent = "";
            let formalContent = msg.content;
            let isThinkingCompleted = false;

            // Extract <think> content dynamically
            if (!isUser && thinkStart !== -1) {
              if (thinkEnd !== -1) {
                thinkingContent = msg.content.substring(thinkStart + 7, thinkEnd).trim();
                formalContent = msg.content.substring(thinkEnd + 8).trim();
                isThinkingCompleted = true;
              } else {
                thinkingContent = msg.content.substring(thinkStart + 7).trim();
                formalContent = "";
              }
            } else if (!isUser) {
              // Avoid rendering partial tags flickering
              const partialTags = ["<", "<t", "<th", "<thi", "<thin", "<think"];
              for (const tag of partialTags) {
                if (msg.content.endsWith(tag)) {
                  formalContent = msg.content.substring(0, msg.content.length - tag.length);
                  break;
                }
              }
            }

            return (
              <div
                key={idx}
                className={`flex ${isUser ? "justify-end" : "justify-start"} w-full mb-3`}
              >
                <div
                  className={
                    isUser
                      ? designSystem.aiModal.messageUser
                      : `${designSystem.aiModal.messageAssistant} max-w-[85%] border border-fuchsia-950/20 shadow-md`
                  }
                >
                  {/* Agent workflow details */}
                  {msg.isAgent && msg.agentSteps && msg.agentSteps.length > 0 ? (
                    <div className="flex flex-col gap-2 mt-1 mb-3 font-mono text-[11px] border-b border-zinc-800/40 pb-2.5">
                      {msg.agentSteps.map((step, sIdx) => {
                        if (step.type === "status") {
                          return (
                            <div key={step.id || sIdx} className="flex items-start gap-2 text-zinc-400">
                              <span className="h-4 w-4 rounded-full bg-zinc-800/80 border border-zinc-700 flex items-center justify-center text-[9px] text-zinc-500 animate-pulse">
                                ●
                              </span>
                              <div className="flex-1 whitespace-pre-wrap">{step.message}</div>
                            </div>
                          );
                        }
                        
                        if (step.type === "think") {
                          const isCompleted = msg.agentSteps!.slice(sIdx + 1).some(s => s.type !== "think");
                          return (
                            <div key={step.id || sIdx} className="p-2.5 bg-zinc-950/60 border border-cyan-500/10 rounded text-zinc-300 font-mono">
                              <div className="flex items-center gap-1.5 text-cyan-400/90 mb-1 font-semibold border-b border-cyan-950/40 pb-1">
                                <Brain size={12} className={isCompleted ? "" : "animate-pulse"} />
                                <span>{isCompleted ? "Agent 决策思考路径" : "Agent 决策思考中..."}</span>
                              </div>
                              <div className="whitespace-pre-wrap leading-relaxed opacity-85 pl-1.5 max-h-[150px] overflow-y-auto scrollbar-thin">
                                {step.content}
                              </div>
                            </div>
                          );
                        }

                        if (step.type === "tool_start" || step.type === "tool_end") {
                          const isCompleted = step.type === "tool_end";
                          return (
                            <div key={step.id || sIdx} className="p-2.5 rounded border border-fuchsia-950/30 bg-fuchsia-950/10 text-fuchsia-300">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  {isCompleted ? (
                                    <span className="h-4 w-4 rounded-full bg-green-950/40 border border-green-500/40 flex items-center justify-center text-[10px] text-green-400 font-bold">
                                      ✓
                                    </span>
                                  ) : (
                                    <span className="h-4 w-4 rounded-full bg-pink-950/40 border border-pink-500/40 flex items-center justify-center text-[10px] text-pink-400 animate-spin">
                                      <Wrench size={10} />
                                    </span>
                                  )}
                                  <span className="font-semibold text-[11px]">
                                    {isCompleted ? `工具 [${step.tool}] 执行完毕` : `正在调用工具 [${step.tool}]...`}
                                  </span>
                                </div>
                              </div>
                              {step.arguments && (
                                <details className="mt-1.5 text-[10px] text-zinc-500 cursor-pointer">
                                  <summary className="hover:text-zinc-400 select-none font-semibold">🔍 查看调用参数</summary>
                                  <pre className="mt-1 p-2 bg-black/50 rounded text-[9px] overflow-x-auto whitespace-pre-wrap text-zinc-300 border border-zinc-800/40">
                                    {JSON.stringify(step.arguments, null, 2)}
                                  </pre>
                                </details>
                              )}
                              {isCompleted && step.result && (
                                <details className="mt-1.5 text-[10px] text-zinc-500 cursor-pointer">
                                  <summary className="hover:text-zinc-400 select-none font-semibold">📦 查看执行结果</summary>
                                  <pre className="mt-1 p-2 bg-black/50 rounded text-[9px] overflow-x-auto whitespace-pre-wrap text-emerald-400/90 border border-zinc-800/40">
                                    {JSON.stringify(step.result, null, 2)}
                                  </pre>
                                </details>
                              )}
                            </div>
                          );
                        }

                        return null;
                      })}
                    </div>
                  ) : null}

                  {/* Standard non-agent thinking process */}
                  {thinkingContent && !msg.isAgent && (
                    <div className="mb-2.5 p-2.5 bg-zinc-950/50 border border-cyan-500/20 rounded text-[10px] md:text-xs text-zinc-400 font-mono">
                      <div className="flex items-center gap-1.5 text-cyan-400/80 mb-1.5 font-semibold border-b border-cyan-950/40 pb-1">
                        <span className={`h-1.5 w-1.5 rounded-full bg-cyan-400 ${isThinkingCompleted ? "" : "animate-pulse"}`} />
                        {isThinkingCompleted ? "思考过程" : "深度思考中..."}
                      </div>
                      <div className="whitespace-pre-wrap leading-relaxed select-text font-mono opacity-80">{thinkingContent}</div>
                    </div>
                  )}

                  {/* Final reply content */}
                  {formalContent && (
                    <div className="whitespace-pre-wrap leading-relaxed select-text text-zinc-200">
                      {formalContent}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          {sending && (
            <div className="flex justify-start">
              <div className={designSystem.aiModal.thinkingText}>
                <Loader2 size={12} className="animate-spin text-pink-500" />
                <span>AI 正在全力推理并准备中...</span>
              </div>
            </div>
          )}
        </div>

        {/* Input & Options */}
        <div className={designSystem.aiModal.footerActions}>
          {/* Agent Mode Toggle */}
          <div className="flex items-center gap-2 mb-2 select-none px-1">
            <label className="flex items-center gap-1.5 cursor-pointer text-xs text-zinc-400 hover:text-pink-400 transition-colors">
              <input
                type="checkbox"
                className="rounded border-zinc-700 bg-zinc-900 text-pink-500 focus:ring-pink-500/50 w-3.5 h-3.5 cursor-pointer"
                checked={useAgent}
                onChange={(e) => onUseAgentChange(e.target.checked)}
              />
              <span className="font-sans">Agent 智能代理模式 (支持自动规划并使用工具分析、修改设定与剧情)</span>
            </label>
          </div>

          {lastAssistantMessage && (
            <div className="flex justify-end mb-2">
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs gap-1 border-pink-500/50 text-pink-400 hover:bg-pink-950/20 shadow-[0_0_6px_rgba(236,72,153,0.1)]"
                onClick={() => onApply(lastAssistantMessage.content)}
              >
                <Check size={12} />
                采用此回复
              </Button>
            </div>
          )}
          <div className="flex gap-2">
            <Textarea
              rows={2}
              className="flex-1 text-xs resize-none h-14"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder={useAgent ? "输入你的 Agent 指令，例如：‘帮我查找当前的角色设定，并在背景环境里添加与他们的互动关系...’" : "输入你的需求..."}
            />
            <Button
              size="sm"
              className="shrink-0 self-end h-8"
              onClick={handleSend}
              disabled={sending || !input.trim()}
            >
              <Send size={14} />
            </Button>
          </div>
        </div>
      </div>
    </Dialog>
  );
};

export default AIDialogModal;