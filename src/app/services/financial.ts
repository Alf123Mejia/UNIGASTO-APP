// src/app/services/financial.ts
import { Injectable, signal, computed, effect } from '@angular/core';

export interface Category { name: string; icon: string; color: string; }
export interface Transaction { id: number; description: string; note?: string; date: string; amount: number; category: string; icon: string; iconColor: string; }
export interface Notification { id: number; title: string; message: string; icon: string; type: 'info' | 'warning' | 'transaction' | 'budget' | 'goal'; date: string; isRead: boolean; }

const initialCategories: Category[] = [
    { name: 'Supermercado', icon: 'fas fa-shopping-cart', color: '#2ecc71' },
    { name: 'Restaurantes', icon: 'fas fa-utensils', color: '#e74c3c' },
    { name: 'Comida Rápida', icon: 'fas fa-hamburger', color: '#f39c12' },
    { name: 'Cafés y Postres', icon: 'fas fa-coffee', color: '#9b59b6' },
    { name: 'Antojos y Calle', icon: 'fas fa-store', color: '#f1c40f' },
    { name: 'Transporte', icon: 'fas fa-car', color: '#3498db' },
    { name: 'Delivery', icon: 'fas fa-box', color: '#1abc9c' },
    { name: 'Ropa y Calzado', icon: 'fas fa-tshirt', color: '#e67e22' },
    { name: 'Accesorios y Belleza', icon: 'fas fa-gem', color: '#34495e' },
    { name: 'Compras Varias', icon: 'fas fa-dolly', color: '#95a5a6' },
    { name: 'Suscripciones', icon: 'fas fa-sync-alt', color: '#c0392b' },
    { name: 'Servicios del Hogar', icon: 'fas fa-bolt', color: '#7f8c8d' },
    { name: 'Ocio y Salidas', icon: 'fas fa-glass-cheers', color: '#16a085' },
    { name: 'Hobbies y Pasatiempos', icon: 'fas fa-gamepad', color: '#2980b9' },
    { name: 'Salud y Bienestar', icon: 'fas fa-heartbeat', color: '#8e44ad' },
    { name: 'Educación', icon: 'fas fa-graduation-cap', color: '#2c3e50' },
    { name: 'Otros Gastos', icon: 'fas fa-tag', color: '#bdc3c7' },
    { name: 'Ahorro', icon: 'fas fa-piggy-bank', color: '#5dade2' },
    { name: 'Ingresos', icon: 'fas fa-money-bill-wave', color: '#27ae60' }
];

const initialTransactions: Transaction[] = [];
const INITIAL_KEYWORDS: { [key: string]: string[] } = { /* ... (Mismo diccionario que ya tienes) ... */ }; // Puedes dejar tu diccionario lleno
const STOP_WORDS = ['un', 'una', 'de', 'la', 'el', 'los', 'las', 'con', 'mi', 'para', 'en', 'y', 'o', 'a'];

function loadFromLocalStorage<T>(key: string, defaultValue: T): T {
  const storedValue = localStorage.getItem(key);
  if (storedValue) { try { return JSON.parse(storedValue); } catch (e) { return defaultValue; } }
  return defaultValue;
}

@Injectable({ providedIn: 'root' })
export class FinancialService {
  private readonly KEYS = {
    transactions: 'unigasto_transactions', categories: 'unigasto_categories', budget: 'unigasto_budget',
    savingsGoal: 'unigasto_savingsGoal', totalSaved: 'unigasto_totalSaved', notifications: 'unigasto_notifications',
    keywords: 'unigasto_keywords', profileImage: 'unigasto_profileImage', userName: 'unigasto_userName'
  };

  private transactionsSignal = signal<Transaction[]>(loadFromLocalStorage(this.KEYS.transactions, initialTransactions));
  private categoriesSignal = signal<Category[]>(loadFromLocalStorage(this.KEYS.categories, initialCategories));
  private budgetSignal = signal<number>(loadFromLocalStorage(this.KEYS.budget, 100.00));
  private totalSavedSignal = signal<number>(loadFromLocalStorage(this.KEYS.totalSaved, 0));
  private savingsGoalSignal = signal<number>(loadFromLocalStorage(this.KEYS.savingsGoal, 100.00));
  private notificationsSignal = signal<Notification[]>(loadFromLocalStorage(this.KEYS.notifications, []));
  private keywordsSignal = signal<{ [key: string]: string[] }>(loadFromLocalStorage(this.KEYS.keywords, INITIAL_KEYWORDS));
  private profileImageSignal = signal<string>(loadFromLocalStorage(this.KEYS.profileImage, ''));
  private userNameSignal = signal<string>(loadFromLocalStorage(this.KEYS.userName, 'Usuario'));

