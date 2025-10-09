import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Header } from '../header/header';
import { Summary } from '../summary/summary';
import { SavingsGoal } from '../savings-goal/savings-goal';
import { Transactions } from '../transactions/transactions';
import { FinancialService } from '../../services/financial';

@Component({
  selector: 'app-home',
   standalone: true,
  imports: [
    CommonModule,
    Header,
    Summary,
    SavingsGoal,
    Transactions
  ],
  templateUrl: './home.html',
  styleUrl: './home.scss'
})
export class Home {
    private financialService = inject(FinancialService);
  
  totalSaved = this.financialService.currentSavings;
  savingsGoal = this.financialService.savingsGoal;

  progress = computed(() => {
    const saved = this.totalSaved();
    const goal = this.savingsGoal();
    if (goal === 0) return 0;
    return Math.min((saved / goal) * 100, 100);
  });
}
