import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SalonStories } from '../../../../shared/models';
import { SafeMediaUrlPipe } from '../../../../shared/pipes/safe-media-url.pipe';

@Component({
  selector: 'app-story-reel-bar',
  standalone: true,
  imports: [CommonModule, SafeMediaUrlPipe],
  templateUrl: './story-reel-bar.component.html',
  styleUrls: ['./story-reel-bar.component.css']
})
export class StoryReelBarComponent {
  @Input() stories: SalonStories[] = [];
  @Input() titre = 'Stories 24h des Salons';
  @Output() selectSalonStory = new EventEmitter<SalonStories>();

  onSelect(salonStory: SalonStories): void {
    this.selectSalonStory.emit(salonStory);
  }
}
