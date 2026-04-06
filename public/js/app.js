// Flow Finance - Main Application
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { 
    getAuth, signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { 
    getFirestore, doc, collection, onSnapshot, addDoc, setDoc, 
    deleteDoc, query, orderBy, getDocs
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { firebaseConfig, appId } from "./config.js";

// Check if demo mode
const isDemoMode = firebaseConfig && (firebaseConfig.apiKey === 'demo_api_key' || firebaseConfig.projectId === 'demo-project');

let app, auth, db;
let firebaseReady = false;

// Initialize Firebase only if not demo mode
if (!isDemoMode) {
    try {
        app = initializeApp(firebaseConfig);
        auth = getAuth(app);
        db = getFirestore(app);
        firebaseReady = true;
        console.log('Firebase initialized successfully');
    } catch(e) {
        console.error('Firebase initialization failed:', e);
    }
} else {
    console.log('Demo mode: Firebase not initialized');
}

// Ensure lucide icons are rendered as soon as DOM is ready
window.addEventListener('DOMContentLoaded', () => {
    if (window.lucide) {
        lucide.createIcons();
    }
});

let user = null;
let transactions = [];
let splits = [];
let categories = { income: ['Salary', 'Freelance', 'Dividends'], expense: ['Housing', 'Food', 'Transport', 'Utilities', 'Entertainment'] };
let budgets = {};
let balances = { account: 0, hand: 0 };
let activeSection = 'overview';
let mainChart = null;
let expensePieChart = null;
let categoryBarChart = null;

// Utilities
const showError = (msg) => {
    const toast = document.getElementById('errorToast');
    if (toast) {
        document.getElementById('errorMessage').innerText = msg;
        toast.classList.remove('hidden');
        setTimeout(() => toast.classList.add('hidden'), 5000);
    }
};

const showSuccess = (msg) => {
    const toast = document.getElementById('successToast');
    if (toast) {
        document.getElementById('successMessage').innerText = msg;
        toast.classList.remove('hidden');
        setTimeout(() => toast.classList.add('hidden'), 5000);
    }
};

// Load demo data from localStorage
const loadDemoData = () => {
    try {
        const savedTransactions = localStorage.getItem('demo_transactions');
        const savedSplits = localStorage.getItem('demo_splits');
        const savedSettings = localStorage.getItem('demo_settings');
        
        if (savedTransactions) {
            transactions = JSON.parse(savedTransactions);
        }
        if (savedSplits) {
            splits = JSON.parse(savedSplits);
        }
        if (savedSettings) {
            const settings = JSON.parse(savedSettings);
            categories = settings.categories || categories;
            budgets = settings.budgets || budgets;
            balances = settings.balances || balances;
        }
    } catch (e) {
        console.error('Failed to load demo data:', e);
    }
};

// Save demo data to localStorage
const saveDemoData = () => {
    try {
        localStorage.setItem('demo_transactions', JSON.stringify(transactions));
        localStorage.setItem('demo_splits', JSON.stringify(splits));
        localStorage.setItem('demo_settings', JSON.stringify({ categories, budgets, balances }));
    } catch (e) {
        console.error('Failed to save demo data:', e);
    }
};

// Setup sync
const setupSync = () => {
    if (!user) return;
    
    // Check if this is a demo user (no uid from Firebase)
    const isDemoUser = !user.uid || user.uid === 'demo-user-123';
    
    if (isDemoUser) {
        console.log('Demo mode: Using local storage for data');
        // Load demo data from localStorage
        loadDemoData();
        render();
        return;
    }
    
    // Regular Firebase sync for authenticated users
    const tPath = collection(db, 'artifacts', appId, 'users', user.uid, 'transactions');
    const sPath = collection(db, 'artifacts', appId, 'users', user.uid, 'splits');
    const settingsDoc = doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'data');
    
    onSnapshot(query(tPath, orderBy('date', 'desc')), (snap) => {
        transactions = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        render();
    });

    onSnapshot(query(sPath, orderBy('date', 'desc')), (snap) => {
        splits = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        render();
    });

    onSnapshot(settingsDoc, (snap) => {
        if (snap.exists()) {
            const data = snap.data();
            categories = data.categories || categories;
            budgets = data.budgets || budgets;
            balances = data.balances || balances;
        } else {
            setDoc(settingsDoc, { categories, budgets, balances });
        }
        if (!categories.expense.includes('Shared Expenses')) {
            categories.expense.push('Shared Expenses');
        }
        // sync to localStorage so dropdowns show the latest
        syncLocalCategories();
        render();
        // If balances are missing (first login), ask user to provide initial balances
        if(snap.exists() && (!snap.data().balances || (snap.data().balances.account === 0 && snap.data().balances.hand === 0))) {
            setTimeout(() => {
                try {
                    const a = parseFloat(prompt('Enter your Account balance (₹):', balances.account || 0)) || 0;
                    const h = parseFloat(prompt('Enter your Hand cash amount (₹):', balances.hand || 0)) || 0;
                    balances.account = a; balances.hand = h;
                    // persist back to Firestore
                    setDoc(settingsDoc, { categories, budgets, balances }, { merge: true });
                    render();
                } catch(e) {}
            }, 500);
        }
    });
};

// Render
const render = () => {
    let tI = 0, tE = 0;
    transactions.forEach(t => t.type === 'income' ? tI += t.amount : tE += t.amount);
    const balance = document.getElementById('sidebarBalance');
    if(balance) balance.innerText = `₹${(Math.round((balances.account || 0) + (balances.hand || 0))).toLocaleString()}`;
    const accountEl = document.getElementById('accountBalance');
    if(accountEl) accountEl.innerText = `₹${Math.round(balances.account || 0).toLocaleString()}`;
    const handEl = document.getElementById('handCash');
    if(handEl) handEl.innerText = `₹${Math.round(balances.hand || 0).toLocaleString()}`;
    const income = document.getElementById('statIncome');
    if(income) income.innerText = `₹${tI.toLocaleString()}`;
    const expense = document.getElementById('statExpense');
    if(expense) expense.innerText = `₹${tE.toLocaleString()}`;
    const goal = tI * 0.2;
    const savings = tI - tE;
    const perc = goal > 0 ? Math.round((savings / goal) * 100) : 0;
    const bar = document.getElementById('savingsBar');
    if(bar) bar.style.width = `${Math.min(100, Math.max(0, perc))}%`;
    
    if(activeSection === 'overview') renderOverview();
    if(activeSection === 'income') renderTable('incomeTable', 'income');
    if(activeSection === 'expenses') renderTable('expenseTable', 'expense');
    if(activeSection === 'budgets') renderBudgets();
    if(activeSection === 'settings') renderSettings();
    if(activeSection === 'split') renderSplits();
    updateChart(tI, tE);
    populateCategoryDropdown();
    setTimeout(() => {
        if(window.lucide) lucide.createIcons({
            color: 'currentColor',
            width: 24,
            height: 24
        });
    }, 0);
};

// Market Watch: fetch prices using market data
async function fetchTickerPrice(symbol){
    // Gemini API key removed - market data fetching disabled
    return null;
}

function renderTickerRow(symbol, price){
    const id = `mk_${symbol.replace(/\W/g,'_')}`;
    let el = document.getElementById(id);
    if(!el){
        el = document.createElement('div');
        el.id = id;
        el.className = 'flex items-center justify-between p-4 bg-gradient-to-r from-slate-50 to-slate-25 rounded-xl border border-slate-100 hover:border-slate-200 transition-all';
        el.innerHTML = `<div class="font-bold text-sm text-slate-800">${symbol}</div><div class="text-sm font-semibold ${price ? 'text-emerald-600' : 'text-slate-400'}">${price? '₹' + Math.round(price).toLocaleString('en-IN') : 'Fetching...'}</div>`;
        document.getElementById('marketTicker')?.appendChild(el);
    } else {
        const priceEl = el.querySelector('div:nth-child(2)');
        priceEl.innerText = price? '₹' + Math.round(price).toLocaleString('en-IN') : 'Fetching...';
        priceEl.className = `text-sm font-semibold ${price ? 'text-emerald-600' : 'text-slate-400'}`;
    }
}

async function updateMarketTicker(){
    const container = document.getElementById('marketTicker');
    if(!container) return;
    // Build symbols: include indices
    const symbols = new Set(['NIFTY 50', 'SENSEX']);

    // Show loading state for each symbol
    const symbolArr = Array.from(symbols);
    if(container.querySelector('p')) {
        container.innerHTML = '';
    }
    symbolArr.forEach(sym => renderTickerRow(sym, null));
    
    document.getElementById('marketLastUpdate').innerText = 'Updating...';
    let successCount = 0;
    for(const sym of symbolArr){
        const price = await fetchTickerPrice(sym);
        if(price) successCount++;
        renderTickerRow(sym, price);
    }
    document.getElementById('marketLastUpdate').innerText = `Updated: ${new Date().toLocaleTimeString()}`;
    if(successCount === 0) {
        console.warn('Market Watch: No prices fetched (API key may be missing or API unavailable)');
    }
}

function initMarketTicker(){
    const container = document.getElementById('marketTicker');
    if(!container) return;
    const btn = document.getElementById('marketRefreshBtn');
    if(btn) btn.addEventListener('click', (e) => {
        e.preventDefault();
        updateMarketTicker();
    });
    // initial run after small delay to ensure DOM is settled
    setTimeout(() => updateMarketTicker(), 600);
    // refresh every 60s
    window._marketTickerInterval = setInterval(updateMarketTicker, 60 * 1000);
    // expose manual refresh
    window.updateMarketTicker = updateMarketTicker;
}

// Initialize market ticker on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    initMarketTicker();
});

