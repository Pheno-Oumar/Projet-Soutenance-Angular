export type TypeMediaStory = 'IMAGE' | 'VIDEO';

export interface Story {
  id: number;
  mediaUrl: string;
  typeMedia: TypeMediaStory;
  dateCreation: string;
  dateExpiration: string;
  salonSlug: string;
  salonNom: string;
  salonLogoUrl?: string;
}

export interface SalonStories {
  salonId: number;
  salonNom: string;
  salonSlug: string;
  salonLogoUrl?: string;
  nombreStories: number;
  stories: Story[];
}