  private totalExpensesSignal = computed(() => {
    return this.transactionsSignal().filter(t => t.amount < 0 && t.category !== 'Ahorro').reduce((acc, t) => acc + Math.abs(t.amount), 0);
  });

  private balanceSignal = computed(() => {
    return this.transactionsSignal().reduce((acc, t) => acc + t.amount, 0);
  });

  public balance = this.balanceSignal;
  public totalExpenses = this.totalExpensesSignal;
  public budget = this.budgetSignal.asReadonly();
  public transactions = this.transactionsSignal.asReadonly();
  public allCategories = this.categoriesSignal.asReadonly();
  public notifications = this.notificationsSignal.asReadonly();
  public currentSavings = this.totalSavedSignal.asReadonly();
  public savingsGoal = this.savingsGoalSignal.asReadonly();
  public profileImage = this.profileImageSignal.asReadonly();
  public userName = this.userNameSignal.asReadonly();

  constructor() {
    effect(() => {
      localStorage.setItem(this.KEYS.transactions, JSON.stringify(this.transactionsSignal()));
      localStorage.setItem(this.KEYS.categories, JSON.stringify(this.categoriesSignal()));
      localStorage.setItem(this.KEYS.budget, JSON.stringify(this.budgetSignal()));
      localStorage.setItem(this.KEYS.savingsGoal, JSON.stringify(this.savingsGoalSignal()));
      localStorage.setItem(this.KEYS.totalSaved, JSON.stringify(this.totalSavedSignal()));
      localStorage.setItem(this.KEYS.notifications, JSON.stringify(this.notificationsSignal()));
      localStorage.setItem(this.KEYS.keywords, JSON.stringify(this.keywordsSignal()));
      localStorage.setItem(this.KEYS.profileImage, JSON.stringify(this.profileImageSignal()));
      localStorage.setItem(this.KEYS.userName, JSON.stringify(this.userNameSignal()));
    });
  }

  setBudget(amount: number) { this.budgetSignal.set(amount); this.checkAndGenerateAlerts(); }
  setSavingsGoal(amount: number) { this.savingsGoalSignal.set(amount); }
  setProfileImage(imageBase64: string) { this.profileImageSignal.set(imageBase64); }
  setUserName(name: string) { this.userNameSignal.set(name); }

  private learnKeywords(description: string, category: string): void {
    if (!description) return;
    const keywords = this.keywordsSignal();
    const words = (description.toLowerCase().match(/\b[a-z\u00E0-\u00FC]+\b/g) || []).filter(word => word.length > 2 && !STOP_WORDS.includes(word));
    let updated = false;
    if (!keywords[category]) { keywords[category] = []; }
    for (const word of words) {
      if (!keywords[category].includes(word)) { keywords[category].push(word); updated = true; }
    }
    if (updated) { this.keywordsSignal.set({ ...keywords }); }
  }

  getSuggestedCategory(description: string): { category: string, isExpense: boolean } | null {
    if (!description) return null;
    const lower = description.toLowerCase();
    const keywords = this.keywordsSignal();
    for (const cat in keywords) {
      for (const word of keywords[cat]) {
        if (lower.includes(word)) { return { category: cat, isExpense: cat !== 'Ingresos' }; }
      }
    }
    return null;
  }

  addTransaction(data: any): void {
    const isSaving = data.category === 'Ahorro';
    let amount = isSaving ? -Math.abs(data.amount) : (data.category === 'Ingresos' ? Math.abs(data.amount) : -Math.abs(data.amount));
    
    const catInfo = this.categoriesSignal().find(c => c.name === data.category);
    const newTrans: Transaction = {
      id: Date.now(), description: data.description, note: data.note, date: data.date || new Date().toISOString(),
      amount: amount, category: data.category, icon: catInfo?.icon || 'fas fa-question', iconColor: catInfo?.color || '#333'
    };

    this.transactionsSignal.update(curr => [newTrans, ...curr]);
    if (!isSaving) this.learnKeywords(data.description, data.category);
    if (isSaving) this.totalSavedSignal.update(s => s + Math.abs(data.amount));
    
    // SIEMPRE verificar alertas después de añadir, si no es ahorro
    if (amount < 0 && !isSaving) { 
        this.checkAndGenerateAlerts();
        this.checkFrequencyAlerts(data.category);
    }
  }