const renderOverview = () => {
    const list = document.getElementById('recentActivity');
    if (!list) return;
    if (transactions.length === 0) {
        list.innerHTML = `<p class="text-slate-400 text-xs text-center py-10 font-bold uppercase tracking-widest">No Recent Data</p>`;
        return;
    }
    list.innerHTML = transactions.slice(0, 5).map(t => `<div class="flex items-center justify-between group"><div class="flex items-center space-x-3"><div class="w-10 h-10 ${t.type === 'income' ? 'bg-emerald-50 text-emerald-600' : 'bg-orange-50 text-orange-600'} rounded-[14px] flex items-center justify-center"><i data-lucide="${t.type === 'income' ? 'arrow-up-right' : 'arrow-down-left'}" class="w-5 h-5"></i></div><div><p class="text-xs font-bold text-slate-800">${t.title}</p><p class="text-[9px] text-slate-400 font-bold uppercase tracking-wider">${t.category}</p></div></div><div class="flex items-center space-x-3"><p class="text-xs font-black ${t.type === 'income' ? 'text-emerald-600' : 'text-slate-900'}">${t.type === 'income' ? '+' : '-'}₹${t.amount}</p><button onclick="editTransaction('${t.id}')" class="text-slate-400 hover:text-blue-500 transition-colors"><i data-lucide="edit-2" class="w-3.5 h-3.5"></i></button><button onclick="deleteTransaction('${t.id}')" class="text-slate-200 hover:text-red-500 transition-colors"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i></button></div></div>`).join('');
};

const renderTable = (tableId, type) => {
    const table = document.getElementById(tableId);
    if (!table) return;
    table.innerHTML = transactions.filter(t => t.type === type).map(t => `<tr class="border-b border-slate-50 hover:bg-slate-50 transition-colors"><td class="p-5 font-bold text-sm">${t.title}</td><td class="p-5 text-xs font-semibold text-slate-600">${t.date || '-'}</td><td class="p-5 text-xs font-bold text-slate-500 uppercase tracking-tighter">${t.category}</td><td class="p-5 text-xs text-slate-600 max-w-xs truncate">${t.notes || '-'}</td><td class="p-5 text-right font-black text-sm"><div class="flex items-center justify-end space-x-4"><span class="${type === 'income' ? 'text-emerald-600' : ''}">₹${t.amount.toLocaleString()}</span><button onclick="editTransaction('${t.id}')" class="text-slate-400 hover:text-blue-500"><i data-lucide="edit-2" class="w-4 h-4"></i></button><button onclick="deleteTransaction('${t.id}')" class="text-slate-200 hover:text-red-500"><i data-lucide="trash-2" class="w-4 h-4"></i></button></div></td></tr>`).join('');
};

const renderBudgets = () => {
    const grid = document.getElementById('budgetGrid');
    if (!grid) return;
    const totals = {};
    transactions.filter(t => t.type === 'expense').forEach(t => totals[t.category] = (totals[t.category] || 0) + t.amount);
    grid.innerHTML = categories.expense.map(cat => {
        const spent = totals[cat] || 0;
        const goal = budgets[cat] || 500;
        const p = Math.min(100, (spent/goal)*100);
        return `<div class="bg-white p-7 rounded-[32px] border border-slate-100 card-shadow"><div class="flex justify-between items-start mb-6"><h5 class="font-bold text-slate-800">${cat}</h5><button onclick="editBudget('${cat}')" class="p-1.5 hover:bg-slate-50 rounded-lg text-slate-300"><i data-lucide="edit-3" class="w-4 h-4"></i></button></div><div class="flex items-baseline space-x-1 mb-2"><span class="text-xl font-black">₹${spent}</span><span class="text-[10px] text-slate-300 font-bold uppercase">Target: ₹${goal}</span></div><div class="w-full bg-slate-100 h-2 rounded-full overflow-hidden mb-3"><div class="h-full ${p > 90 ? 'bg-orange-500' : 'bg-emerald-500'} transition-all" style="width: ${p}%"></div></div></div>`;
    }).join('');
};

const renderSettings = () => {
    // Settings rendering handled inline
};

