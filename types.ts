
export interface Book {
  id: string;
  title: string;
  coverImage: string; // data URL
  pageTexts: string[];
}

export enum VoiceOption {
    MALE = 'male',
    FEMALE = 'female'
}
