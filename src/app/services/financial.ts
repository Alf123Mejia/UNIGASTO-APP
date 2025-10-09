// src/app/services/financial.ts

import { Injectable, signal, computed, effect } from '@angular/core';

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

// --- DATOS INICIALES COMPLETOS ---
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
      description: 'Salario Mensual',
      date: new Date().toISOString(), 
      amount: 750.00,
      category: 'Salario',
      icon: 'fas fa-money-bill-wave',
      iconColor: '#9966ff',
    }
];

// --- FUNCIÓN AUXILIAR ---
function loadFromLocalStorage<T>(key: string, defaultValue: T): T {
  const storedValue = localStorage.getItem(key);
  if (storedValue) {
    try {
      return JSON.parse(storedValue);
    } catch (e) {
      console.error('Error parsing localStorage item:', key, e);
      return defaultValue;
    }
  }
  return defaultValue;
}

@Injectable({
  providedIn: 'root'
})
export class FinancialService {

  // Objeto KEYS COMPLETO
  private readonly KEYS = {
    transactions: 'unigasto_transactions',
    categories: 'unigasto_categories',
    budget: 'unigasto_budget',
    savingsGoal: 'unigasto_savingsGoal',
    totalSaved: 'unigasto_totalSaved',
    notifications: 'unigasto_notifications'
  };

  // --- SEÑALES DE ESTADO PRINCIPAL ---
  private transactionsSignal = signal<Transaction[]>(loadFromLocalStorage(this.KEYS.transactions, initialTransactions));
  private categoriesSignal = signal<Category[]>(loadFromLocalStorage(this.KEYS.categories, initialCategories));
  private budgetSignal = signal<number>(loadFromLocalStorage(this.KEYS.budget, 1200.00));
  private totalSavedSignal = signal<number>(loadFromLocalStorage(this.KEYS.totalSaved, 2500.00));
  private savingsGoalSignal = signal<number>(loadFromLocalStorage(this.KEYS.savingsGoal, 5000.00));
  private notificationsSignal = signal<Notification[]>(loadFromLocalStorage(this.KEYS.notifications, []));
  
  // --- SEÑALES DERIVADAS (COMPUTADAS) ---
  private totalExpensesSignal = computed(() => {
    return this.transactionsSignal()
      .filter(t => t.amount < 0)
      .reduce((acc, t) => acc + Math.abs(t.amount), 0);
  });

  private balanceSignal = computed(() => {
    const income = this.transactionsSignal()
      .filter(t => t.amount > 0)
      .reduce((acc, t) => acc + t.amount, 0);
    return income - this.totalExpensesSignal() + this.totalSavedSignal();
  });

  // --- SEÑALES PÚBLICAS ---
  balance = this.balanceSignal;
  totalExpenses = this.totalExpensesSignal;
  budget = this.budgetSignal.asReadonly();
  transactions = this.transactionsSignal.asReadonly();
  allCategories = this.categoriesSignal.asReadonly();
  notifications = this.notificationsSignal.asReadonly();
  currentSavings = this.totalSavedSignal.asReadonly();
  savingsGoal = this.savingsGoalSignal.asReadonly();

  constructor() {
    effect(() => {
      localStorage.setItem(this.KEYS.transactions, JSON.stringify(this.transactionsSignal()));
      localStorage.setItem(this.KEYS.categories, JSON.stringify(this.categoriesSignal()));
      localStorage.setItem(this.KEYS.budget, JSON.stringify(this.budgetSignal()));
      localStorage.setItem(this.KEYS.savingsGoal, JSON.stringify(this.savingsGoalSignal()));
      localStorage.setItem(this.KEYS.totalSaved, JSON.stringify(this.totalSavedSignal()));
      localStorage.setItem(this.KEYS.notifications, JSON.stringify(this.notificationsSignal()));
      console.log('Datos persistidos en localStorage.');
    });
  }

  // --- MÉTODOS ---
  addTransaction(newTransaction: Omit<Transaction, 'id' | 'icon' | 'iconColor'>): void {
    const categoryInfo = this.categoriesSignal().find(cat => cat.name === newTransaction.category);
    const fullTransaction: Transaction = {
      ...newTransaction, id: Date.now(),
      icon: categoryInfo?.icon || 'fas fa-question-circle',
      iconColor: categoryInfo?.color || '#333'
    };
    this.transactionsSignal.update(current => [fullTransaction, ...current]);
    this.checkAndGenerateAlerts();
  }
  
  updateTransaction(updatedTransaction: Transaction): void {
    this.transactionsSignal.update(current => 
      current.map(t => t.id === updatedTransaction.id ? updatedTransaction : t)
    );
    this.checkAndGenerateAlerts();
  }

  deleteTransaction(transactionId: number): void {
    this.transactionsSignal.update(current => 
      current.filter(t => t.id !== transactionId)
    );
    this.checkAndGenerateAlerts();
  }
  
  addCategory(newCategory: Category): void {
    this.categoriesSignal.update(currentCategories => [...currentCategories, newCategory]);
  }
  
  addNotification(notification: Omit<Notification, 'isRead'>): void {
    const alreadyExists = this.notificationsSignal().some(n => n.title === notification.title && n.message === notification.message);
    if (!alreadyExists) {
        this.notificationsSignal.update(currentNotifications => [
          { ...notification, isRead: false },
          ...currentNotifications
        ]);
    }
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

  private checkAndGenerateAlerts(): void {
    const usage = this.budgetUsage;
    if (usage >= 100) {
       this.addNotification({
        id: Date.now(),
        title: 'Presupuesto Excedido',
        message: `Te has pasado del 100% de tu presupuesto.`,
        icon: 'fas fa-exclamation-circle',
        type: 'budget',
        date: new Date().toISOString(),
      });
    } else if (usage >= 90) {
      this.addNotification({
        id: Date.now(),
        title: 'Alerta de Presupuesto',
        message: `Has usado el ${usage.toFixed(0)}% de tu presupuesto mensual.`,
        icon: 'fas fa-exclamation-triangle',
        type: 'budget',
        date: new Date().toISOString(),
      });
    }
  }

  get budgetUsage(): number {
    const budget = this.budgetSignal();
    if (budget === 0) return 0;
    return (this.totalExpensesSignal() / budget) * 100;
  }
}