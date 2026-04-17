export interface TaxProfile {
  income: number;
  retention: number;
  expenses: {
    health: number;
    education: number;
    housing: number;
    general: number;
    restaurants: number;
    veterinary: number;
    car_maintenance: number;
  };
  hasPPR: boolean;
  maritalStatus: 'solteiro' | 'casado_1_titular' | 'casado_2_titulares';
  dependents: number;
  isPaid: boolean;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  attachment?: {
    name: string;
    type: string;
    data: string; // base64
  };
}

export interface OptimizationTip {
  id: string;
  title: string;
  description: string;
  impact: string;
  category: 'deductions' | 'investments' | 'reporting';
}

export interface AnalyzedDocument {
  name: string;
  type: string;
  status: 'analyzing' | 'completed' | 'error';
  detectedIncome?: string[];
  summary?: string;
}
