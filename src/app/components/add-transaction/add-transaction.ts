// src/app/components/add-transaction/add-transaction.component.ts
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { FinancialService } from '../../services/financial';

@Component({
  selector: 'app-add-transaction',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './add-transaction.html',
  styleUrl: './add-transaction.scss'
})
export class AddTransaction { // Corregido: 'AddTransaction' a 'AddTransactionComponent'
  private financialService = inject(FinancialService);
  private router = inject(Router);

  // Variables para el formulario
  amount: number | null = null;
  description: string = '';
  category: string = '';
  isExpense: boolean = true;
  
  // Accede a las categorías desde el servicio.
  categories = this.financialService.allCategories;

  toggleType(isExpense: boolean): void {
    this.isExpense = isExpense;
    if (!this.isExpense) {
      this.category = 'Salario';
    }
  }

  addTransaction(): void {
    if (this.amount && this.description && this.category) {
      const finalAmount = this.isExpense ? -Math.abs(this.amount) : Math.abs(this.amount);
      
      const newTransaction = {
        // Corregido: Se añade el id
        id: Date.now(),
        description: this.description,
        date: new Date().toISOString(), // Usamos un formato estándar universal
        amount: finalAmount,
        category: this.category,
        // Corregido: Se añade el iconColor
        icon: this.categories().find(cat => cat.name === this.category)?.icon || 'fas fa-question-circle',
        iconColor: this.categories().find(cat => cat.name === this.category)?.color || '#333'
      };

      this.financialService.addTransaction(newTransaction);
      this.router.navigate(['/']);
    }
  }
}