const renderSplits = () => {
    const table = document.getElementById('splitTable');
    if (!table) return;
    if (splits.length === 0) {
        table.innerHTML = `<tr><td colspan="5" class="p-8 text-center text-slate-400 font-bold uppercase text-xs">No split expenses yet</td></tr>`;
        return;
    }
    table.innerHTML = splits.map(s => {
        const fC = (s.friends || []).length;
        const yS = s.yourShare || (s.amount / (fC + 1));
        const pC = (s.friends || []).filter(f => f.paid).length;
        return `<tr class="border-b border-slate-50 hover:bg-slate-50 transition-colors"><td class="p-5 font-bold text-sm">${s.title}</td><td class="p-5 text-xs font-semibold text-slate-600">${s.date || '-'}</td><td class="p-5 text-xs"><button onclick="togglePaymentStatus('${s.id}')" class="text-slate-600 hover:text-[#0d2e27] font-bold cursor-pointer">${pC}/${fC} Paid</button></td><td class="p-5 text-xs font-bold text-emerald-600">$${yS.toFixed(2)}</td><td class="p-5 text-right font-black text-sm"><div class="flex items-center justify-end space-x-4"><span>$${s.amount.toLocaleString()}</span><button onclick="showSplitDetails('${s.id}')" class="text-slate-300 hover:text-blue-500 transition-colors"><i data-lucide="info" class="w-4 h-4"></i></button><button onclick="deleteSplit('${s.id}')" class="text-slate-200 hover:text-red-500"><i data-lucide="trash-2" class="w-4 h-4"></i></button></div></td></tr>`;
    }).join('');
};

const populateCategoryDropdown = () => {
    // Prefer synced categories from Firestore; fall back to localStorage
    const ls = JSON.parse(localStorage.getItem('flow_categories') || 'null');
    let cats = Array.isArray(ls) && ls.length ? ls : [];
    if(!cats.length && categories) {
        cats = (categories.expense || []).concat(categories.income || []);
        // persist fallback so UI remains stable
        localStorage.setItem('flow_categories', JSON.stringify(cats));
    }
    const cat = document.getElementById('fCategory');
    if(cat) {
        cat.innerHTML = cats.map(c => `<option value="${c}">${c}</option>`).join('');
    }
};

const syncLocalCategories = () => {
    try {
        const cats = Array.from(new Set([...(categories.expense || []), ...(categories.income || [])]));
        localStorage.setItem('flow_categories', JSON.stringify(cats));
    } catch (e) { /* ignore */ }
};

const updateChart = (i, e) => {
    if(mainChart) {
        // Get current filter date range
        const filterValue = document.getElementById('chartDateFilter')?.value || '30';
        const startDateInput = document.getElementById('chartStartDate')?.value;
        const endDateInput = document.getElementById('chartEndDate')?.value;
        
        let startDate = new Date();
        let endDate = new Date();
        endDate.setHours(23, 59, 59, 999);
        
        if(startDateInput && endDateInput) {
            startDate = new Date(startDateInput);
            endDate = new Date(endDateInput);
            endDate.setHours(23, 59, 59, 999);
        } else {
            if(filterValue === 'all') {
                startDate = new Date('2000-01-01');
            } else {
                startDate.setDate(endDate.getDate() - parseInt(filterValue));
                startDate.setHours(0, 0, 0, 0);
            }
        }
        
        // Create daily breakdown
        const dailyData = {};
        const currentDate = new Date(startDate);
        while(currentDate <= endDate) {
            const dateKey = currentDate.toISOString().split('T')[0];
            dailyData[dateKey] = { income: 0, expense: 0 };
            currentDate.setDate(currentDate.getDate() + 1);
        }
        
        // Populate daily data from transactions
        transactions.forEach(t => {
            const tDate = new Date(t.date);
            tDate.setHours(0, 0, 0, 0);
            if(tDate >= startDate && tDate <= endDate) {
                const dateKey = t.date;
                if(dailyData[dateKey]) {
                    if(t.type === 'income') {
                        dailyData[dateKey].income += t.amount;
                    } else {
                        dailyData[dateKey].expense += t.amount;
                    }
                }
            }
        });
        
        // Format for chart
        const labels = Object.keys(dailyData).sort();
        const incomeData = labels.map(date => dailyData[date].income);
        const expenseData = labels.map(date => dailyData[date].expense);
        const formattedLabels = labels.map(d => {
            const date = new Date(d);
            return date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
        });
        
        mainChart.data.labels = formattedLabels;
        mainChart.data.datasets[0].data = incomeData;
        mainChart.data.datasets[1].data = expenseData;
        mainChart.update();
    }
    updateExpensePieChart();
    updateCategoryBarChart();
};

const initChart = () => {
    if (typeof Chart === 'undefined') return;
    const canvas = document.getElementById('overviewChart');
    const ctx = canvas?.getContext('2d');
    if(!ctx) return;
    try { if(mainChart && typeof mainChart.destroy === 'function') mainChart.destroy(); } catch(e) {}
    mainChart = new Chart(ctx, {
        type: 'line',
        data: { 
            labels: [], 
            datasets: [
                { 
                    label: 'Income', 
                    data: [], 
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 4,
                    pointBackgroundColor: '#10b981',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointHoverRadius: 6
                },
                { 
                    label: 'Expense', 
                    data: [], 
                    borderColor: '#f97316',
                    backgroundColor: 'rgba(249, 115, 22, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 4,
                    pointBackgroundColor: '#f97316',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointHoverRadius: 6
                }
            ] 
        },
        options: { 
            maintainAspectRatio: false, 
            plugins: { 
                legend: { 
                    display: true,
                    position: 'top',
                    labels: { 
                        usePointStyle: true,
                        padding: 15,
                        font: { size: 12, weight: 'bold' }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return context.dataset.label + ': ₹' + context.parsed.y.toLocaleString('en-IN');
                        }
                    },
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    padding: 12,
                    titleFont: { size: 12, weight: 'bold' },
                    bodyFont: { size: 11 },
                    borderColor: '#333',
                    borderWidth: 1
                }
            }, 
            scales: { 
                y: { 
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return '₹' + (value/1000).toFixed(0) + 'k';
                        },
                        font: { size: 11 }
                    },
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    }
                }, 
                x: { 
                    grid: { display: false },
                    ticks: { font: { size: 11 } }
                } 
            } 
        }
    });
    initExpensePieChart();
    initCategoryBarChart();
};

const initExpensePieChart = () => {
    if (typeof Chart === 'undefined') return;
    const canvas = document.getElementById('expensePieChart');
    const ctx = canvas?.getContext('2d');
    if(!ctx) return;
    try { if(expensePieChart && typeof expensePieChart.destroy === 'function') expensePieChart.destroy(); } catch(e) {}
    const categoryTotals = {};
    transactions.filter(t => t.type === 'expense').forEach(t => {
        categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
    });
    const labels = Object.keys(categoryTotals);
    const data = Object.values(categoryTotals);
    const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899'];
    
    expensePieChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels.length > 0 ? labels : ['No Data'],
            datasets: [{
                data: data.length > 0 ? data : [1],
                backgroundColor: colors.slice(0, labels.length),
                borderColor: '#ffffff',
                borderWidth: 2
            }]
        },
        options: {
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom', labels: { padding: 20, font: { size: 12, weight: 'bold' } } }
            }
        }
    });
};

