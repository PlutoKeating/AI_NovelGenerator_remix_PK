export const designSystem = {
  // Theme Info
  name: "Retro-Futurism Synthwave",

  // Layouts & Containers
  appBg: "h-screen flex flex-col bg-[#0b0813] text-zinc-100 font-mono select-none overflow-hidden", // Deep dark purple space background
  headerBg: "bg-[#110c22]/70 backdrop-blur border-b border-fuchsia-900/40 px-6 py-3 flex items-center justify-between shrink-0 shadow-[0_1px_10px_rgba(244,63,94,0.15)]",
  titleText: "text-lg font-black bg-gradient-to-r from-cyan-400 via-pink-500 to-amber-400 bg-clip-text text-transparent tracking-widest uppercase filter drop-shadow-[0_0_8px_rgba(236,72,153,0.3)]",
  versionBadge: "text-[10px] bg-fuchsia-950/60 text-fuchsia-300 border border-fuchsia-500/50 px-1.5 py-0.5 rounded shadow-[0_0_8px_rgba(244,63,94,0.4)] font-mono",
  metaText: "text-xs text-zinc-500 font-mono",

  // Navigation / Tabs
  tabsBg: "bg-[#120e25] px-6 border-b border-fuchsia-950/60 shrink-0",
  tabsList: "bg-transparent border-0 gap-6 h-12 p-0",
  tabsTrigger: "data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-pink-500 data-[state=active]:text-pink-300 text-zinc-400 rounded-none h-full px-1 text-sm font-medium transition-all duration-200 hover:text-pink-400 data-[state=active]:drop-shadow-[0_0_6px_rgba(236,72,153,0.5)]",

  // Sidebar
  sidebarBg: "w-56 shrink-0 border-r border-fuchsia-950/60 bg-[#0e0a1b] flex flex-col",
  sidebarHeader: "px-3 py-2 border-b border-fuchsia-950/50 flex items-center justify-between",
  sidebarTitle: "text-xs font-semibold text-zinc-400 font-mono tracking-wider",
  sidebarCount: "text-[10px] text-fuchsia-400 font-mono bg-fuchsia-950/40 px-1.5 py-0.2 rounded border border-fuchsia-900/30",
  sidebarList: "flex-1 overflow-auto p-2 space-y-1",

  // Sidebar Items
  chapterItemActive: "bg-fuchsia-950/40 text-pink-300 border-l-2 border-pink-500 drop-shadow-[0_0_4px_rgba(236,72,153,0.2)]",
  chapterItemHover: "hover:bg-zinc-900/40 text-zinc-400 hover:text-zinc-200",
  chapterRing: "ring-1 ring-pink-500/50",
  checkboxAccent: "accent-pink-500 cursor-pointer shadow-[0_0_4px_rgba(236,72,153,0.4)]",
  chapterWordCount: "text-[10px] text-zinc-500 font-mono shrink-0",

  // Main Panel / Editor Section
  panelHeader: "shrink-0 px-4 py-2 flex items-center justify-between border-b border-fuchsia-950/60 bg-[#110c22]/50",
  panelTitle: "text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-cyan-400 filter drop-shadow-[0_0_4px_rgba(236,72,153,0.2)]",
  panelSubTitle: "text-sm font-semibold text-zinc-300",
  panelSubHeader: "shrink-0 p-4 border-b border-fuchsia-950/60 bg-[#0e0a1b]/40 space-y-3",
  label: "text-xs text-cyan-400/80 font-semibold tracking-wide uppercase font-mono mb-1 block",

  // Cards & Grids
  gridContainer: "grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5",
  cardBg: "bg-[#110c22] border border-fuchsia-950/80 hover:border-pink-500/60 transition-all duration-300 rounded-lg p-5 shadow-lg shadow-black/30 hover:shadow-[0_0_15px_rgba(236,72,153,0.2)]",

  // Novel Card specific
  novelCard: {
    container: (hovered: boolean) => `
      relative aspect-[3/4] rounded-lg border-2 overflow-hidden
      transition-all duration-300 ease-out cursor-pointer
      ${hovered ? "border-pink-500 shadow-lg shadow-pink-500/20 -translate-y-1" : "border-fuchsia-950/80 shadow-md"}
    `,
    gradient: (hovered: boolean) => ({
      background: hovered
        ? "linear-gradient(135deg, #1d0f35 0%, #0d061c 100%)"
        : "linear-gradient(135deg, #110c24 0%, #06040e 100%)",
    }),
    topBand: "absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 shadow-[0_1px_6px_rgba(236,72,153,0.5)]",
    title: "text-sm font-bold text-zinc-100 line-clamp-2 leading-tight tracking-wide font-sans group-hover:text-pink-300 transition-colors",
    genre: "text-[10px] bg-cyan-950/30 text-cyan-400 border border-cyan-900/40 px-1.5 py-0.5 rounded font-mono mt-1.5 inline-block",
    footerText: "text-[10px] text-zinc-400 font-mono",
    icon: "text-pink-500/40 group-hover:text-pink-500/80 transition-all duration-300 filter group-hover:drop-shadow-[0_0_4px_rgba(236,72,153,0.6)] mb-3",
    statusBadge: "absolute top-2 right-2 shadow-[0_0_6px_rgba(0,0,0,0.4)]",
    deleteBtn: "absolute top-2 left-2 p-1 rounded bg-red-950/80 text-red-300 hover:bg-red-800 border border-red-900/50 shadow-md transition-all duration-200 hover:scale-110"
  },

  // Status Badge Colors (Map status to retro-futurism neon styles)
  statusBadge: {
    draft: "bg-[#1f1937] text-zinc-300 border border-zinc-700/50 font-mono text-[9px]",
    generating: "bg-pink-950/60 text-pink-300 border border-pink-500/50 font-mono text-[9px] animate-pulse shadow-[0_0_4px_rgba(236,72,153,0.3)]",
    completed: "bg-cyan-950/60 text-cyan-300 border border-cyan-500/50 font-mono text-[9px] shadow-[0_0_4px_rgba(6,182,212,0.3)]"
  },

  // Inputs / Controls
  input: "bg-[#140f29] border border-fuchsia-950/80 text-zinc-100 placeholder-zinc-600 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/50 rounded-md p-2 text-xs transition-all duration-200 outline-none w-full shadow-inner",
  textarea: "bg-[#140f29] border border-fuchsia-950/80 text-zinc-100 placeholder-zinc-600 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/50 rounded-md p-2 text-xs transition-all duration-200 outline-none resize-none leading-relaxed w-full shadow-inner",

  // Dialog / Modal Style
  dialogContent: "relative z-50 w-full max-w-lg bg-[#0f0b21] border border-fuchsia-900/50 text-zinc-100 p-6 rounded-lg shadow-[0_0_25px_rgba(236,72,153,0.15)]",
  dialogHeader: "flex flex-col space-y-1.5 text-center sm:text-left mb-4 pb-3 border-b border-fuchsia-950/50",
  dialogTitle: "text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-cyan-400 filter drop-shadow-[0_0_4px_rgba(236,72,153,0.3)] flex items-center gap-2",
  dialogFooter: "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 mt-4 pt-3 border-t border-fuchsia-950/50",

  // AI Modal Specific
  aiModal: {
    dialog: "flex flex-col h-[500px] bg-[#0f0b21] text-zinc-100 p-4",
    messagesContainer: "flex-1 overflow-auto py-3 space-y-3 scrollbar-thin scrollbar-thumb-fuchsia-950",
    messageUser: "bg-pink-950/40 text-pink-200 border border-pink-900/30 max-w-[80%] rounded-lg px-3 py-2 text-xs leading-relaxed shadow-[0_0_6px_rgba(236,72,153,0.15)]",
    messageAssistant: "bg-cyan-950/20 text-cyan-200 border border-cyan-900/30 max-w-[80%] rounded-lg px-3 py-2 text-xs leading-relaxed shadow-[0_0_6px_rgba(6,182,212,0.1)]",
    thinkingText: "bg-zinc-900/40 text-zinc-400 border border-zinc-800 rounded-lg px-3 py-2 text-xs font-mono animate-pulse",
    emptyStateText: "text-center text-zinc-500 text-xs py-8 space-y-2",
    emptyStateIcon: "text-pink-500/40 filter drop-shadow-[0_0_4px_rgba(236,72,153,0.4)] mx-auto mb-2 animate-pulse",
    footerActions: "border-t border-fuchsia-950/60 pt-3 space-y-2"
  },

  // Custom button presets for Retro-Futurism styles
  buttons: {
    primary: "bg-pink-600 hover:bg-pink-500 text-white font-mono uppercase tracking-wider text-xs font-semibold py-2 px-4 rounded border border-pink-500 shadow-[0_0_10px_rgba(236,72,153,0.4)] hover:shadow-[0_0_15px_rgba(236,72,153,0.6)] transition-all duration-300 active:scale-95 disabled:opacity-50 disabled:pointer-events-none",
    secondary: "bg-[#140f29] hover:bg-fuchsia-950/40 text-zinc-300 hover:text-white font-mono uppercase tracking-wider text-xs font-semibold py-2 px-4 rounded border border-fuchsia-900/50 hover:border-pink-500/50 shadow-md transition-all duration-300",
    outline: "bg-transparent border border-cyan-500/50 text-cyan-400 hover:bg-cyan-950/20 hover:text-cyan-300 hover:border-cyan-400 font-mono uppercase tracking-wider text-xs font-semibold py-2 px-4 rounded shadow-[0_0_6px_rgba(6,182,212,0.1)] hover:shadow-[0_0_10px_rgba(6,182,212,0.3)] transition-all duration-300",
    ghost: "bg-transparent hover:bg-fuchsia-950/30 text-zinc-400 hover:text-pink-400 rounded transition-all duration-200",
    destructive: "bg-[#3a0c1a]/40 border border-red-500/40 text-red-300 hover:bg-red-950/60 hover:text-red-100 font-mono uppercase tracking-wider text-xs font-semibold py-2 px-4 rounded shadow-md transition-all duration-300"
  }
};
