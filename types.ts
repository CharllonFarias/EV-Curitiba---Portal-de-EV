export interface PortalData {
  id?: string; // Added for editing support
  clientName: string;
  htmlContent: string;
  password: string; // In a real app, this should be hashed, but for this demo URL-state app, we store raw
  expiresAt: number;
  created: number;
}

export enum AspectRatio {
  Square = "1:1",
  Portrait23 = "2:3",
  Landscape32 = "3:2",
  Portrait34 = "3:4",
  Landscape43 = "4:3",
  Portrait916 = "9:16",
  Landscape169 = "16:9",
  Ultrawide219 = "21:9"
}

export enum AIModelType {
  Fast = 'fast',
  Thinking = 'thinking',
  Search = 'search',
  ImageGen = 'image-gen',
  ImageEdit = 'image-edit'
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  images?: string[]; // base64
  isThinking?: boolean;
}