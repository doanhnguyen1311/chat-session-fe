export type ChatThemeId = "glass-neo" | "cyberpunk" | "minimal-apple" | "gaming-riot" | "material-you" | "luxury-black-gold" | "hologram";

export type ChatTheme = {
  id: ChatThemeId;
  name: string;
  description: string;
  mode: "dark" | "light";
};

export const CHAT_THEMES: ChatTheme[] = [
  { id: "glass-neo", name: "Glassmorphism Neo", description: "Soft frosted glass, ambient glow, premium neutral depth", mode: "dark" },
  { id: "cyberpunk", name: "Cyberpunk", description: "Neon violet, electric cyan, deep futuristic contrast", mode: "dark" },
  { id: "minimal-apple", name: "Minimal Apple", description: "Clean bright surfaces, gentle blur, calm productivity feel", mode: "light" },
  { id: "gaming-riot", name: "Gaming / Riot", description: "Energetic red-gold accents with dark competitive panels", mode: "dark" },
  { id: "material-you", name: "Material You", description: "Playful adaptive colors with comfortable rounded surfaces", mode: "light" },
  { id: "luxury-black-gold", name: "Luxury Black Gold", description: "Deep black, champagne gold, luxury desktop messenger", mode: "dark" },
  { id: "hologram", name: "Hologram Futuristic", description: "Iridescent holographic glow with translucent panels", mode: "dark" }
];

export const DEFAULT_THEME_ID: ChatThemeId = "glass-neo";

export type ServerRoomTheme = {
  roomId: string;
  themeType: ChatThemeId;
  wallpaperUrl: string | null;
  blur: number;
  opacity: number;
  brightness: number;
  saturation: number;
  overlay: string;
  updatedBy: string | null;
  updatedAt: string;
};

export type RoomWallpaperConfig = {
  image?: string;
  preset?: string;
  blur: number;
  opacity: number;
  overlay: string;
  brightness: number;
  saturation: number;
};

export type WallpaperStore = Record<string, RoomWallpaperConfig>;

export const WALLPAPER_PRESETS = [
  { id: "aurora", name: "Aurora", image: "radial-gradient(circle at 20% 20%, rgba(139,92,246,.48), transparent 34%), radial-gradient(circle at 80% 30%, rgba(34,211,238,.36), transparent 30%), linear-gradient(135deg, #050712, #111827)" },
  { id: "midnight", name: "Midnight", image: "radial-gradient(circle at 50% 0%, rgba(79,70,229,.32), transparent 38%), linear-gradient(160deg, #030712, #111827 52%, #020617)" },
  { id: "sunrise", name: "Sunrise", image: "radial-gradient(circle at 18% 12%, rgba(251,191,36,.34), transparent 32%), radial-gradient(circle at 80% 22%, rgba(244,114,182,.24), transparent 30%), linear-gradient(135deg, #fff7ed, #e0f2fe)" },
  { id: "riot", name: "Riot", image: "radial-gradient(circle at 18% 18%, rgba(239,68,68,.36), transparent 32%), radial-gradient(circle at 82% 18%, rgba(245,158,11,.24), transparent 28%), linear-gradient(135deg, #09090b, #18181b)" },
  { id: "holo", name: "Hologram", image: "radial-gradient(circle at 20% 30%, rgba(6,182,212,.36), transparent 30%), radial-gradient(circle at 70% 18%, rgba(217,70,239,.30), transparent 28%), radial-gradient(circle at 58% 78%, rgba(52,211,153,.20), transparent 30%), linear-gradient(135deg, #07111f, #111827)" }
];

export const DEFAULT_WALLPAPER: RoomWallpaperConfig = {
  preset: "aurora",
  blur: 10,
  opacity: 0.6,
  overlay: "rgba(3, 7, 18, 0.42)",
  brightness: 0.88,
  saturation: 1.12
};
