import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../../../core/auth/services/auth.service';

@Component({
  selector: 'app-explore-home',
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule],
  templateUrl: './explore-home.component.html',
  styleUrls: ['./explore-home.component.css']
})
export class ExploreHomeComponent {
  readonly authService = inject(AuthService);
}
