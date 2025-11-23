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

// --- NUEVA ESTRUCTURA DE CATEGORÍAS: EDICIÓN "EL SALVADOR" ---
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

const initialTransactions: Transaction[] = []; // Empezamos sin transacciones

// --- DICCIONARIO DE PALABRAS CLAVE: EDICIÓN EXPERTO "EL SALVADOR" ---
const INITIAL_KEYWORDS: { [key: string]: string[] } = {
  'Supermercado': ['súper selectos', 'walmart', 'despensa de don juan', 'pricesmart', 'despensa familiar','super keny', 'el baratillo', 'mercado central', 'la tiendona', 'mercado','huevos', 'leche', 'pan', 'jamón', 'queso', 'pollo', 'carne', 'frutas', 'verduras', 'jabón', 'shampoo'],
  'Restaurantes': ['la pampa', 'tony romas', 'olive garden', 'rustico', 'pueblo viejo', 'el zócalo', 'la siciliana', 'crepe lovers','sushi king', 'sushi itto', 'go green', 'krisppy\'s', 'lomo y la aguja', 'el bodegón', 'clavo y canela', 'el rosal'],
  'Comida Rápida': ['mcdonald\'s', 'burger king', 'wendy\'s', 'pizza hut', 'papa john\'s', 'little caesars', 'subway', 'quiznos', 'hamburguesa','pollo campero', 'pollo campestre', 'pollolandia', 'don pollo', 'mister donut', 'china wok', 'donkeys'],
  'Cafés y Postres': ['starbucks', 'juan valdez', 'ben\'s coffee', 'the coffee cup', 'viva espresso','bobaluba','pastelería ban ban', 'la neveria', 'boston', 'llao llao', 'mister mangoneadas', 'sarita', 'cheesecake factory'],
  'Antojos y Calle': ['pupusas', 'pupuseria', 'elotes locos', 'yuca frita', 'panes con pollo', 'empanadas', 'pastelitos', 'churros','minutas', 'frescos', 'sorbete de carretón', 'típicos'],
  'Transporte': ['gasolina', 'texaco', 'gasolinera uno', 'puma energy', 'acsa', 'epic','uber', 'indrive', 'taxi','pasaje de bus', 'sitrramss', 'bus', 'colectivo'],
  'Delivery': ['pedidosya', 'hugo app', 'ubereats','delivery', 'envío a domicilio', 'mandadito'],
  'Ropa y Calzado': ['siman', 'almacenes siman', 'carrion','zara', 'bershka', 'pull&bear', 'stradivarius', 'forever 21', 'md', 'american eagle','payless', 'adoc', 'nike', 'adidas', 'skechers'],
  'Accesorios y Belleza': ['kiko milano', 'maquillaje', 'perfume', 'cremas', 'salón de belleza', 'barbería','reloj', 'lentes', 'cartera', 'audífonos', 'claire\'s'],
  'Compras Varias': ['dollar city', 'miniso', 'ylufa', 'tiendas de chinos', 'todo a dolar','amazon', 'temu', 'shein', 'ebay', 'aerocasillas'],
  'Suscripciones': ['netflix', 'spotify', 'hbo max', 'disney+', 'prime video', 'apple music', 'youtube premium', 'crunchyroll','icloud', 'google drive', 'office 365', 'adobe', 'canva', 'chatgpt plus'],
  'Servicios del Hogar': ['recibo de luz', 'aes', 'caess', 'recibo de agua', 'anda','tigo', 'claro', 'recarga', 'saldo', 'plan de datos', 'internet residencial', 'alquiler', 'renta'],
  'Ocio y Salidas': ['cine', 'cinépolis', 'cinemark', 'bar', 'discoteca', 'el tunco', 'paseo el carmen', 'volcán', 'lago de coatepeque','concierto', 'fiesta', 'salida con amigos', 'entrada a evento'],
  'Hobbies y Pasatiempos': ['steam', 'playstation', 'ps plus', 'nintendo', 'xbox', 'fortnite', 'videojuego','valakut', 'carisma', 'libros', 'librería la ceiba', 'clases de', 'figuras'],
  'Salud y Bienestar': ['farmacia san nicolás', 'farmavalue', 'farmacias económicas', 'farmacia', 'medicinas','smartfit', 'gimnasio', 'gym', 'consulta médica', 'dentista', 'suplementos'],
  'Educación': ['universidad', 'ufg', 'uca', 'ues', 'matias delgado', 'evangélica','matrícula', 'colegiatura', 'cuota', 'libros de texto', 'fotocopias', 'papelería', 'gráfica'],
  'Otros Gastos': ['mascota', 'veterinario', 'regalo', 'donación', 'ferretería', 'vidri', 'freund','retiro de efectivo', 'cajero', 'comisión bancaria', 'pago de tarjeta'],
  'Ahorro': ['ahorro', 'guardar', 'meta', 'alcancía'],
  'Ingresos': ['salario', 'pago', 'nómina', 'mesada', 'remesa', 'beca', 'freelance', 'venta', 'aguinaldo']
};

