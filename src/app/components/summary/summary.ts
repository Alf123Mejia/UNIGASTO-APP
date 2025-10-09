import { Component, inject, } from '@angular/core';
import { FinancialService } from '../../services/financial';
import { CommonModule } from '@angular/common'; // 

@Component({
  selector: 'app-summary',
   standalone: true,
  imports: [CommonModule],
  templateUrl: './summary.html',
  styleUrl: './summary.scss'
})
export class Summary {
  // Inyecta el servicio en el componente
  private financialService = inject(FinancialService);

  // Expone los datos del servicio a la plantilla
  balance = this.financialService.balance;
  totalExpenses = this.financialService.totalExpenses;
  budget = this.financialService.budget;
  budgetUsage = this.financialService.budgetUsage;

    // Esta función devuelve una clase CSS según el porcentaje de uso
  get progressColorClass(): string {
    const usage = this.budgetUsage;
    if (usage < 50) {
      return 'white';
    } else if (usage < 90) {
      return 'yellow';
    } else {
      return 'orange';
    }
  }

  get progressWidth(): number {
    const usage = this.budgetUsage;
    return Math.min(usage, 100);
  }

    get usageMessage(): string {
    const usage = this.budgetUsage; // Correcto: Usa el getter directamente
    if (usage > 100) {
      return `¡Has excedido tu presupuesto por ${usage - 100}%!`;
    }
    return `Has Usado ${usage}% De Tu Presupuesto.`;
  }


}
