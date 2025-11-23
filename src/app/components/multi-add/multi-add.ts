// src/app/components/multi-add/multi-add.ts

import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormArray, FormGroup } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { FinancialService, Category } from '../../services/financial';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-multi-add',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './multi-add.html',
  styleUrls: ['./multi-add.scss']
})
export class MultiAddComponent implements OnInit {
  private fb = inject(FormBuilder);
  private financialService = inject(FinancialService);
  private router = inject(Router);
  private http = inject(HttpClient);

  multiExpenseForm: FormGroup;
  categories: Category[] = [];
  isLoading = signal(false);
  errorMessage = signal<string | null>(null);

  // --- URL DE LA FUNCIÓN INSERTADA CORRECTAMENTE ---
  private readonly cloudFunctionUrl = 'https://processreceipt-5jmopvoqwa-uc.a.run.app';


  constructor() {
    this.multiExpenseForm = this.fb.group({
      expenseItems: this.fb.array([])
    });
  }

  ngOnInit(): void {
    this.categories = this.financialService.allCategories()
      .filter(cat => cat.name !== 'Ingresos' && cat.name !== 'Ahorro');
    // No añadimos fila inicial
  }

  get expenseItems(): FormArray {
    return this.multiExpenseForm.get('expenseItems') as FormArray;
  }

  createExpenseItem(desc: string = '', amount: number | null = null, cat: string = '', note: string = ''): FormGroup {
    return this.fb.group({
      description: [desc, Validators.required],
      amount: [amount, [Validators.required, Validators.min(0.01)]],
      category: [cat, Validators.required],
      note: [note] // Nuevo campo nota
    });
  }

  addExpenseItem(): void {
    this.expenseItems.push(this.createExpenseItem());
  }

  removeExpenseItem(index: number): void {
    this.expenseItems.removeAt(index);
    if (this.expenseItems.length === 0) {
      this.addExpenseItem();
    }
  }

  suggestCategoryForRow(index: number): void {
    const itemGroup = this.expenseItems.at(index) as FormGroup;
    const descriptionControl = itemGroup.get('description');
    if (descriptionControl && descriptionControl.value) {
      const suggestion = this.financialService.getSuggestedCategory(descriptionControl.value);
      if (suggestion && suggestion.isExpense && suggestion.category !== 'Ahorro') {
        itemGroup.patchValue({ category: suggestion.category }, { emitEvent: false });
      }
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      if (!file.type.startsWith('image/')) {
        this.errorMessage.set('Por favor, selecciona un archivo de imagen válido.');
        input.value = '';
        return;
      }
      this.errorMessage.set(null);
      this.uploadFile(file);
      input.value = '';
    }
  }

  uploadFile(file: File): void {
    // --- CONDICIÓN IF SIMPLIFICADA Y CORREGIDA ---
    // Solo comprobamos si la URL está vacía o es null/undefined
    if (!this.cloudFunctionUrl) {
      console.error('¡ERROR CRÍTICO! cloudFunctionUrl no está definida.');
      this.errorMessage.set('Error de Configuración: La URL de la función no está definida.');
      this.isLoading.set(false);
      return;
    }
    // --- FIN DE LA CORRECCIÓN ---

    const formData = new FormData();
    formData.append('file', file, file.name);

    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.expenseItems.clear();

    console.log(`Enviando imagen a: ${this.cloudFunctionUrl}`); // Verifica que esta URL sea la correcta

    this.http.post<{ items: { description: string; amount: number }[] }>(this.cloudFunctionUrl, formData)
      .subscribe({
        next: (res) => {
          console.log("Respuesta del backend recibida:", res);
          if (res.items && res.items.length > 0) {
            res.items.forEach((item: any, index: number) => { // Usamos any temporalmente para facilitar la lectura del campo note
              // Pasamos item.note al crear la fila
              this.expenseItems.push(this.createExpenseItem(item.description, item.amount, '', item.note || ''));
              setTimeout(() => this.suggestCategoryForRow(index), 50);
            });
          } else {
            this.errorMessage.set('No se encontraron gastos legibles en la imagen. Puedes agregarlos manualmente.');
            this.addExpenseItem();
          }
          this.isLoading.set(false);
        },
        error: (err: HttpErrorResponse) => {
          console.error("Error al llamar a la función:", err);
          let userError = 'Error procesando la imagen en el servidor.';
          if (err.error?.error) {
            userError = `Error del servidor: ${err.error.error}`;
          } else if (err.status === 0 || err.status === 503) {
            userError = 'No se pudo conectar con el servidor de análisis. Verifica tu conexión e intenta de nuevo.'
          } else if (err.status === 400) {
            userError = err.error?.error || 'Error en la petición (¿archivo inválido o tipo no soportado?).';
          } else if (err.status === 405) {
            userError = 'Error interno del servidor (Método no permitido). Contacta soporte.';
          }
          this.errorMessage.set(userError);
          this.addExpenseItem();
          this.isLoading.set(false);
        }
      });
  }

  onSubmit(): void {
    if (this.multiExpenseForm.invalid) {
      console.error("Formulario inválido.");
      this.multiExpenseForm.markAllAsTouched();
      return;
    }
    const itemsToSave = this.expenseItems.value.filter(
      (item: any) => item.description && item.amount && item.category
    );

    if (itemsToSave.length === 0) {
      this.errorMessage.set("No hay gastos válidos para guardar.");
      return;
    }

    let savedCount = 0;
    itemsToSave.forEach((item: any) => {
      this.financialService.addTransaction({
        description: item.description,
        amount: item.amount,
        category: item.category,
        note: item.note // Guardar la nota
      });
      savedCount++;
    });
    console.log(`Guardadas ${savedCount} transacciones.`);
    this.router.navigate(['/']);
  }
}