  updateTransaction(updated: Transaction): void {
      const current = this.transactionsSignal();
      const original = current.find(t => t.id === updated.id);
      if (!original) return;
      
      if (updated.category === 'Ahorro' || updated.category !== 'Ingresos') updated.amount = -Math.abs(updated.amount);
      else updated.amount = Math.abs(updated.amount);

      this.transactionsSignal.update(curr => curr.map(t => t.id === updated.id ? updated : t));

      if (original.category === 'Ahorro' || updated.category === 'Ahorro') {
          let diff = 0;
          if (original.category === 'Ahorro') diff -= Math.abs(original.amount);
          if (updated.category === 'Ahorro') diff += Math.abs(updated.amount);
          if (diff !== 0) this.totalSavedSignal.update(s => s + diff);
      }
      // Verificar alertas al actualizar también
      if (updated.amount < 0 && updated.category !== 'Ahorro') this.checkAndGenerateAlerts();
  }

  deleteTransaction(id: number): void {
      const current = this.transactionsSignal();
      const toDelete = current.find(t => t.id === id);
      if (!toDelete) return;
      this.transactionsSignal.update(curr => curr.filter(t => t.id !== id));
      if (toDelete.category === 'Ahorro') this.totalSavedSignal.update(s => s - Math.abs(toDelete.amount));
  }

  addCategory(cat: Category): void { this.categoriesSignal.update(c => [...c, cat]); }

  addNotification(notification: Omit<Notification, 'isRead' | 'id'>): void {
    const today = new Date().toDateString();
    const exists = this.notificationsSignal().some(n => 
        n.title === notification.title && n.message === notification.message && new Date(n.date).toDateString() === today
    );
    if (!exists) {
        this.notificationsSignal.update(curr => [{ ...notification, id: Date.now(), isRead: false }, ...curr]);
    }
  }

  markAsRead(id: number): void { this.notificationsSignal.update(n => n.map(notif => notif.id === id ? { ...notif, isRead: true } : notif)); }
  markAllAsRead(): void { this.notificationsSignal.update(n => n.map(notif => ({ ...notif, isRead: true }))); }
  getUnreadNotificationsCount(): number { return this.notificationsSignal().filter(n => !n.isRead).length; }

  // --- CORRECCIÓN: Alertas robustas ---
  private checkAndGenerateAlerts(): void {
    const budget = this.budgetSignal();
    if (budget <= 0) return; // No alertar si no hay presupuesto

    const usage = this.budgetUsage;
    // Quitamos la restricción de "lastTransaction" para que funcione al cambiar el presupuesto
    if (usage >= 100) { 
        this.addNotification({title: 'Presupuesto Excedido', message: `Te has pasado del 100% de tu presupuesto.`, icon: 'fas fa-exclamation-circle', type: 'budget', date: new Date().toISOString()}); 
    } else if (usage >= 90) { 
        this.addNotification({title: 'Alerta de Presupuesto', message: `Has usado el ${usage.toFixed(0)}% de tu presupuesto mensual.`, icon: 'fas fa-exclamation-triangle', type: 'budget', date: new Date().toISOString()}); 
    }
  }

  private checkFrequencyAlerts(categoryName: string): void {
      const riskCategories = ['Comida Rápida', 'Antojos y Calle', 'Cafés y Postres', 'Ocio y Salidas'];
      if (!riskCategories.includes(categoryName)) return;
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      const count = this.transactionsSignal().filter(t => t.category === categoryName && new Date(t.date) >= oneWeekAgo && t.amount < 0).length;
      if (count >= 3) { 
          this.addNotification({title: `Cuidado con ${categoryName}`, message: `Has gastado ${count} veces en ${categoryName} esta semana.`, icon: 'fas fa-chart-line', type: 'warning', date: new Date().toISOString()}); 
      }
  }

  get budgetUsage(): number {
    const budget = this.budgetSignal();
    if (budget <= 0) return 0;
    return (this.totalExpensesSignal() / budget) * 100;
  }
}