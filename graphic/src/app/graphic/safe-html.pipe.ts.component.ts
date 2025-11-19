import { Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Pipe({
  name: 'safeHtml',
  standalone: true // Si vous utilisez les composants standalone
})
export class SafeHtmlPipe implements PipeTransform {

  constructor(private sanitizer: DomSanitizer) { }

  transform(html: string): SafeHtml {
    // Cette méthode dit à Angular : "Je sais ce que je fais, c'est safe"
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }
}