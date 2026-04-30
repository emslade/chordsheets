export interface User {
  id: string;
  email: string;
  displayName: string;
  createdAt: string;
  updatedAt: string;
}

export type TuningName = 'standard' | 'drop-d' | 'open-g' | 'open-d' | 'open-e' | 'dadgad' | 'half-step-down' | 'full-step-down';

export interface ChordSheet {
  id: string;
  userId: string;
  title: string;
  artist?: string;
  key?: string;
  capo?: number;
  tuning?: TuningName;
  chordsAsShapes?: boolean;
  customChords?: CustomChordDiagram[];
  content: string;
  nashvilleContent?: string;
  isComplete?: boolean;
  shareToken?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateChordSheetDto {
  title: string;
  artist?: string;
  key?: string;
  capo?: number;
  tuning?: TuningName;
  chordsAsShapes?: boolean;
  customChords?: CustomChordDiagram[];
  content: string;
  nashvilleContent?: string;
  isComplete?: boolean;
}

export interface UpdateChordSheetDto {
  title?: string;
  artist?: string;
  key?: string;
  capo?: number | null;
  tuning?: TuningName | null;
  chordsAsShapes?: boolean | null;
  customChords?: CustomChordDiagram[] | null;
  content?: string;
  nashvilleContent?: string | null;
  isComplete?: boolean;
}

export interface RegisterDto {
  email: string;
  displayName: string;
  password: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface CustomChordDiagram {
  name: string;        // Chord name this overrides, e.g. "Am7"
  frets: number[];     // 6 values: -1 = muted, 0 = open, 1+ = fret
  baseFret: number;    // Usually 1
}

export interface ViewerPresence {
  id: string;
  animal: string;
  name: string;
  color: string;
}

export type Note = number; // 0-11 semitone index (C=0, C#=1, ... B=11)

export interface Chord {
  root: Note;
  quality: string;
  bass?: Note;
  original: string;
}

export interface LineSegment {
  chord?: Chord;
  lyric: string;
}

export interface ParsedLine {
  segments: LineSegment[];
  isSection?: boolean;
  sectionName?: string;
  note?: string;
}

export interface NashvilleBeat {
  degree: number;        // 1-7
  quality: string;       // 'm', 'dim', 'aug', '7', 'maj7', 'sus4', etc.
  bass?: number;         // slash chord bass degree, e.g. 5 in "1/5"
  bassQuality?: string;  // quality on the bass degree
  original: string;      // raw text, e.g. "6m" or "5/7"
}

export interface NashvilleBar {
  beats: NashvilleBeat[];
}

export interface NashvilleLine {
  bars: NashvilleBar[];
  isSection?: boolean;
  sectionName?: string;
}
