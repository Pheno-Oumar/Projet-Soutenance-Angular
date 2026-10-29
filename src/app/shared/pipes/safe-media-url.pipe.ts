import { Pipe, PipeTransform, inject } from '@angular/core';
import { MediaProxyService } from '../../core/services/media-proxy.service';

@Pipe({
  name: 'safeMedia',
  standalone: true
})
export class SafeMediaUrlPipe implements PipeTransform {
  private readonly mediaProxy = inject(MediaProxyService);

  transform(url: string | null | undefined): string {
    return this.mediaProxy.getSafeMediaUrl(url);
  }
}