const STOP_WORDS = ['un', 'una', 'de', 'la', 'el', 'los', 'las', 'con', 'mi', 'para', 'en', 'y', 'o', 'a'];

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

  private readonly KEYS = {
    transactions: 'unigasto_transactions',
    categories: 'unigasto_categories',
    budget: 'unigasto_budget',
    savingsGoal: 'unigasto_savingsGoal',
    totalSaved: 'unigasto_totalSaved',
    notifications: 'unigasto_notifications',
    keywords: 'unigasto_keywords'
  };

  // --- SEÑALES DE ESTADO PRINCIPAL ---
  private transactionsSignal = signal<Transaction[]>(loadFromLocalStorage(this.KEYS.transactions, initialTransactions));
  private categoriesSignal = signal<Category[]>(loadFromLocalStorage(this.KEYS.categories, initialCategories));
  private budgetSignal = signal<number>(loadFromLocalStorage(this.KEYS.budget, 100.00));
  private totalSavedSignal = signal<number>(loadFromLocalStorage(this.KEYS.totalSaved, 0)); // Reseteado a CERO
  private savingsGoalSignal = signal<number>(loadFromLocalStorage(this.KEYS.savingsGoal, 100.00)); // Meta de ejemplo
  private notificationsSignal = signal<Notification[]>(loadFromLocalStorage(this.KEYS.notifications, []));
  private keywordsSignal = signal<{ [key: string]: string[] }>(loadFromLocalStorage(this.KEYS.keywords, INITIAL_KEYWORDS));

  // --- SEÑALES DERIVADAS (COMPUTADAS) ---
  // Gastos Totales (para UI y Presupuesto): Excluye Ahorro e Ingresos
  private totalExpensesSignal = computed(() => {
    return this.transactionsSignal()
      .filter(t => t.amount < 0 && t.category !== 'Ahorro')
      .reduce((acc, t) => acc + Math.abs(t.amount), 0);
  });

  // Balance Total (Dinero Disponible): Suma algebraica de TODAS las transacciones
  // Los ahorros (-60) y gastos (-) restarán, los ingresos (+) sumarán.
  private balanceSignal = computed(() => {
    return this.transactionsSignal()
      .reduce((acc, t) => acc + t.amount, 0);
  });

  // --- SEÑALES PÚBLICAS ---
  public balance = this.balanceSignal;
  public totalExpenses = this.totalExpensesSignal;
  public budget = this.budgetSignal.asReadonly();
  public transactions = this.transactionsSignal.asReadonly();
  public allCategories = this.categoriesSignal.asReadonly();
  public notifications = this.notificationsSignal.asReadonly();
  public currentSavings = this.totalSavedSignal.asReadonly(); // Muestra el total acumulado en ahorros
  public savingsGoal = this.savingsGoalSignal.asReadonly();

  constructor() {
    // Persistencia automática
    effect(() => {
      localStorage.setItem(this.KEYS.transactions, JSON.stringify(this.transactionsSignal()));
      localStorage.setItem(this.KEYS.categories, JSON.stringify(this.categoriesSignal()));
      localStorage.setItem(this.KEYS.budget, JSON.stringify(this.budgetSignal()));
      localStorage.setItem(this.KEYS.savingsGoal, JSON.stringify(this.savingsGoalSignal()));
      localStorage.setItem(this.KEYS.totalSaved, JSON.stringify(this.totalSavedSignal()));
      localStorage.setItem(this.KEYS.notifications, JSON.stringify(this.notificationsSignal()));
      localStorage.setItem(this.KEYS.keywords, JSON.stringify(this.keywordsSignal()));
      console.log('Datos persistidos en localStorage.');
    });
  }

  // --- MÉTODOS ---

  private learnKeywords(description: string, category: string): void {
    const keywords = this.keywordsSignal();
    const words = (description.toLowerCase().match(/\b[a-z\u00E0-\u00FC]+\b/g) || [])
      .filter(word => word.length > 2 && !STOP_WORDS.includes(word));
    let updated = false;
    if (!keywords[category]) { keywords[category] = []; }
    for (const word of words) {
      if (!keywords[category].includes(word)) {
        console.log(`Aprendiendo nueva palabra: "${word}" para la categoría "${category}"`);
        keywords[category].push(word);
        updated = true;
      }
    }
    if (updated) { this.keywordsSignal.set({ ...keywords }); }
  }

  getSuggestedCategory(description: string): { category: string, isExpense: boolean } | null {
    const lowerCaseDescription = description.toLowerCase();
    const keywords = this.keywordsSignal();
    for (const category in keywords) {
      for (const keyword of keywords[category]) {
        if (lowerCaseDescription.includes(keyword)) {
          const isExpense = category !== 'Ingresos'; // 'Ahorro' se trata como gasto aquí para el botón
          return { category, isExpense };
        }
      }
    }
    return null;
  }

  addTransaction(newTransactionData: Omit<Transaction, 'id' | 'icon' | 'iconColor' | 'date' | 'amount'> & { amount: number, date?: string, category: string }): void {
    const isSaving = newTransactionData.category === 'Ahorro';
    let finalAmount = 0;

    if (isSaving) { finalAmount = -Math.abs(newTransactionData.amount); }
    else if (newTransactionData.category === 'Ingresos') { finalAmount = Math.abs(newTransactionData.amount); }
    else { finalAmount = -Math.abs(newTransactionData.amount); }

    const categoryInfo = this.categoriesSignal().find(cat => cat.name === newTransactionData.category);
    const fullTransaction: Transaction = {
      description: newTransactionData.description, date: newTransactionData.date || new Date().toISOString(), amount: finalAmount,
      category: newTransactionData.category, id: Date.now(),
      icon: categoryInfo?.icon || 'fas fa-question-circle', iconColor: categoryInfo?.color || '#333'
    };

    this.transactionsSignal.update(current => [fullTransaction, ...current]);
    this.learnKeywords(newTransactionData.description, newTransactionData.category);

    if (isSaving) {
      const amountToSave = Math.abs(newTransactionData.amount);
      this.totalSavedSignal.update(currentSavings => currentSavings + amountToSave);
      console.log(`Monto ${amountToSave} transferido al Total Ahorrado.`);
    }

    if (finalAmount < 0 && !isSaving) { this.checkAndGenerateAlerts(); }
  }

  updateTransaction(updatedTransaction: Transaction): void {
    const currentTransactions = this.transactionsSignal();
    const originalTransaction = currentTransactions.find(t => t.id === updatedTransaction.id);
    if (!originalTransaction) return;

    // Asegurar signo correcto del monto según la categoría actualizada
    if (updatedTransaction.category === 'Ahorro' || updatedTransaction.category !== 'Ingresos') { updatedTransaction.amount = -Math.abs(updatedTransaction.amount); }
    else { updatedTransaction.amount = Math.abs(updatedTransaction.amount); }

    this.transactionsSignal.update(current => current.map(t => t.id === updatedTransaction.id ? updatedTransaction : t));

    // Ajustar Total Ahorrado si cambió a/desde Ahorro o si el monto de Ahorro cambió
    if (originalTransaction.category === 'Ahorro' || updatedTransaction.category === 'Ahorro') {
        let savedAmountDifference = 0;
        if (originalTransaction.category === 'Ahorro') { savedAmountDifference -= Math.abs(originalTransaction.amount); }
        if (updatedTransaction.category === 'Ahorro') { savedAmountDifference += Math.abs(updatedTransaction.amount); }
        if (savedAmountDifference !== 0) {
            this.totalSavedSignal.update(currentSavings => currentSavings + savedAmountDifference);
            console.log(`Ajuste en Total Ahorrado por edición: ${savedAmountDifference}. Nuevo total: ${this.totalSavedSignal()}`);
        }
    }

    if (updatedTransaction.amount < 0 && updatedTransaction.category !== 'Ahorro') { this.checkAndGenerateAlerts(); }
  }

  deleteTransaction(transactionId: number): void {
    const currentTransactions = this.transactionsSignal();
    const transactionToDelete = currentTransactions.find(t => t.id === transactionId);
    if (!transactionToDelete) return;

    this.transactionsSignal.update(current => current.filter(t => t.id !== transactionId));

    if (transactionToDelete.category === 'Ahorro') {
        const amountToReturn = Math.abs(transactionToDelete.amount);
        this.totalSavedSignal.update(currentSavings => currentSavings - amountToReturn);
        console.log(`Monto ${amountToReturn} devuelto desde Total Ahorrado al borrar.`);
    }
  }

  addCategory(newCategory: Category): void {
    this.categoriesSignal.update(currentCategories => [...currentCategories, newCategory]);
  }

  addNotification(notification: Omit<Notification, 'isRead' | 'id'>): void {
    const alreadyExistsUnread = this.notificationsSignal().some(n => !n.isRead && n.title === notification.title && n.message === notification.message);
    if (!alreadyExistsUnread) {
        this.notificationsSignal.update(currentNotifications => [{ ...notification, id: Date.now(), isRead: false }, ...currentNotifications]);
    }
  }

  markAsRead(notificationId: number): void {
    this.notificationsSignal.update(currentNotifications => currentNotifications.map(notif => notif.id === notificationId ? { ...notif, isRead: true } : notif));
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
    const currentTrans = this.transactionsSignal();
    if(currentTrans.length === 0) return;
    const lastTransaction = currentTrans[0];
    // Solo generar alerta si la última transacción fue un GASTO REAL (no Ahorro ni Ingreso)
    if (lastTransaction && lastTransaction.amount < 0 && lastTransaction.category !== 'Ahorro') {
        if (usage >= 100) { this.addNotification({title: 'Presupuesto Excedido', message: `Te has pasado del 100% de tu presupuesto.`, icon: 'fas fa-exclamation-circle', type: 'budget', date: new Date().toISOString()}); }
        else if (usage >= 90) { this.addNotification({title: 'Alerta de Presupuesto', message: `Has usado el ${usage.toFixed(0)}% de tu presupuesto mensual.`, icon: 'fas fa-exclamation-triangle', type: 'budget', date: new Date().toISOString()}); }
    }
  }

  get budgetUsage(): number {
    const budget = this.budgetSignal();
    if (budget === 0) return 0;
    // Usa totalExpensesSignal que ya excluye ahorros
    return (this.totalExpensesSignal() / budget) * 100;
  }
}