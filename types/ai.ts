export interface AIResult {
  id: string;
  detectedColor: string;
  materialState: string;
  category: string;
  confidence: number;
  timestamp: string;
  notes?: string;
}
