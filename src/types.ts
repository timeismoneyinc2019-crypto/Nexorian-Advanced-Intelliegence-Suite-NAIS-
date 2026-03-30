export type Industry = 'Agriculture' | 'Logistics' | 'Energy' | 'Infrastructure' | 'Healthcare' | 'Cybersecurity' | 'Defense';

export interface SystemState {
  timestamp: number;
  value: number;
  drift: number;
  uncertainty: number;
  raw_data?: any;
}

export interface Prediction {
  horizon: string;
  probability: number;
  outcome: string;
}

export interface Decision {
  action: string;
  cost: number;
  risk: 'Low' | 'Medium' | 'High';
  impact: number;
  proactiveAdjustment?: string;
  isProactive?: boolean;
}

export interface Slide {
  id: number;
  title: string;
  content: string;
  narration: string;
}

export interface ResearchResult {
  summary: string;
  keyFindings: string[];
  sources: { title: string; url: string }[];
  nextSteps: string[];
}