const updateExpensePieChart = () => {
    if(!expensePieChart) return;
    const categoryTotals = {};
    transactions.filter(t => t.type === 'expense').forEach(t => {
        categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
    });
    const labels = Object.keys(categoryTotals);
    const data = Object.values(categoryTotals);
    const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899'];
    
    expensePieChart.data.labels = labels.length > 0 ? labels : ['No Data'];
    expensePieChart.data.datasets[0].data = data.length > 0 ? data : [1];
    expensePieChart.data.datasets[0].backgroundColor = colors.slice(0, labels.length);
    expensePieChart.update();
};

const initCategoryBarChart = () => {
    if (typeof Chart === 'undefined') return;
    const canvas = document.getElementById('categoryBarChart');
    const ctx = canvas?.getContext('2d');
    if(!ctx) return;
    try { if(categoryBarChart && typeof categoryBarChart.destroy === 'function') categoryBarChart.destroy(); } catch(e) {}
    const categoryTotals = {};
    transactions.filter(t => t.type === 'expense').forEach(t => {
        categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
    });
    const labels = Object.keys(categoryTotals);
    const data = Object.values(categoryTotals);
    
    categoryBarChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels.length > 0 ? labels : ['No Data'],
            datasets: [{
                label: 'Spending',
                data: data.length > 0 ? data : [0],
                backgroundColor: '#3b82f6',
                borderRadius: 8,
                borderSkipped: false
            }]
        },
        options: {
            maintainAspectRatio: false,
            indexAxis: 'y',
            plugins: { legend: { display: false } },
            scales: {
                x: {
                    beginAtZero: true,
                    grid: { display: false }
                },
                y: {
                    grid: { display: false }
                }
            }
        }
    });
};

const updateCategoryBarChart = () => {
    if(!categoryBarChart) return;
    const categoryTotals = {};
    transactions.filter(t => t.type === 'expense').forEach(t => {
        categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
    });
    const labels = Object.keys(categoryTotals);
    const data = Object.values(categoryTotals);
    
    categoryBarChart.data.labels = labels.length > 0 ? labels : ['No Data'];
    categoryBarChart.data.datasets[0].data = data.length > 0 ? data : [0];
    categoryBarChart.update();
};

// GLOBAL WINDOW FUNCTIONS - Available to HTML onclick handlers
window.switchSection = (id) => {
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    const nav = document.getElementById(`nav-${id}`);
    if(nav) nav.classList.add('active');
    document.querySelectorAll('[id^="section-"]').forEach(el => el.classList.add('hidden'));
    const section = document.getElementById(`section-${id}`);
    if(section) section.classList.remove('hidden');
    activeSection = id;
    // Close mobile sidebar on section click
    const sidebar = document.getElementById('sidebarNav');
    const overlay = document.getElementById('mobileDrawerOverlay');
    if(sidebar) sidebar.classList.add('-translate-x-full');
    if(overlay) overlay.classList.add('hidden');
    render();
};

window.logout = async () => {
    try {
        const isDemoUser = !user.uid || user.uid === 'demo-user-123';
        if (isDemoUser) {
            // Demo mode: clear demo data and redirect
            localStorage.removeItem('demoUser');
            localStorage.removeItem('demo_transactions');
            localStorage.removeItem('demo_splits');
            localStorage.removeItem('demo_settings');
            window.location.href = '/login.html';
        } else {
            // Firebase mode
            await signOut(auth);
            window.location.href = '/login.html';
        }
    } catch (err) {
        showError("Logout failed: " + err.message);
    }
};

window.toggleMobileSidebar = () => {
    const sidebar = document.getElementById('sidebarNav');
    const overlay = document.getElementById('mobileDrawerOverlay');
    if(sidebar) sidebar.classList.toggle('-translate-x-full');
    if(overlay) overlay.classList.toggle('hidden');
};

window.openModal = () => document.getElementById('modalOverlay')?.classList.remove('hidden');
window.closeModal = () => {
    document.getElementById('modalOverlay')?.classList.add('hidden');
    const mainForm = document.getElementById('mainForm');
    if(mainForm) {
        mainForm.reset();
        delete mainForm.dataset.editId;
    }
    const saveBtn = document.getElementById('saveBtn');
    if(saveBtn) saveBtn.innerText = 'Save Record';
};
window.toggleFabMenu = () => document.getElementById('fabMenu')?.classList.toggle('hidden');
window.closeFabMenu = () => document.getElementById('fabMenu')?.classList.add('hidden');
window.openSplitModal = () => {
    const modal = document.getElementById('splitModalOverlay');
    if(modal) {
        modal.classList.remove('hidden');
        const form = document.getElementById('splitForm');
        if(form) form.reset();
        const date = document.getElementById('splitDate');
        if(date) date.valueAsDate = new Date();
        const friends = document.getElementById('friendsList');
        if(friends) friends.innerHTML = '';
        window.addFriendField();
    }
};
window.closeSplitModal = () => document.getElementById('splitModalOverlay')?.classList.add('hidden');

window.addFriendField = () => {
    const list = document.getElementById('friendsList');
    if (!list) return;
    const isManual = document.getElementById('manualSplitToggle')?.checked;
    const div = document.createElement('div');
    if(isManual) {
        div.className = 'grid grid-cols-12 gap-2 items-end';
        div.innerHTML = `<input type="text" placeholder="Friend name" class="col-span-4 bg-slate-50 rounded-xl p-3 text-sm outline-none border border-slate-100 friend-name"><input type="number" step="0.01" placeholder="₹ Amount" class="col-span-6 bg-slate-50 rounded-xl p-3 text-sm outline-none border border-slate-100 friend-amount"><button type="button" onclick="this.parentElement.remove()" class="col-span-2 px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-xs font-bold">Remove</button>`;
    } else {
        div.className = 'grid grid-cols-12 gap-2 items-end';
        div.innerHTML = `<input type="text" placeholder="Friend name" class="col-span-10 bg-slate-50 rounded-xl p-3 text-sm outline-none border border-slate-100 friend-input"><button type="button" onclick="this.parentElement.remove()" class="col-span-2 px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-xs font-bold">Remove</button>`;
    }
    list.appendChild(div);
};

window.toggleManualSplit = () => {
    const isManual = document.getElementById('manualSplitToggle')?.checked;
    const hint = document.getElementById('manualSplitHint');
    const list = document.getElementById('friendsList');
    
    if(hint) hint.classList.toggle('hidden', !isManual);
    
    // Rebuild friend fields when toggling
    if(list) {
        const friendInputs = list.querySelectorAll('input[class*="friend"]');
        const friends = Array.from(friendInputs).map(input => input.value).filter(v => v);
        list.innerHTML = '';
        friends.forEach(() => window.addFriendField());
    }
};

