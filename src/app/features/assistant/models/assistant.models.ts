export interface AssistantCarte {
  type: string;
  titre: string;
  donnees: any;
}

export interface AssistantActionUi {
  type: string;
  payload: Record<string, any>;
}

export interface PendingActionDTO {
  actionId: string;
  outil: string;
  resume: string;
  expireA: string;
  donnees?: Record<string, any>;
}

export interface AssistantChatRequest {
  message: string;
  sessionId?: string;
  slugSalon?: string;
  pageCourante?: string;
  ressourceCouranteId?: number;
  latitude?: number;
  longitude?: number;
  rdvEnCours?: {
    varianteIds?: number[];
    date?: string;
    heure?: string;
  };
}

export interface AssistantChatResponse {
  texte: string;
  cartes: AssistantCarte[];
  actionsUi: AssistantActionUi[];
  suggestions: string[];
  actionEnAttente?: PendingActionDTO;
  contexte: string;
}

export interface AssistantMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: Date;
  cartes?: AssistantCarte[];
  actionEnAttente?: PendingActionDTO | null;
  isActionConfirmed?: boolean;
  confirmedResult?: AssistantCarte;
  isTyping?: boolean;
}
