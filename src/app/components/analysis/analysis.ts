import { Component, inject, computed, Signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ChartOptions, ChartData, Chart } from 'chart.js';
import { NgChartsModule } from 'ng2-charts';
import { FinancialService } from '../../services/financial';

// 1. IMPORTAMOS EL PLUGIN
import ChartDataLabels from 'chartjs-plugin-datalabels';

// 2. REGISTRAMOS EL PLUGIN
Chart.register(ChartDataLabels);

@Component({
  selector: 'app-analysis',
  standalone: true,
  imports: [CommonModule, RouterModule, NgChartsModule],
  templateUrl: './analysis.html',
  styleUrls: ['./analysis.scss']
})
export class AnalysisComponent {
  private financialService = inject(FinancialService);

  public pieChartOptions: ChartOptions<'pie'> = {
    responsive: true,
    plugins: {
      legend: {
        position: 'bottom',
        align: 'center',
        labels: {
          boxWidth: 20,
          padding: 15,
          font: {
            size: 10,
          },
        },
      },
      // 3. AÑADIMOS LA CONFIGURACIÓN PARA MOSTRAR PORCENTAJES
      datalabels: {
        formatter: (value, ctx) => {
          if (value === 0) {
            return ''; // No mostrar etiqueta si el valor es 0
          }
          const sum = (ctx.chart.data.datasets[0].data as number[]).reduce((a, b) => a + b, 0);
          const percentage = ((value * 100) / sum).toFixed(1) + '%';
          return percentage;
        },
        color: '#fff', // Color del texto de porcentaje
        font: {
          weight: 'bold',
        },
      },
    },
    layout: {
      padding: 10
    }
  };
  public pieChartType = 'pie';

  public pieChartData: Signal<ChartData<'pie'>> = computed(() => {
    const labels = this.financialService.allCategories().map(cat => cat.name);
    const colors = this.financialService.allCategories().map(cat => cat.color || '#333');

    const expensesByCategory: { [key: string]: number } = {};
    this.financialService.transactions().forEach(trans => {
      if (trans.amount < 0) {
        const category = trans.category;
        expensesByCategory[category] = (expensesByCategory[category] || 0) + Math.abs(trans.amount);
      }
    });
    
    const dataPoints = labels.map(label => expensesByCategory[label] || 0);

    return {
      labels: labels,
      datasets: [
        {
          data: dataPoints,
          backgroundColor: colors
        }
      ]
    };
  });
}