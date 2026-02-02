export interface SceneOverlay {
  text?: string;
  position: 'top' | 'center' | 'bottom';
  cta?: string;
  showLogo?: boolean;
}

export interface Scene {
  prompt: string;
  duration: number;
  source: 'text' | 'selfie' | 'upload';
  overlay: SceneOverlay;
}

export interface AdTemplate {
  caseType: string;
  storyline: string;
  scenes: Scene[];
  disclaimer: string;
}
