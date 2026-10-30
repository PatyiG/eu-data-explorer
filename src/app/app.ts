import { ChangeDetectionStrategy, Component, effect, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { INDICATORS } from './data/indicators';
import { ExplorerStore } from './state/explorer.store';

/**
 * Shell: header, indicator picker and the URL ⇄ store sync.
 * The query string is the source of truth (?indicator=…&geos=…), so every view
 * can be bookmarked and the browser back button behaves as expected.
 */
@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly store = inject(ExplorerStore);
  protected readonly indicators = INDICATORS;
  private readonly router = inject(Router);
  private readonly params = toSignal(inject(ActivatedRoute).queryParamMap);

  constructor() {
    effect(() => {
      const params = this.params();
      if (!params) return;
      this.store.selectIndicator(params.get('indicator'));
      const geos = params.get('geos');
      if (geos) this.store.setCompared(geos.split(','));
    });
  }

  protected chooseIndicator(id: string): void {
    void this.router.navigate([], { queryParams: { indicator: id }, queryParamsHandling: 'merge' });
  }
}
