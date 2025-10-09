import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FinancialService, Transaction } from '../../services/financial';

@Component({
  selector: 'app-transactions',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './transactions.html',
  styleUrl: './transactions.scss'
})
export class Transactions {
  private financialService = inject(FinancialService);
  transactions = this.financialService.transactions;

  // NUEVO: Propiedad para gestionar la transacción que se está editando
  editingTransaction: Transaction | null = null;
  editedTransaction: Partial<Transaction> = {};

  // Método para determinar la clase del monto (positivo o negativo)
  getAmountClass(amount: number): string {
    return amount >= 0 ? 'positive' : 'negative';
  }

  // NUEVO: Método para eliminar una transacción
  deleteTransaction(id: number): void {
    this.financialService.deleteTransaction(id);
  }
  
  // NUEVO: Método para iniciar la edición de una transacción
  editTransaction(transaction: Transaction): void {
    this.editingTransaction = transaction;
    // Copiamos los valores para no modificar el original directamente
    this.editedTransaction = { ...transaction };
  }

  // NUEVO: Método para guardar los cambios
  saveChanges(): void {
    if (this.editingTransaction && this.editedTransaction) {
      const updatedTransaction = {
        ...this.editingTransaction,
        ...this.editedTransaction
      };
      this.financialService.updateTransaction(updatedTransaction);
      this.editingTransaction = null; // Cierra el formulario de edición
      this.editedTransaction = {}; // Limpia el objeto
    }
  }

  // NUEVO: Método para cancelar la edición
  cancelEdit(): void {
    this.editingTransaction = null;
    this.editedTransaction = {};
  }
}