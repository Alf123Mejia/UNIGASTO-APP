// src/app/components/notifications/notifications.component.ts
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router'; // Importamos Router
import { FinancialService } from '../../services/financial'; // Asegúrate de que la ruta sea correcta

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './notifications.html',
  styleUrl: './notifications.scss'
})
export class Notifications {
  private financialService = inject(FinancialService);
  private router = inject(Router);
  notifications = this.financialService.notifications;

  // Método para marcar una notificación como leída
  markAsRead(notificationId: number): void {
    this.financialService.markAsRead(notificationId);
  }

  // Ahora, el botón de retroceso marca todas las notificaciones como leídas y navega
  goBack(): void {
    this.financialService.markAllAsRead();
    this.router.navigate(['/']);
  }
}