window.setEntryType = (type) => {
    const form = document.getElementById('formType');
    if(form) form.value = type;
    const tI = document.getElementById('typeInc');
    const tE = document.getElementById('typeExp');
    if(tI) tI.className = type === 'income' ? "flex-1 py-2.5 text-xs font-black rounded-lg bg-white shadow text-emerald-600 uppercase" : "flex-1 py-2.5 text-xs font-black rounded-lg text-slate-400 uppercase";
    if(tE) tE.className = type === 'expense' ? "flex-1 py-2.5 text-xs font-black rounded-lg bg-white shadow text-orange-600 uppercase" : "flex-1 py-2.5 text-xs font-black rounded-lg text-slate-400 uppercase";
    populateCategoryDropdown();
};

window.editTransaction = (id) => {
    const transaction = transactions.find(x => x.id === id);
    if (!transaction) return;
    
    // Set form type
    document.getElementById('formType').value = transaction.type;
    window.setEntryType(transaction.type);
    
    // Populate form fields
    document.getElementById('fTitle').value = transaction.title;
    document.getElementById('fAmount').value = transaction.amount;
    document.getElementById('fCategory').value = transaction.category;
    document.getElementById('fDate').value = transaction.date || new Date().toISOString().split('T')[0];
    document.getElementById('fNotes').value = transaction.notes || '';
    const paidFromEl = document.getElementById('fPaidFrom');
    if(paidFromEl) paidFromEl.value = transaction.paidFrom || 'account';
    
    // Store the transaction ID for update
    document.getElementById('mainForm').dataset.editId = id;
    
    // Change button text
    const saveBtn = document.getElementById('saveBtn');
    if(saveBtn) saveBtn.innerText = 'Update Record';
    
    window.openModal();
};

window.deleteTransaction = async (id) => {
    if(!confirm("Delete this entry?")) return;
    try {
        const t = transactions.find(x => x.id === id);
        if (t && t.title?.startsWith('[SPLIT]')) {
            const st = t.title.replace('[SPLIT] ', '');
            const cs = splits.find(x => x.title === st);
            if (cs) await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'splits', cs.id));
        }
        await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'transactions', id));
        // Reverse effect on balances
        try {
            if(t) {
                const from = t.paidFrom || 'account';
                if(t.type === 'expense') {
                    balances[from] = (balances[from] || 0) + (t.amount || 0);
                } else if(t.type === 'income') {
                    balances[from] = (balances[from] || 0) - (t.amount || 0);
                }
                await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'data'), { categories, budgets, balances }, { merge: true });
            }
        } catch(e) {}

        showSuccess("Transaction deleted!");
    } catch (err) {
        showError("Error deleting transaction");
    }
};

window.deleteSplit = async (id) => {
    if(!confirm("Delete this split expense?")) return;
    try {
        const s = splits.find(x => x.id === id);
        if (s) {
            const ct = transactions.find(x => x.title === `[SPLIT] ${s.title}` && x.type === 'expense');
            if (ct) await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'transactions', ct.id));
        }
        await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'splits', id));
        showSuccess("Split deleted!");
    } catch (err) {
        showError("Error deleting split");
    }
};

window.togglePaymentStatus = (splitId) => {
    const s = splits.find(x => x.id === splitId);
    if (!s) return;
    const modal = document.getElementById('splitDetailsOverlay');
    if(!modal) return;
    modal.classList.remove('hidden');
    const content = document.getElementById('splitDetailsContent');
    if(!content) return;
    content.innerHTML = `<h4 class="font-bold text-slate-800 mb-4">${s.title}</h4><div class="bg-slate-50 p-4 rounded-xl mb-4"><p class="text-xs text-slate-600 mb-1">Total Amount</p><p class="font-black text-lg">$${s.amount.toLocaleString()}</p></div><div class="space-y-2">${(s.friends || []).map((f, i) => `<div data-friend-idx="${i}" data-split-id="${splitId}" class="friend-payment-btn w-full flex items-center justify-between p-4 rounded-xl transition-all cursor-pointer ${f.paid ? 'bg-emerald-50 border-2 border-emerald-500' : 'bg-slate-50 border-2 border-slate-100 hover:border-orange-300'}"><div class="flex items-center space-x-3"><i data-lucide="${f.paid ? 'check-circle' : 'circle'}" class="w-5 h-5 ${f.paid ? 'text-emerald-600' : 'text-slate-400'}"></i><span class="font-bold text-slate-800">${f.name}</span></div><span class="font-black ${f.paid ? 'text-emerald-600' : 'text-orange-600'}">${f.paid ? '✓' : '⧗'}</span></div>`).join('')}</div>`;
    document.querySelectorAll('.friend-payment-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const sId = this.getAttribute('data-split-id');
            const fIdx = parseInt(this.getAttribute('data-friend-idx'));
            window.markFriendPaid(sId, fIdx);
        });
    });
    setTimeout(() => {
        if(window.lucide) lucide.createIcons();
    }, 0);
};

window.markFriendPaid = async (splitId, friendIdx) => {
    const s = splits.find(x => x.id === splitId);
    if (!s || !user) return;
    try {
        s.friends[friendIdx].paid = !s.friends[friendIdx].paid;
        await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'splits', splitId), s);
        showSuccess(`Payment marked for ${s.friends[friendIdx].name}!`);
        setTimeout(() => window.togglePaymentStatus(splitId), 500);
    } catch (err) {
        showError("Error updating payment status");
    }
};

window.closeSplitDetails = () => document.getElementById('splitDetailsOverlay')?.classList.add('hidden');
window.showSplitDetails = (splitId) => window.togglePaymentStatus(splitId);

window.updateSettings = async () => {
    if(!user) return;
    // Ensure categories object has both income and expense keys
    const categoriesToSave = {
        income: categories.income || [],
        expense: categories.expense || []
    };
    // Save to Firestore with merge to preserve other data
    await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'data'), { categories: categoriesToSave, budgets, balances }, { merge: true });
    // keep a local copy for UI modules that read from localStorage
    syncLocalCategories();
};

window.editBalances = async () => {
    if(!user) return showError('Not logged in');
    try {
        const a = parseFloat(prompt('Account balance (₹):', balances.account || 0)) || 0;
        const h = parseFloat(prompt('Hand cash (₹):', balances.hand || 0)) || 0;
        balances.account = a; balances.hand = h;
        await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'data'), { categories, budgets, balances }, { merge: true });
        showSuccess('Balances updated');
        render();
    } catch (e) {
        showError('Error updating balances');
    }
};

window.addCategory = async (type) => {
    const input = document.getElementById(type === 'income' ? 'newIncomeCat' : 'newExpenseCat');
    const val = input?.value.trim();
    if(val && !categories[type].includes(val)) {
        categories[type].push(val);
        await window.updateSettings();
        if(input) input.value = '';
        showSuccess(`${type} category added!`);
    }
};

