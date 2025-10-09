import { Injectable, signal, computed } from '@angular/core';

// --- INTERFACES ---
export interface Category {
  name: string;
  icon: string;
  color: string;
}

export interface Transaction {
  id: number;
  description: string;
  date: string;
  amount: number;
  category: string;
  icon: string;
  iconColor: string;
}

export interface Notification {
  id: number;
  title: string;
  message: string;
  icon: string;
  type: 'info' | 'warning' | 'transaction' | 'budget' | 'goal';
  date: string;
  isRead: boolean;
}

// --- DATOS INICIALES ---
const initialCategories: Category[] = [
  { name: 'Comida', icon: 'fas fa-utensils', color: '#ff6384' },
  { name: 'Transporte', icon: 'fas fa-car', color: '#36a2eb' },
  { name: 'Compras', icon: 'fas fa-shopping-bag', color: '#cc65fe' },
  { name: 'Entretenimiento', icon: 'fas fa-film', color: '#ffce56' },
  { name: 'Alquiler', icon: 'fas fa-home', color: '#4bc0c0' },
  { name: 'Salario', icon: 'fas fa-money-bill-wave', color: '#9966ff' }
];

const initialTransactions: Transaction[] = [
  {
    id: 1,
    description: 'Salario',
    date: '18:27 - Abril 30',
    amount: 750.00,
    category: 'Salario',
    icon: 'fas fa-money-bill-wave',
    iconColor: '#fdd835',
  },
  {
    id: 2,
    description: 'Mercado',
    date: '17:00 - Abril 24',
    amount: -40.00,
    category: 'Compras',
    icon: 'fas fa-shopping-bag',
    iconColor: '#fdd835',
  },
  {
    id: 3,
    description: 'Alquiler',
    date: '8:30 - Abril 15',
    amount: -300.00,
    category: 'Alquiler',
    icon: 'fas fa-home',
    iconColor: '#fdd835',
  }
];

// --- SERVICIO PRINCIPAL ---
@Injectable({
  providedIn: 'root'
})
export class FinancialService {

  // --- SEÑALES PRIVADAS ---
  private balanceSignal = signal(0);
  private totalExpensesSignal = signal(0);
  private budgetSignal = signal(1200.00);
  private transactionsSignal = signal<Transaction[]>(initialTransactions);
  private categoriesSignal = signal<Category[]>(initialCategories);
  private notificationsSignal = signal<Notification[]>([]);
  private totalSavedSignal = signal(2500.00);
  private savingsGoalSignal = signal(5000.00);
  private lowBalanceAlertThreshold = signal(100.00);

  // --- SEÑALES PÚBLICAS (solo lectura) ---
  balance = this.balanceSignal.asReadonly();
  totalExpenses = this.totalExpensesSignal.asReadonly();
  budget = this.budgetSignal.asReadonly();
  transactions = this.transactionsSignal.asReadonly();
  allCategories = this.categoriesSignal.asReadonly();
  notifications = this.notificationsSignal.asReadonly();
  currentSavings = this.totalSavedSignal.asReadonly();
  savingsGoal = this.savingsGoalSignal.asReadonly();
  
  // --- CONSTRUCTOR ---
  constructor() {
    this._calculateTotals();
    this.checkAndGenerateAlerts();
  }

  // --- MÉTODOS PÚBLICOS ---
  addCategory(newCategory: Category): void {
    this.categoriesSignal.update(currentCategories => [...currentCategories, newCategory]);
  }

  addTransaction(newTransaction: Transaction): void {
    const categoryInfo = this.categoriesSignal().find(cat => cat.name === newTransaction.category);
    const categoryIcon = categoryInfo?.icon || 'fas fa-question-circle';
    const categoryColor = categoryInfo?.color || '#333';
    
    this.transactionsSignal.update(currentTransactions => [
      { ...newTransaction, id: Date.now(), icon: categoryIcon, iconColor: categoryColor },
      ...currentTransactions
    ]);
    this._calculateTotals();
    this.checkAndGenerateAlerts();
  }
  
  // NUEVO: Método para actualizar una transacción existente
  updateTransaction(updatedTransaction: Transaction): void {
    this.transactionsSignal.update(currentTransactions => 
      currentTransactions.map(trans => 
        trans.id === updatedTransaction.id ? updatedTransaction : trans
      )
    );
    this._calculateTotals();
    this.checkAndGenerateAlerts();
  }

