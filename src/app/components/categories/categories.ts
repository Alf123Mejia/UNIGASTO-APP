// src/app/components/categories/categories.component.ts
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { FinancialService } from '../../services/financial';

@Component({
  selector: 'app-categories',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './categories.html',
  styleUrl: './categories.scss'
})
export class Categories {
  private financialService = inject(FinancialService);
  categories = this.financialService.allCategories;
  newCategoryName: string = '';

  addCategory(): void {
    if (this.newCategoryName.trim()) {
      this.financialService.addCategory({ name: this.newCategoryName.trim(), icon: 'fas fa-tag', color: '#ff7f50' });
      this.newCategoryName = '';
    }
  }
}