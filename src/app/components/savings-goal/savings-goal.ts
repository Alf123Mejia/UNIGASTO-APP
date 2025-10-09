import { Component, inject, computed } from '@angular/core';
import { FinancialService } from '../../services/financial';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-savings-goal',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './savings-goal.html',
  styleUrls: ['./savings-goal.scss']
})
export class SavingsGoal {
  private financialService = inject(FinancialService);

  totalSaved = this.financialService.currentSavings;
  savingsGoal = this.financialService.savingsGoal;

  progressWidth = computed(() => {
    const saved = this.totalSaved();
    const goal = this.savingsGoal();
    if (goal === 0) return 0;
    return Math.min((saved / goal) * 100, 100);
  });
}