  // NUEVO: Método para eliminar una transacción por su ID
  deleteTransaction(transactionId: number): void {
    this.transactionsSignal.update(currentTransactions => 
      currentTransactions.filter(trans => trans.id !== transactionId)
    );
    this._calculateTotals();
    this.checkAndGenerateAlerts();
  }

  addNotification(notification: Notification): void {
    this.notificationsSignal.update(currentNotifications => [
      { ...notification, isRead: false },
      ...currentNotifications
    ]);
  }
  
  markAsRead(notificationId: number): void {
    this.notificationsSignal.update(currentNotifications => 
      currentNotifications.map(notif => 
        notif.id === notificationId ? { ...notif, isRead: true } : notif
      )
    );
  }

  markAllAsRead(): void {
    this.notificationsSignal.update(notifications => notifications.map(notif => ({ ...notif, isRead: true })));
  }

  getUnreadNotificationsCount(): number {
    return this.notificationsSignal().filter(notif => !notif.isRead).length;
  }
  
  setSavingsGoal(goal: number) {
    this.savingsGoalSignal.set(goal);
  }

  transferToSavings(amount: number) {
    if (this.balanceSignal() >= amount) {
      this.balanceSignal.update(balance => balance - amount);
      this.totalSavedSignal.update(savings => savings + amount);
      this.addNotification({
        id: Date.now(),
        title: 'Transferencia Exitosa',
        message: `Has transferido ${amount}$ a tus ahorros.`,
        icon: 'fas fa-piggy-bank',
        type: 'goal',
        date: new Date().toLocaleString(),
        isRead: false
      });
      this.checkAndGenerateAlerts();
      return true;
    }
    this.addNotification({
      id: Date.now(),
      title: 'Transferencia Fallida',
      message: 'Saldo insuficiente para realizar la transferencia.',
      icon: 'fas fa-exclamation-circle',
      type: 'warning',
      date: new Date().toLocaleString(),
      isRead: false
    });
    return false;
  }

  // --- MÉTODOS PRIVADOS ---
  private _calculateTotals(): void {
    let newBalance = this.totalSavedSignal();
    let newExpenses = 0;

    this.transactionsSignal().forEach(transaction => {
      newBalance += transaction.amount;
      if (transaction.amount < 0) {
        newExpenses += Math.abs(transaction.amount);
      }
    });

    this.balanceSignal.set(newBalance);
    this.totalExpensesSignal.set(newExpenses);
  }

  private checkAndGenerateAlerts(): void {
    const usage = this.budgetUsage;
    if (usage >= 90 && usage < 100) {
      this.addNotification({
        id: Date.now(),
        title: 'Alerta de Presupuesto',
        message: `Has usado el ${usage.toFixed(0)}% de tu presupuesto mensual.`,
        icon: 'fas fa-exclamation-triangle',
        type: 'budget',
        date: new Date().toLocaleString(),
        isRead: false
      });
    } else if (usage >= 100) {
       this.addNotification({
        id: Date.now(),
        title: 'Presupuesto Excedido',
        message: `Te has pasado del 100% de tu presupuesto.`,
        icon: 'fas fa-exclamation-circle',
        type: 'budget',
        date: new Date().toLocaleString(),
        isRead: false
      });
    }

    if (this.balanceSignal() < this.lowBalanceAlertThreshold()) {
      this.addNotification({
        id: Date.now(),
        title: '¡Alerta de Saldo Bajo!',
        message: `Tu balance es de ${this.balanceSignal().toFixed(2)}$, por debajo del umbral de ${this.lowBalanceAlertThreshold()}$.` ,
        icon: 'fas fa-wallet',
        type: 'warning',
        date: new Date().toLocaleString(),
        isRead: false
      });
    }
    
    if (this.totalSavedSignal() >= this.savingsGoalSignal()) {
      this.addNotification({
        id: Date.now(),
        title: '¡Meta de Ahorro Alcanzada!',
        message: `Has alcanzado tu meta de ${this.savingsGoalSignal()}$. ¡Felicidades!`,
        icon: 'fas fa-trophy',
        type: 'goal',
        date: new Date().toLocaleString(),
        isRead: false
      });
    }
  }

  // --- GETTER ---
  get budgetUsage(): number {
    return (this.totalExpensesSignal() / this.budgetSignal()) * 100;
  }
}