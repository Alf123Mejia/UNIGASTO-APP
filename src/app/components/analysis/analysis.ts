// src/app/components/analysis/analysis.ts
import { Component, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgChartsModule } from 'ng2-charts';
import { ChartConfiguration, ChartData, ChartType } from 'chart.js';
import DataLabelsPlugin from 'chartjs-plugin-datalabels';
import { Header } from '../header/header';
import { FinancialService } from '../../services/financial';

@Component({
  selector: 'app-analysis',
  standalone: true,
  imports: [CommonModule, NgChartsModule, Header],
  templateUrl: './analysis.html',
  styleUrls: ['./analysis.scss']
})
export class AnalysisComponent {
  public financialService = inject(FinancialService); // Cambiado a public para usarlo en el HTML
  
  // --- GRÁFICA DE PASTEL ---
  // CORRECCIÓN: Añadimos '| any' para que TypeScript acepte 'datalabels'
  public pieChartOptions: ChartConfiguration['options'] | any = {
    responsive: true,
    maintainAspectRatio: false, // Importante para controlar altura
    plugins: {
      legend: {
        display: true,
        position: 'right', // Leyenda a la derecha para ahorrar espacio vertical
        labels: { font: { size: 11 }, boxWidth: 12 }
      },
      datalabels: {
        formatter: (value: any, ctx: any) => {
          if (ctx.chart.data.labels) {
            return ctx.chart.data.labels[ctx.dataIndex];
          }
          return '';
        },
        display: false, // Ocultar etiquetas sobre la gráfica para limpieza
      },
    }
  };

  public pieChartType: ChartType = 'doughnut'; // Dona se ve más moderno
  public pieChartPlugins = [DataLabelsPlugin];

  // Signal para datos de la gráfica
  pieChartData = computed(() => {
    const transactions = this.financialService.transactions();
    const expensesByCategory: { [key: string]: number } = {};
    
    // Agrupar gastos
    transactions.filter(t => t.amount < 0 && t.category !== 'Ahorro').forEach(t => {
      const amount = Math.abs(t.amount);
      expensesByCategory[t.category] = (expensesByCategory[t.category] || 0) + amount;
    });

    // Preparar datos para Chart.js
    const labels = Object.keys(expensesByCategory);
    const data = Object.values(expensesByCategory);
    const colors = labels.map(catName => {
        const cat = this.financialService.allCategories().find(c => c.name === catName);
        return cat ? cat.color : '#ccc';
    });

    return {
      labels: labels,
      datasets: [{ data: data, backgroundColor: colors, hoverBackgroundColor: colors, borderWidth: 0 }]
    };
  });

  // --- LISTA DE TOP GASTOS ---
  topExpenses = computed(() => {
      const transactions = this.financialService.transactions();
      const expensesByCategory: { [key: string]: { amount: number, color: string, icon: string } } = {};
      let total = 0;

      transactions.filter(t => t.amount < 0 && t.category !== 'Ahorro').forEach(t => {
          const amount = Math.abs(t.amount);
          total += amount;
          if (!expensesByCategory[t.category]) {
              const cat = this.financialService.allCategories().find(c => c.name === t.category);
              expensesByCategory[t.category] = { amount: 0, color: cat?.color || '#ccc', icon: cat?.icon || 'fas fa-tag' };
          }
          expensesByCategory[t.category].amount += amount;
      });

      // Convertir a array y ordenar
      return Object.entries(expensesByCategory)
          .map(([name, data]) => ({
              name,
              amount: data.amount,
              percentage: total > 0 ? (data.amount / total) * 100 : 0,
              color: data.color,
              icon: data.icon
          }))
          .sort((a, b) => b.amount - a.amount); // Orden descendente
  });
}