export interface CommandAnalysisRequest {
  text: string;
  context?: string;
}

export interface CommandAnalysisResponse {
  thinking?: string;
  isCommand: boolean;
  commandType: 'insert' | 'delete' | 'replace' | 'format' | 'control' | null;
  action: string;
  target?: string;
  content?: string;
  replacement?: string;
  position?: 'before' | 'after' | 'start' | 'end' | 'replace';
  confidence: number;
  explanation: string;
  provider?: string;
}

export interface AIError {
  error: string;
  message: string;
}