window.addQuickCategory = async () => {
    const quickInput = document.getElementById('quickCat');
    if (!quickInput) return showError('Quick category input not found');

    const val = quickInput.value.trim();
    if (!val) {
        return showError('Please enter a category name.');
    }

    const type = (document.getElementById('formType')?.value || 'expense').toLowerCase();
    if (!categories[type]) {
        categories[type] = [];
    }

    if (categories[type].includes(val)) {
        return showError(`Category '${val}' already exists in ${type}.`);
    }

    categories[type].push(val);
    await window.updateSettings();
    populateCategoryDropdown();

    // Select newly added category in dropdown
    const catSelect = document.getElementById('fCategory');
    if (catSelect) {
        catSelect.value = val;
    }

    quickInput.value = '';
    showSuccess(`'${val}' added to ${type} categories.`);
};

window.deleteCat = async (type, name) => {
    categories[type] = categories[type].filter(c => c !== name);
    await window.updateSettings();
    showSuccess(`${type} category deleted!`);
};

window.editBudget = async (cat) => {
    const val = prompt(`Monthly target for ${cat}:`, budgets[cat] || 500);
    if (val !== null) {
        budgets[cat] = parseFloat(val) || 0;
        await window.updateSettings();
        showSuccess("Budget updated!");
    }
};

