import { Component, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; // <-- ¡ESTA LÍNEA ES LA CLAVE!
import { FinancialService, Transaction } from '../../services/financial';

type TimeFilter = 'Diario' | 'Semanal' | 'Mensual';

@Component({
  selector: 'app-transactions',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule // <-- ¡Y ASEGÚRATE DE QUE ESTÉ AQUÍ!
  ],
  templateUrl: './transactions.html',
  styleUrl: './transactions.scss'
})
export class Transactions {
  private financialService = inject(FinancialService);
  
  activeFilter = signal<TimeFilter>('Mensual');
  displayedMonth = signal(new Date());

  isNextMonthDisabled = computed(() => {
    const now = new Date();
    const displayed = this.displayedMonth();
    return displayed.getMonth() === now.getMonth() && displayed.getFullYear() === now.getFullYear();
  });

  private allTransactions = this.financialService.transactions;

  filteredTransactions = computed(() => {
    const filter = this.activeFilter();
    const transactions = this.allTransactions();

    switch (filter) {
      case 'Diario':
        const today = new Date().setHours(0, 0, 0, 0);
        return transactions.filter(t => new Date(t.date).setHours(0, 0, 0, 0) === today);
      case 'Semanal':
        const nowForWeek = new Date();
        const oneWeekAgo = new Date(nowForWeek.setDate(nowForWeek.getDate() - 7));
        return transactions.filter(t => new Date(t.date) >= oneWeekAgo);
      case 'Mensual':
        const displayed = this.displayedMonth();
        return transactions.filter(t => 
          new Date(t.date).getMonth() === displayed.getMonth() &&
          new Date(t.date).getFullYear() === displayed.getFullYear()
        );
      default:
        return transactions;
    }
  });

  editingTransaction: Transaction | null = null;
  editedTransaction: Partial<Transaction> = {};

  setFilter(filter: TimeFilter): void {
    this.activeFilter.set(filter);
  }

  goToPreviousMonth(): void {
    this.displayedMonth.update(currentDate => new Date(currentDate.setMonth(currentDate.getMonth() - 1)));
  }

  goToNextMonth(): void {
    this.displayedMonth.update(currentDate => new Date(currentDate.setMonth(currentDate.getMonth() + 1)));
  }

  getAmountClass(amount: number): string {
    return amount >= 0 ? 'positive' : 'negative';
  }

  deleteTransaction(id: number): void {
    this.financialService.deleteTransaction(id);
  }
  
  editTransaction(transaction: Transaction): void {
    this.editingTransaction = transaction;
    this.editedTransaction = { ...transaction };
  }

  saveChanges(): void {
    if (this.editingTransaction && this.editedTransaction) {
      const updatedTransaction = { ...this.editingTransaction, ...this.editedTransaction } as Transaction;
      this.financialService.updateTransaction(updatedTransaction);
      this.editingTransaction = null; 
      this.editedTransaction = {}; 
    }
  }

  cancelEdit(): void {
    this.editingTransaction = null;
    this.editedTransaction = {};
  }
}