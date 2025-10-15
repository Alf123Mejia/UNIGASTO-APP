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
    { name: 'Ingresos', icon: 'fas fa-money-bill-wave', color: '#27ae60' }
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

// --- DICCIONARIO DE PALABRAS CLAVE: EDICIÓN EXPERTO "EL SALVADOR" ---
const INITIAL_KEYWORDS: { [key: string]: string[] } = {
  'Supermercado': [
    // Cadenas Principales
    'súper selectos', 'walmart', 'despensa de don juan', 'pricesmart', 'despensa familiar',
    // Locales y de Barrio
    'super keny', 'el baratillo', 'mercado central', 'la tiendona', 'mercado',
    // Productos
    'huevos', 'leche', 'pan', 'jamón', 'queso', 'pollo', 'carne', 'frutas', 'verduras', 'jabón', 'shampoo'
  ],
  'Restaurantes': [
    // Populares y de Centros Comerciales
    'la pampa', 'tony romas', 'olive garden', 'rustico', 'pueblo viejo', 'el zócalo', 'la siciliana', 'crepe lovers',
    // Específicos
    'sushi king', 'sushi itto', 'go green', 'krisppy\'s', 'lomo y la aguja', 'el bodegón', 'clavo y canela', 'el rosal'
  ],
  'Comida Rápida': [
    // Cadenas Internacionales
    'mcdonald\'s', 'burger king', 'wendy\'s', 'pizza hut', 'papa john\'s', 'little caesars', 'subway', 'quiznos',
    // Cadenas Nacionales/Regionales
    'pollo campero', 'pollo campestre', 'pollolandia', 'don pollo', 'mister donut', 'china wok', 'donkeys'
  ],
  'Cafés y Postres': [
    // Cadenas de Café
    'starbucks', 'juan valdez', 'ben\'s coffee', 'the coffee cup', 'viva espresso',
    // Postres y Helados
    'pastelería ban ban', 'la neveria', 'boston', 'llao llao', 'mister mangoneadas', 'sarita', 'cheesecake factory'
  ],
  'Antojos y Calle': [
    // Clásicos Salvadoreños
    'pupusas', 'pupuseria', 'elotes locos', 'yuca frita', 'panes con pollo', 'empanadas', 'pastelitos', 'churros',
    // Bebidas y otros
    'minutas', 'frescos', 'sorbete de carretón', 'típicos'
  ],
  'Transporte': [
    // Combustible
    'gasolina', 'texaco', 'gasolinera uno', 'puma energy', 'acsa', 'epic',
    // Apps y Taxis
    'uber', 'indrive', 'taxi',
    // Transporte Público
    'pasaje de bus', 'sitrramss', 'bus', 'colectivo'
  ],
  'Delivery': [
    // Apps
    'pedidosya', 'hugo app', 'ubereats',
    // Términos Genéricos
    'delivery', 'envío a domicilio', 'mandadito'
  ],
  'Ropa y Calzado': [
    // Tiendas por Departamento
    'siman', 'almacenes siman', 'carrion',
    // Tiendas de Ropa
    'zara', 'bershka', 'pull&bear', 'stradivarius', 'forever 21', 'md', 'american eagle',
    // Zapatos
    'payless', 'adoc', 'nike', 'adidas', 'skechers'
  ],
  'Accesorios y Belleza': [
    // Belleza y Cuidado
    'kiko milano', 'maquillaje', 'perfume', 'cremas', 'salón de belleza', 'barbería',
    // Accesorios
    'reloj', 'lentes', 'cartera', 'audífonos', 'claire\'s'
  ],
  'Compras Varias': [
    // Tiendas de Variedades
    'dollar city', 'miniso', 'ylufa', 'tiendas de chinos', 'todo a dolar',
    // Compras Online
    'amazon', 'temu', 'shein', 'ebay', 'aerocasillas'
  ],
  'Suscripciones': [
    // Streaming Video/Música
    'netflix', 'spotify', 'hbo max', 'disney+', 'prime video', 'apple music', 'youtube premium', 'crunchyroll',
    // Software y Nube
    'icloud', 'google drive', 'office 356', 'adobe', 'canva', 'chatgpt plus'
  ],
  'Servicios del Hogar': [
    // Recibos
    'recibo de luz', 'aes', 'caess', 'recibo de agua', 'anda',
    // Comunicaciones
    'tigo', 'claro', 'recarga', 'saldo', 'plan de datos', 'internet residencial'
  ],
  'Ocio y Salidas': [
    // Lugares
    'cine', 'cinépolis', 'cinemark', 'bar', 'discoteca', 'el tunco', 'paseo el carmen', 'volcán', 'lago de coatepeque',
    // Actividades
    'concierto', 'fiesta', 'salida con amigos', 'entrada a evento'
  ],
  'Hobbies y Pasatiempos': [
    // Gaming
    'steam', 'playstation', 'ps plus', 'nintendo', 'xbox', 'fortnite', 'videojuego',
    // Otros
    'valakut', 'carisma', 'libros', 'librería la ceiba', 'clases de', 'figuras'
  ],
  'Salud y Bienestar': [
    // Farmacias
    'farmacia san nicolás', 'farmavalue', 'farmacias económicas', 'farmacia', 'medicinas',
    // Bienestar
    'smartfit', 'gimnasio', 'gym', 'consulta médica', 'dentista', 'suplementos'
  ],
  'Educación': [
    // Universidades
    'universidad', 'ufg', 'uca', 'ues', 'matias delgado', 'evangélica',
    // Gastos Relacionados
    'matrícula', 'colegiatura', 'cuota', 'libros de texto', 'fotocopias', 'papelería', 'gráfica'
  ],
  'Otros Gastos': [
    // Varios
    'mascota', 'veterinario', 'regalo', 'donación', 'ferretería', 'vidri', 'freund',
    // Financieros
    'retiro de efectivo', 'cajero', 'comisión bancaria', 'pago de tarjeta'
  ],
  'Ingresos': [
    // Fijos y Variables
    'salario', 'pago', 'nómina', 'mesada', 'remesa', 'beca', 'freelance', 'venta', 'aguinaldo'
  ]
};