window.exportToExcel = () => {
    if(typeof XLSX === 'undefined') { showError("Excel library not loaded"); return; }
    const wb = XLSX.utils.book_new();
    let tI = 0, tE = 0;
    transactions.forEach(t => { if (t.type === 'income') tI += t.amount; else tE += t.amount; });
    const balance = tI - tE;
    
    // Summary Sheet
    const summaryData = [['FLOW FINANCE - FINANCIAL REPORT', '', ''], ['', '', ''], ['Generated:', new Date().toLocaleDateString(), ''], ['User:', user?.displayName || 'User', ''], ['', '', ''], ['', '', ''], ['SUMMARY', '', ''], ['', '', ''], ['Metric', 'Amount', ''], ['Total Income', tI, ''], ['Total Expense', tE, ''], ['Balance', balance, '']];
    const ws1 = XLSX.utils.aoa_to_sheet(summaryData);
    ws1['!cols'] = [{ wch: 25 }, { wch: 15 }, { wch: 10 }];
    XLSX.utils.book_append_sheet(wb, ws1, 'Summary');
    
    // Income Details Sheet
    const incomeTransactions = transactions.filter(t => t.type === 'income');
    const incomeData = [['Description', 'Date', 'Category', 'Amount (₹)', 'Notes']];
    let incomeSum = 0;
    incomeTransactions.forEach(t => {
        incomeData.push([t.title || '', t.date || '', t.category || '', t.amount || 0, t.notes || '']);
        incomeSum += t.amount || 0;
    });
    incomeData.push(['', '', 'TOTAL:', incomeSum, '']);
    const wsIncome = XLSX.utils.aoa_to_sheet(incomeData);
    wsIncome['!cols'] = [{ wch: 30 }, { wch: 15 }, { wch: 20 }, { wch: 15 }, { wch: 35 }];
    XLSX.utils.book_append_sheet(wb, wsIncome, 'Income');
    
    // Expense Details Sheet
    const expenseTransactions = transactions.filter(t => t.type === 'expense');
    const expenseData = [['Description', 'Date', 'Category', 'Amount (₹)', 'Paid From', 'Notes']];
    let expenseSum = 0;
    expenseTransactions.forEach(t => {
        expenseData.push([t.title || '', t.date || '', t.category || '', t.amount || 0, t.paidFrom || 'Account', t.notes || '']);
        expenseSum += t.amount || 0;
    });
    expenseData.push(['', '', 'TOTAL:', expenseSum, '', '']);
    const wsExpense = XLSX.utils.aoa_to_sheet(expenseData);
    wsExpense['!cols'] = [{ wch: 30 }, { wch: 15 }, { wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 35 }];
    XLSX.utils.book_append_sheet(wb, wsExpense, 'Expenses');
    
    // Category Summary Sheet
    const categoryTotals = {};
    transactions.forEach(t => {
        const key = `${t.type}_${t.category}`;
        if(!categoryTotals[key]) {
            categoryTotals[key] = { type: t.type, category: t.category, amount: 0 };
        }
        categoryTotals[key].amount += t.amount || 0;
    });
    const categoryData = [['Category', 'Type', 'Total (₹)']];
    Object.values(categoryTotals).forEach(cat => {
        categoryData.push([cat.category, cat.type, cat.amount]);
    });
    const wsCategory = XLSX.utils.aoa_to_sheet(categoryData);
    wsCategory['!cols'] = [{ wch: 25 }, { wch: 15 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(wb, wsCategory, 'By Category');
    
    const fileName = `FlowFinance_Report_${new Date().toLocaleDateString().replace(/\//g, '-')}.xlsx`;
    XLSX.writeFile(wb, fileName);
    showSuccess("Excel report generated!");
};

window.resetApp = async () => {
    if(!user) return showError('Not logged in');
    const confirmed = confirm('⚠️ WARNING: This will delete ALL transactions, expenses, budgets, and settings. This cannot be undone! Are you sure?');
    if(!confirmed) return;
    
    const finalConfirm = confirm('Are you absolutely certain? Type "RESET" in the next prompt to confirm.');
    if(!finalConfirm) return;
    
    try {
        const resetCode = prompt('Type "RESET" to confirm data deletion:');
        if(resetCode !== 'RESET') {
            showError('Reset cancelled - codes do not match');
            return;
        }
        
        // Delete all transactions
        const tPath = collection(db, 'artifacts', appId, 'users', user.uid, 'transactions');
        const tSnap = await getDocs(query(tPath));
        for(const doc of tSnap.docs) {
            await deleteDoc(doc.ref);
        }
        
        // Delete all splits
        const sPath = collection(db, 'artifacts', appId, 'users', user.uid, 'splits');
        const sSnap = await getDocs(query(sPath));
        for(const doc of sSnap.docs) {
            await deleteDoc(doc.ref);
        }
        
        // Reset settings to defaults
        const settingsDoc = doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'data');
        const defaultSettings = {
            categories: { income: ['Salary', 'Freelance', 'Dividends'], expense: ['Housing', 'Food', 'Transport', 'Utilities', 'Entertainment'] },
            budgets: {},
            balances: { account: 0, hand: 0 }
        };
        await setDoc(settingsDoc, defaultSettings);
        
        // Reset local state
        transactions = [];
        splits = [];
        categories = defaultSettings.categories;
        budgets = {};
        balances = { account: 0, hand: 0 };
        syncLocalCategories();
        
        showSuccess('🔄 All data has been reset! App will refresh in 2 seconds...');
        setTimeout(() => {
            location.reload();
        }, 2000);
    } catch(err) {
        console.error('Reset error:', err);
        showError('Error during reset: ' + err.message);
    }
};

// Auth listener - setup sync when user logs in
// Setup authentication state listener - checks if user is logged in
if (firebaseReady) {
    onAuthStateChanged(auth, (u) => {
        user = u;
        const sidebarUserName = document.getElementById('sidebarUserName');
        const loadingOverlay = document.getElementById('loadingOverlay');
        
        if (user) {
            // User is logged in, display dashboard
            if(sidebarUserName) sidebarUserName.innerText = user.displayName || 'Demo User';
            // Hide loading overlay
            if(loadingOverlay) {
                loadingOverlay.classList.add('hidden');
                loadingOverlay.style.display = 'none';
            }
            setupSync();
        } else {
            // User is not logged in, redirect to login page
            window.location.href = '/login.html';
        }
    });
} else {
    // Demo mode: check localStorage for demo user
    const demoUserData = localStorage.getItem('demoUser');
    if (demoUserData) {
        try {
            user = JSON.parse(demoUserData);
            console.log('Demo mode activated with user:', user.displayName);
            const sidebarUserName = document.getElementById('sidebarUserName');
            const loadingOverlay = document.getElementById('loadingOverlay');
            if(sidebarUserName) sidebarUserName.innerText = user.displayName || 'Demo User';
            if(loadingOverlay) {
                loadingOverlay.classList.add('hidden');
                loadingOverlay.style.display = 'none';
            }
            setupSync();
        } catch (e) {
            console.error('Failed to parse demo user data:', e);
            window.location.href = '/login.html';
        }
    } else {
        // No demo user, redirect to login
        window.location.href = '/login.html';
    }
}

// Form listeners - setup when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Setup chart date filter listeners
    const chartDateFilter = document.getElementById('chartDateFilter');
    if(chartDateFilter) {
        chartDateFilter.addEventListener('change', updateChartDateFilter);
    }
    
    // Wire filter button explicitly
    const filterBtn = document.getElementById('filterChartBtn');
    if(filterBtn) {
        filterBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            updateChartDateFilter();
        });
    }
    
    // Add listeners to date inputs
    const startDateInput = document.getElementById('chartStartDate');
    const endDateInput = document.getElementById('chartEndDate');
    if(startDateInput) {
        startDateInput.addEventListener('change', updateChartDateFilter);
        startDateInput.addEventListener('keypress', (e) => {
            if(e.key === 'Enter') {
                e.preventDefault();
                updateChartDateFilter();
            }
        });
    }
    if(endDateInput) {
        endDateInput.addEventListener('change', updateChartDateFilter);
        endDateInput.addEventListener('keypress', (e) => {
            if(e.key === 'Enter') {
                e.preventDefault();
                updateChartDateFilter();
            }
        });
    }
    
    const mainForm = document.getElementById('mainForm');
    if (mainForm) {
        mainForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            // Check if user is authenticated
            if (!user) {
                showError("Please log in to save transactions");
                return;
            }

            // Check if Firebase is ready (for non-demo users)
            const isDemoUser = !user.uid || user.uid === 'demo-user-123';
            if (!isDemoUser && !firebaseReady) {
                showError("Firebase connection not ready. Please try again.");
                return;
            }

            const btn = document.getElementById('saveBtn');
            if(btn) btn.disabled = true;
            try {
                // Validate required fields
                const title = document.getElementById('fTitle').value.trim();
                const amountStr = document.getElementById('fAmount').value;
                const category = document.getElementById('fCategory').value;

                if (!title) {
                    throw new Error("Please enter a description");
                }
                if (!amountStr || isNaN(parseFloat(amountStr)) || parseFloat(amountStr) <= 0) {
                    throw new Error("Please enter a valid amount greater than 0");
                }
                if (!category) {
                    throw new Error("Please select a category");
                }

                const amount = parseFloat(amountStr);
                if (amount > 10000000) { // Reasonable upper limit
                    throw new Error("Amount seems too large. Please check the value.");
                }

                const fDate = document.getElementById('fDate')?.value || new Date().toISOString().split('T')[0];
                const transactionData = {
                    title: title,
                    amount: parseFloat(amountStr),
                    category: category,
                    type: document.getElementById('formType').value,
                    paidFrom: document.getElementById('fPaidFrom')?.value || 'account',
                    date: fDate,
                    notes: document.getElementById('fNotes').value
                };

                console.log('Saving transaction:', transactionData); // Debug log

                const editId = mainForm.dataset.editId;
                const isDemoUser = !user.uid || user.uid === 'demo-user-123';

                console.log('User auth status:', {
                user: !!user,
                uid: user?.uid,
                isDemoUser: !user.uid || user.uid === 'demo-user-123',
                firebaseReady
            }); // Debug log
                
                if (editId) {
                    // Update existing transaction
                    if (isDemoUser) {
                        // Demo mode: update in local array
                        const index = transactions.findIndex(t => t.id === editId);
                        if (index !== -1) {
                            // Reverse original transaction effect on balances
                            const orig = transactions[index];
                            if(orig) {
                                const origFrom = orig.paidFrom || 'account';
                                if(orig.type === 'expense') {
                                    balances[origFrom] = (balances[origFrom] || 0) + (orig.amount || 0);
                                } else if(orig.type === 'income') {
                                    balances[origFrom] = (balances[origFrom] || 0) - (orig.amount || 0);
                                }
                            }
                            
                            // Update transaction
                            transactionData.id = editId;
                            transactions[index] = transactionData;
                            
                            // Apply new transaction effect on balances
                            const newFrom = transactionData.paidFrom || 'account';
                            if(transactionData.type === 'expense') {
                                balances[newFrom] = (balances[newFrom] || 0) - (transactionData.amount || 0);
                            } else if(transactionData.type === 'income') {
                                balances[newFrom] = (balances[newFrom] || 0) + (transactionData.amount || 0);
                            }
                            
                            saveDemoData();
                            render();
                        }
                    } else {
                        // Firebase mode
                        const docRef = doc(db, 'artifacts', appId, 'users', user.uid, 'transactions', editId);
                        // Reverse original transaction effect on balances
                        try {
                            const orig = transactions.find(t => t.id === editId);
                            if(orig) {
                                const origFrom = orig.paidFrom || 'account';
                                if(orig.type === 'expense') {
                                    balances[origFrom] = (balances[origFrom] || 0) + (orig.amount || 0);
                                } else if(orig.type === 'income') {
                                    balances[origFrom] = (balances[origFrom] || 0) - (orig.amount || 0);
                                }
                            }
                        } catch(e) {}

                        await setDoc(docRef, transactionData);
                        // Apply new transaction effect on balances
                        try {
                            const newFrom = transactionData.paidFrom || 'account';
                            if(transactionData.type === 'expense') {
                                balances[newFrom] = (balances[newFrom] || 0) - (transactionData.amount || 0);
                            } else if(transactionData.type === 'income') {
                                balances[newFrom] = (balances[newFrom] || 0) + (transactionData.amount || 0);
                            }
                        } catch(e) {}

                        // persist balances
                        await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'data'), { categories, budgets, balances }, { merge: true });
                    }
                    showSuccess("Transaction updated!");
                    delete mainForm.dataset.editId;
                } else {
                    // Create new transaction
                    if (isDemoUser) {
                        // Demo mode: add to local array
                        transactionData.id = Date.now().toString();
                        transactions.push(transactionData);
                        
                        // Apply transaction effect on balances
                        const from = transactionData.paidFrom || 'account';
                        if(transactionData.type === 'expense') {
                            balances[from] = (balances[from] || 0) - (transactionData.amount || 0);
                        } else if(transactionData.type === 'income') {
                            balances[from] = (balances[from] || 0) + (transactionData.amount || 0);
                        }
                        
                        saveDemoData();
                        render();
                    } else {
                        // Firebase mode
                        const path = collection(db, 'artifacts', appId, 'users', user.uid, 'transactions');
                        await addDoc(path, transactionData);
                        // Apply transaction effect on balances
                        try {
                            const from = transactionData.paidFrom || 'account';
                            if(transactionData.type === 'expense') {
                                balances[from] = (balances[from] || 0) - (transactionData.amount || 0);
                            } else if(transactionData.type === 'income') {
                                balances[from] = (balances[from] || 0) + (transactionData.amount || 0);
                            }
                            await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'data'), { categories, budgets, balances }, { merge: true });
                        } catch(e) {}
                    }
                    showSuccess("Transaction saved!");
                }
                
                window.closeModal();
                mainForm.reset();
                const saveBtn = document.getElementById('saveBtn');
                if(saveBtn) saveBtn.innerText = 'Save Record';
            } catch (err) {
                console.error('Transaction save error:', err); // Debug log
                showError(err.message || "Error saving transaction");
            } finally {
                if(btn) btn.disabled = false;
            }
        });
    }

    const splitForm = document.getElementById('splitForm');
    if (splitForm) {
        splitForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (!user) return showError("Not logged in");
            
            const title = document.getElementById('splitTitle').value;
            const amount = parseFloat(document.getElementById('splitAmount').value);
            const date = document.getElementById('splitDate')?.value || new Date().toISOString().split('T')[0];
            const notes = document.getElementById('splitNotes').value;
            const isManual = document.getElementById('manualSplitToggle')?.checked;
            
            let friends = [];
            let totalPaid = 0;
            
            if(isManual) {
                // Get friends with manual amounts
                const nameInputs = document.querySelectorAll('.friend-name');
                const amountInputs = document.querySelectorAll('.friend-amount');
                for(let i = 0; i < nameInputs.length; i++) {
                    const name = nameInputs[i].value.trim();
                    const paidAmount = parseFloat(amountInputs[i].value) || 0;
                    if(name) {
                        friends.push({ name, paid: false, amount: paidAmount });
                        totalPaid += paidAmount;
                    }
                }
            } else {
                // Get friends without manual amounts
                const friendInputs = document.querySelectorAll('.friend-input');
                friends = Array.from(friendInputs).map(input => ({ name: input.value.trim(), paid: false })).filter(f => f.name);
            }
            
            if (friends.length === 0) {
                return showError("Please add at least one friend");
            }
            
            const btn = document.getElementById('saveSplitBtn');
            if(btn) btn.disabled = true;
            try {
                const splitsPath = collection(db, 'artifacts', appId, 'users', user.uid, 'splits');
                const transactionsPath = collection(db, 'artifacts', appId, 'users', user.uid, 'transactions');
                
                let yourShare = 0;
                if(isManual) {
                    // Your share = total - all friends' amounts
                    yourShare = amount - totalPaid;
                } else {
                    // Divide equally
                    yourShare = amount / (friends.length + 1);
                }
                
                // Validate manual split total doesn't exceed amount
                if(isManual && totalPaid > amount) {
                    return showError(`Friends' amounts (₹${totalPaid}) exceed total (₹${amount})`);
                }
                
                await addDoc(splitsPath, { title, amount, date, friends, yourShare, notes, isManual });
                await addDoc(transactionsPath, {
                    title: `[SPLIT] ${title}`,
                    amount: yourShare,
                    category: 'Shared Expenses',
                    type: 'expense',
                    paidFrom: 'account',
                    date,
                    notes: isManual ? `Your share of split with: ${friends.map(f => f.name).join(', ')}` : `Your share of split with: ${friends.map(f => f.name).join(', ')}`
                });
                // Deduct split yourShare from default account balance
                try {
                    balances.account = (balances.account || 0) - (yourShare || 0);
                    await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'data'), { categories, budgets, balances }, { merge: true });
                } catch(e) {}
                
                window.closeSplitModal();
                splitForm.reset();
                document.getElementById('manualSplitToggle').checked = false;
                showSuccess("Split expense saved!");
            } catch (err) {
                showError("Error saving split");
            } finally {
                if(btn) btn.disabled = false;
            }
        });
    }
});

