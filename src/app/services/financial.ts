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
  note?: string;
  date: string; // ISO String format
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
  date: string; // ISO String format
  isRead: boolean;
}

// --- DATOS INICIALES ---
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
const INITIAL_KEYWORDS: { [key: string]: string[] } = {
  'Supermercado': ['súper selectos', 'walmart', 'despensa', 'pricesmart', 'keny', 'baratillo', 'mercado'],
  'Restaurantes': ['pampa', 'tony', 'olive', 'rustico', 'pueblo', 'zocalo', 'siciliana', 'crepe', 'sushi', 'lomo'],
  'Comida Rápida': ['mcdonald', 'burger', 'wendy', 'pizza', 'papa', 'caesar', 'subway', 'quiznos', 'campero', 'pollo', 'donut', 'china', 'donkeys', 'kfc', 'taco'],
  'Cafés y Postres': ['starbucks', 'juan valdez', 'ben', 'coffee', 'espresso', 'ban ban', 'neveria', 'boston', 'llao', 'sarita'],
  'Antojos y Calle': ['pupusas', 'elotes', 'yuca', 'panes', 'empanadas', 'pastelitos', 'churros', 'minutas', 'sorbete', 'típicos'],
  'Transporte': ['gasolina', 'texaco', 'uno', 'puma', 'acsa', 'epic', 'uber', 'indrive', 'taxi', 'bus'],
  'Delivery': ['pedidosya', 'hugo', 'uber', 'delivery', 'mandadito'],
  'Ropa y Calzado': ['siman', 'zara', 'bershka', 'pull', 'stradivarius', 'forever', 'md', 'eagle', 'payless', 'adoc', 'nike', 'adidas'],
  'Accesorios y Belleza': ['kiko', 'maquillaje', 'perfume', 'cremas', 'salon', 'barberia', 'reloj', 'lentes', 'claire'],
  'Compras Varias': ['dollar', 'miniso', 'ylufa', 'chinos', 'amazon', 'temu', 'shein', 'ebay'],
  'Suscripciones': ['netflix', 'spotify', 'hbo', 'disney', 'prime', 'apple', 'youtube', 'crunchyroll', 'icloud', 'google', 'adobe', 'canva'],
  'Servicios del Hogar': ['luz', 'aes', 'caess', 'agua', 'anda', 'tigo', 'claro', 'internet', 'alquiler', 'renta'],
  'Ocio y Salidas': ['cine', 'cinepolis', 'cinemark', 'bar', 'discoteca', 'tunco', 'paseo', 'volcan', 'lago', 'concierto', 'fiesta', 'entrada'],
  'Hobbies y Pasatiempos': ['steam', 'playstation', 'nintendo', 'xbox', 'fortnite', 'videojuego', 'valakut', 'carisma', 'libros', 'libreria'],
  'Salud y Bienestar': ['farmacia', 'nicolas', 'value', 'medicinas', 'smartfit', 'gimnasio', 'gym', 'medico', 'dentista'],
  'Educación': ['universidad', 'ufg', 'uca', 'ues', 'matias', 'evangelica', 'matricula', 'colegiatura', 'cuota', 'libros', 'fotocopias'],
  'Otros Gastos': ['mascota', 'veterinario', 'regalo', 'donacion', 'ferreteria', 'vidri', 'freund', 'cajero'],
  'Ahorro': ['ahorro', 'guardar', 'meta', 'alcancia'],
  'Ingresos': ['salario', 'pago', 'nomina', 'mesada', 'remesa', 'beca', 'freelance', 'venta', 'aguinaldo']
};
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

  // --- SEÑALES ---
  private transactionsSignal = signal<Transaction[]>(loadFromLocalStorage(this.KEYS.transactions, initialTransactions));
  private categoriesSignal = signal<Category[]>(loadFromLocalStorage(this.KEYS.categories, initialCategories));
  private budgetSignal = signal<number>(loadFromLocalStorage(this.KEYS.budget, 1200.00));
  private totalSavedSignal = signal<number>(loadFromLocalStorage(this.KEYS.totalSaved, 0));
  private savingsGoalSignal = signal<number>(loadFromLocalStorage(this.KEYS.savingsGoal, 500.00));
  private notificationsSignal = signal<Notification[]>(loadFromLocalStorage(this.KEYS.notifications, []));
  private keywordsSignal = signal<{ [key: string]: string[] }>(loadFromLocalStorage(this.KEYS.keywords, INITIAL_KEYWORDS));
  private profileImageSignal = signal<string>(loadFromLocalStorage(this.KEYS.profileImage, ''));
  private userNameSignal = signal<string>(loadFromLocalStorage(this.KEYS.userName, 'Usuario'));

  // --- COMPUTADAS ---
  private totalExpensesSignal = computed(() => {
    return this.transactionsSignal()
      .filter(t => t.amount < 0 && t.category !== 'Ahorro')
      .reduce((acc, t) => acc + Math.abs(t.amount), 0);
  });

  private balanceSignal = computed(() => {
    return this.transactionsSignal().reduce((acc, t) => acc + t.amount, 0);
  });

  // --- PÚBLICAS ---
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

  // --- MÉTODOS DE PERFIL ---
  setBudget(amount: number) { this.budgetSignal.set(amount); this.checkAndGenerateAlerts(); }
  setSavingsGoal(amount: number) { this.savingsGoalSignal.set(amount); }
  setProfileImage(imageBase64: string) { this.profileImageSignal.set(imageBase64); }
  setUserName(name: string) { this.userNameSignal.set(name); }

  // --- MÉTODOS PRINCIPALES ---

  private learnKeywords(description: string, category: string): void {
    if (!description) return;
    const keywords = this.keywordsSignal();
    const words = (description.toLowerCase().match(/\b[a-z\u00E0-\u00FC]+\b/g) || [])
      .filter(word => word.length > 2 && !STOP_WORDS.includes(word));
    let updated = false;
    if (!keywords[category]) { keywords[category] = []; }
    for (const word of words) {
      if (!keywords[category].includes(word)) {
        keywords[category].push(word);
        updated = true;
      }
    }
    if (updated) { this.keywordsSignal.set({ ...keywords }); }
  }

  getSuggestedCategory(description: string): { category: string, isExpense: boolean } | null {
    if (!description) return null;
    const lowerCaseDescription = description.toLowerCase();
    const keywords = this.keywordsSignal();
    for (const category in keywords) {
      for (const keyword of keywords[category]) {
        if (lowerCaseDescription.includes(keyword)) {
          const isExpense = category !== 'Ingresos';
          return { category, isExpense };
        }
      }
    }
    return null;
  }

  addTransaction(newTransactionData: any): void {
    const isSaving = newTransactionData.category === 'Ahorro';
    let finalAmount = 0;

    if (isSaving) { finalAmount = -Math.abs(newTransactionData.amount); }
    else if (newTransactionData.category === 'Ingresos') { finalAmount = Math.abs(newTransactionData.amount); }
    else { finalAmount = -Math.abs(newTransactionData.amount); }

    // --- CORRECCIÓN: Verificar si la categoría existe, si no, crearla ---
    let categoryInfo = this.categoriesSignal().find(cat => cat.name === newTransactionData.category);
    
    if (!categoryInfo && newTransactionData.category) {
        // Crear nueva categoría con valores por defecto
        const newCategory: Category = {
            name: newTransactionData.category,
            icon: 'fas fa-tag', // Icono genérico
            color: '#95a5a6'    // Color gris/neutro
        };
        this.addCategory(newCategory);
        categoryInfo = newCategory;
        
        // Inicializar aprendizaje para la nueva categoría
        this.keywordsSignal.update(k => ({...k, [newCategory.name]: []}));
    }
    // ------------------------------------------------------------------

    const fullTransaction: Transaction = {
      description: newTransactionData.description,
      note: newTransactionData.note,
      date: newTransactionData.date || new Date().toISOString(),
      amount: finalAmount,
      category: newTransactionData.category,
      id: Date.now(),
      icon: categoryInfo?.icon || 'fas fa-question-circle',
      iconColor: categoryInfo?.color || '#333'
    };

    this.transactionsSignal.update(current => [fullTransaction, ...current]);
    
    if (!isSaving) { this.learnKeywords(newTransactionData.description, newTransactionData.category); }

    if (isSaving) {
      const amountToSave = Math.abs(newTransactionData.amount);
      this.totalSavedSignal.update(currentSavings => currentSavings + amountToSave);
    }

    if (finalAmount < 0 && !isSaving) { 
        this.checkAndGenerateAlerts(); 
        this.checkFrequencyAlerts(newTransactionData.category); 
    }
  }

  updateTransaction(updatedTransaction: Transaction): void {
      const currentTransactions = this.transactionsSignal();
      const originalTransaction = currentTransactions.find(t => t.id === updatedTransaction.id);
      if (!originalTransaction) return;
      
      if (updatedTransaction.category === 'Ahorro' || updatedTransaction.category !== 'Ingresos') { updatedTransaction.amount = -Math.abs(updatedTransaction.amount); }
      else { updatedTransaction.amount = Math.abs(updatedTransaction.amount); }

      this.transactionsSignal.update(current => current.map(t => t.id === updatedTransaction.id ? updatedTransaction : t));

      if (originalTransaction.category === 'Ahorro' || updatedTransaction.category === 'Ahorro') {
          let diff = 0;
          if (originalTransaction.category === 'Ahorro') diff -= Math.abs(originalTransaction.amount);
          if (updatedTransaction.category === 'Ahorro') diff += Math.abs(updatedTransaction.amount);
          if (diff !== 0) this.totalSavedSignal.update(s => s + diff);
      }
      if (updatedTransaction.amount < 0 && updatedTransaction.category !== 'Ahorro') { this.checkAndGenerateAlerts(); }
  }

  deleteTransaction(transactionId: number): void {
      const currentTransactions = this.transactionsSignal();
      const transactionToDelete = currentTransactions.find(t => t.id === transactionId);
      if (!transactionToDelete) return;
      this.transactionsSignal.update(current => current.filter(t => t.id !== transactionId));
      if (transactionToDelete.category === 'Ahorro') {
          const amount = Math.abs(transactionToDelete.amount);
          this.totalSavedSignal.update(s => s - amount);
      }
  }

  addCategory(newCategory: Category): void {
    this.categoriesSignal.update(currentCategories => [...currentCategories, newCategory]);
  }

  addNotification(notification: Omit<Notification, 'isRead' | 'id'>): void {
    // Eliminada la restricción de fecha para asegurar que las alertas aparezcan en pruebas
    this.notificationsSignal.update(currentNotifications => [{ ...notification, id: Date.now(), isRead: false }, ...currentNotifications]);
  }

  markAsRead(id: number): void { this.notificationsSignal.update(n => n.map(notif => notif.id === id ? { ...notif, isRead: true } : notif)); }
  markAllAsRead(): void { this.notificationsSignal.update(n => n.map(notif => ({ ...notif, isRead: true }))); }
  getUnreadNotificationsCount(): number { return this.notificationsSignal().filter(notif => !notif.isRead).length; }

  private checkAndGenerateAlerts(): void {
    const usage = this.budgetUsage;
    if (this.budgetSignal() > 0 && usage >= 100) { 
        this.addNotification({title: 'Presupuesto Excedido', message: `Te has pasado del 100% de tu presupuesto.`, icon: 'fas fa-exclamation-circle', type: 'budget', date: new Date().toISOString()}); 
    } else if (this.budgetSignal() > 0 && usage >= 90) { 
        this.addNotification({title: 'Alerta de Presupuesto', message: `Has usado el ${usage.toFixed(0)}% de tu presupuesto mensual.`, icon: 'fas fa-exclamation-triangle', type: 'budget', date: new Date().toISOString()}); 
    }
  }

  private checkFrequencyAlerts(categoryName: string): void {
      const riskCategories = ['Comida Rápida', 'Antojos y Calle', 'Cafés y Postres', 'Ocio y Salidas'];
      if (!riskCategories.includes(categoryName)) return;

      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      const recentTransactions = this.transactionsSignal().filter(t => 
          t.category === categoryName && 
          new Date(t.date) >= oneWeekAgo &&
          t.amount < 0 
      );

      const count = recentTransactions.length;
      
      if (count >= 3) { 
          this.addNotification({
              title: `Cuidado con ${categoryName}`,
              message: `Has gastado ${count} veces en ${categoryName} esta semana. Considera reducir estos gastos.`,
              icon: 'fas fa-chart-line',
              type: 'warning',
              date: new Date().toISOString()
          });
      }
  }

  get budgetUsage(): number {
    const budget = this.budgetSignal();
    if (budget <= 0) return 0;
    return (this.totalExpensesSignal() / budget) * 100;
  }
}