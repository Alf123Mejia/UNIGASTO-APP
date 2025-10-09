// src/app/components/summary/summary.ts
import { Component, inject, computed } from '@angular/core'; // NUEVO: Importamos `computed`
import { FinancialService } from '../../services/financial';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-summary',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './summary.html',
  styleUrl: './summary.scss'
})
export class Summary {
  private financialService = inject(FinancialService);

  // Exponemos las signals del servicio directamente
  balance = this.financialService.balance;
  totalExpenses = this.financialService.totalExpenses;
  budget = this.financialService.budget;

  // NUEVO: Creamos una signal `computed` para el uso del presupuesto.
  // Esta se recalculará automáticamente cuando `totalExpenses` o `budget` cambien.
  budgetUsage = computed(() => {
    const expenses = this.totalExpenses();
    const budget = this.budget();

    if (budget === 0) {
      return 0; // Evitamos divisiones por cero
    }
    const percentage = (expenses / budget) * 100;
    return Math.round(percentage); // Redondeamos para mostrar un número entero
  });

  // NUEVO: `progressWidth` ahora es un `computed` que depende de `budgetUsage`
  progressWidth = computed(() => {
    return Math.min(this.budgetUsage(), 100); // El progreso no puede pasar de 100%
  });

  // NUEVO: `progressColorClass` también es un `computed` para cambiar el color reactivamente
  progressColorClass = computed(() => {
    const usage = this.budgetUsage();
    if (usage < 50) {
      return 'white';
    } else if (usage < 90) {
      return 'yellow';
    } else {
      return 'orange';
    }
  });
}