// Date filter for overview chart
window.updateChartDateFilter = () => {
    const filterValue = document.getElementById('chartDateFilter')?.value || '30';
    
    let startDate = new Date();
    let endDate = new Date();
    endDate.setHours(23, 59, 59, 999);
    
    if(filterValue === 'all') {
        startDate = new Date('2000-01-01');
    } else {
        startDate.setDate(endDate.getDate() - parseInt(filterValue));
        startDate.setHours(0, 0, 0, 0);
    }
    
    // Create daily breakdown
    const dailyData = {};
    const currentDate = new Date(startDate);
    while(currentDate <= endDate) {
        const dateKey = currentDate.toISOString().split('T')[0];
        dailyData[dateKey] = { income: 0, expense: 0 };
        currentDate.setDate(currentDate.getDate() + 1);
    }
    
    // Populate daily data from transactions
    transactions.forEach(t => {
        const tDate = new Date(t.date);
        tDate.setHours(0, 0, 0, 0);
        if(tDate >= startDate && tDate <= endDate) {
            const dateKey = t.date;
            if(dailyData[dateKey]) {
                if(t.type === 'income') {
                    dailyData[dateKey].income += t.amount;
                } else {
                    dailyData[dateKey].expense += t.amount;
                }
            }
        }
    });
    
    // Format for chart
    const labels = Object.keys(dailyData).sort();
    const incomeData = labels.map(date => dailyData[date].income);
    const expenseData = labels.map(date => dailyData[date].expense);
    const formattedLabels = labels.map(d => {
        const date = new Date(d);
        return date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
    });
    
    // Update chart
    if(mainChart) {
        mainChart.data.labels = formattedLabels;
        mainChart.data.datasets[0].data = incomeData;
        mainChart.data.datasets[1].data = expenseData;
        mainChart.update();
    }
};

// Initialize on DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
    initChart();
});
