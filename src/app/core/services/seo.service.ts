import { Injectable, inject } from '@angular/core';
import { Title, Meta } from '@angular/platform-browser';

export interface SeoConfig {
  title: string;
  description?: string;
  keywords?: string[];
  robots?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  ogUrl?: string;
  twitterCard?: 'summary' | 'summary_large_image' | 'app' | 'player';
}

@Injectable({
  providedIn: 'root'
})
export class SeoService {
  private readonly titleService = inject(Title);
  private readonly metaService = inject(Meta);

  private readonly DEFAULT_APP_NAME = 'Hair Style';

  setTitle(pageTitle: string): void {
    const fullTitle = pageTitle.includes(this.DEFAULT_APP_NAME)
      ? pageTitle
      : `${pageTitle} | ${this.DEFAULT_APP_NAME}`;
    this.titleService.setTitle(fullTitle);
  }

  setDescription(description: string): void {
    this.metaService.updateTag({ name: 'description', content: description });
    this.metaService.updateTag({ property: 'og:description', content: description });
  }

  setKeywords(keywords: string[]): void {
    this.metaService.updateTag({ name: 'keywords', content: keywords.join(', ') });
  }

  setRobots(robots: string): void {
    this.metaService.updateTag({ name: 'robots', content: robots });
  }

  updateTags(config: SeoConfig): void {
    this.setTitle(config.title);

    if (config.description) {
      this.setDescription(config.description);
    }

    if (config.keywords && config.keywords.length > 0) {
      this.setKeywords(config.keywords);
    }

    if (config.robots) {
      this.setRobots(config.robots);
    }

    // Open Graph
    this.metaService.updateTag({
      property: 'og:title',
      content: config.ogTitle || config.title
    });

    if (config.ogImage) {
      this.metaService.updateTag({ property: 'og:image', content: config.ogImage });
    }

    if (config.ogUrl) {
      this.metaService.updateTag({ property: 'og:url', content: config.ogUrl });
    }

    // Twitter Card
    this.metaService.updateTag({
      name: 'twitter:card',
      content: config.twitterCard || 'summary_large_image'
    });
    this.metaService.updateTag({
      name: 'twitter:title',
      content: config.title
    });
    if (config.description) {
      this.metaService.updateTag({
        name: 'twitter:description',
        content: config.description
      });
    }
  }
}
