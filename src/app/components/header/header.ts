// src/app/components/header/header.component.ts
import { Component, inject, computed } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common'; // ¡Añade esta línea!
import { FinancialService } from '../../services/financial';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterModule, CommonModule], // ¡Y añádelo aquí!
  templateUrl: './header.html',
  styleUrls: ['./header.scss']
})
export class Header {
  private financialService = inject(FinancialService);

  balance = this.financialService.balance;

  // Usa el nuevo método del servicio para contar
  unreadNotifications = computed(() => this.financialService.getUnreadNotificationsCount());
}