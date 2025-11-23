// src/app/components/add-transaction/add-transaction.ts
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
export class AddTransaction {
  private financialService = inject(FinancialService);
  private router = inject(Router);
  note: string = ''; // NUEVA VARIABLE

  // Variables para el formulario
  amount: number | null = null;
  description: string = '';
  category: string = '';
  isExpense: boolean = true;
  
  // Accede a las categorías desde el servicio.
  categories = this.financialService.allCategories;

  toggleType(isExpense: boolean): void {
    this.isExpense = isExpense;
    if (!this.isExpense && this.category !== 'Salario') {
      this.category = 'Salario';
    }
  }

  // ---- ¡AQUÍ ESTÁ LA LÓGICA QUE FALTABA! ----
  /**
   * Este método se llama cada vez que el usuario escribe en el campo de descripción.
   * Le pide al servicio una sugerencia de categoría.
   */
onDescriptionChange(description: string): void {
    const suggestion = this.financialService.getSuggestedCategory(description);

    console.log(`Buscando sugerencia para: "${description}". Resultado:`, suggestion); // Línea de depuración

    if (suggestion) {
      this.category = suggestion.category;
      // --- ¡ESTA LÍNEA ES LA CLAVE PARA EL BOTÓN Y EL GUARDADO! ---
      // Actualiza el estado 'isExpense' basado en la sugerencia del servicio.
      this.isExpense = suggestion.isExpense; 
      // -------------------------------------------
    }
  }
  // -------------------------------------------

  addTransaction(): void {
    if (this.amount && this.description && this.category) {
      const finalAmount = this.isExpense ? -Math.abs(this.amount) : Math.abs(this.amount);
      
      // Llamamos al método `addTransaction` del servicio con el formato correcto
      this.financialService.addTransaction({
        description: this.description,
        note: this.note,
        date: new Date().toISOString(),
        amount: finalAmount,
        category: this.category,
      });

      this.router.navigate(['/']);
    }
  }
}