const STOP_WORDS = ['un', 'una', 'de', 'la', 'el', 'los', 'las', 'con', 'mi', 'para', 'en', 'y', 'o'];

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
  private budgetSignal = signal<number>(loadFromLocalStorage(this.KEYS.budget, 1200.00));
  private totalSavedSignal = signal<number>(loadFromLocalStorage(this.KEYS.totalSaved, 2500.00));
  private savingsGoalSignal = signal<number>(loadFromLocalStorage(this.KEYS.savingsGoal, 5000.00));
  private notificationsSignal = signal<Notification[]>(loadFromLocalStorage(this.KEYS.notifications, []));
  private keywordsSignal = signal<{ [key: string]: string[] }>(loadFromLocalStorage(this.KEYS.keywords, INITIAL_KEYWORDS));
  
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
  public balance = this.balanceSignal;
  public totalExpenses = this.totalExpensesSignal;
  public budget = this.budgetSignal.asReadonly();
  public transactions = this.transactionsSignal.asReadonly();
  public allCategories = this.categoriesSignal.asReadonly();
  public notifications = this.notificationsSignal.asReadonly();
  public currentSavings = this.totalSavedSignal.asReadonly();
  public savingsGoal = this.savingsGoalSignal.asReadonly();

  constructor() {
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
    
    // LÓGICA MEJORADA: Esta expresión regular extrae únicamente palabras limpias, 
    // ignorando números, comas, puntos, etc.
    const words = (description.toLowerCase().match(/\b[a-z\u00E0-\u00FC]+\b/g) || [])
      .filter(word => word.length > 2 && !STOP_WORDS.includes(word));

    let updated = false;
    if (!keywords[category]) {
      keywords[category] = [];
    }
    
    for (const word of words) {
      // Si la palabra es nueva para esta categoría, la aprendemos
      if (!keywords[category].includes(word)) {
        console.log(`Aprendiendo nueva palabra: "${word}" para la categoría "${category}"`);
        keywords[category].push(word);
        updated = true;
      }
    }

    if (updated) {
      this.keywordsSignal.set({ ...keywords });
    }
  }

  getSuggestedCategory(description: string): { category: string, isExpense: boolean } | null {
    const lowerCaseDescription = description.toLowerCase();
    const keywords = this.keywordsSignal();

    for (const category in keywords) {
      for (const keyword of keywords[category]) {
        if (lowerCaseDescription.includes(keyword)) {
          const isExpense = category !== 'Salario';
          return { category, isExpense };
        }
      }
    }
    return null;
  }

  addTransaction(newTransaction: Omit<Transaction, 'id' | 'icon' | 'iconColor'>): void {
    const categoryInfo = this.categoriesSignal().find(cat => cat.name === newTransaction.category);
    const fullTransaction: Transaction = {
      ...newTransaction, id: Date.now(),
      icon: categoryInfo?.icon || 'fas fa-question-circle',
      iconColor: categoryInfo?.color || '#333'
    };
    this.transactionsSignal.update(current => [fullTransaction, ...current]);
    this.learnKeywords(newTransaction.description, newTransaction.category);
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