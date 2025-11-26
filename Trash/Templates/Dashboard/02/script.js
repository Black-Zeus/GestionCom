/* ====================================
   DASHBOARD BENTO - JAVASCRIPT
==================================== */

// ====================================
// CONFIGURACIÓN GLOBAL
// ====================================
const DashboardConfig = {
    updateInterval: 5000,
    enableRealTimeUpdates: true,
    chartColors: {
        primary: '#007bff',
        success: '#28a745',
        warning: '#ffc107',
        danger: '#dc3545',
        info: '#17a2b8',
        purple: '#6f42c1',
        pink: '#e83e8c',
        orange: '#fd7e14'
    }
};

// ====================================
// CLASE PRINCIPAL DEL DASHBOARD
// ====================================
class BentoDashboard {
    constructor() {
        this.charts = {};
        this.updateTimers = [];
        this.init();
    }

    init() {
        console.log('🚀 Inicializando Bento Dashboard...');
        
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.initializeComponents());
        } else {
            this.initializeComponents();
        }
    }

    initializeComponents() {
        try {
            this.initializeCharts();
            this.startRealTimeUpdates();
            this.setupInteractions();
            
            console.log('✅ Dashboard inicializado correctamente');
        } catch (error) {
            console.error('❌ Error inicializando dashboard:', error);
        }
    }

    // ====================================
    // INICIALIZACIÓN DE GRÁFICOS
    // ====================================
    initializeCharts() {
        this.createVentasDiaChart();
        this.createMetodosPagoChart();
        this.createABCChart();
        this.createVendedoresChart();
        this.createAgingChart();
        this.createVentasMesChart();
        this.createSegmentacionChart();
        this.createInventarioSparkline();
    }

    // GRÁFICO: Ventas del Día (Línea con área)
    createVentasDiaChart() {
        const ctx = document.getElementById('ventasDiaChart');
        if (!ctx) return;

        const hours = [];
        const data = [];
        for (let i = 8; i <= 18; i++) {
            hours.push(`${i}:00`);
            data.push(Math.floor(Math.random() * 150000) + 50000);
        }

        this.charts.ventasDia = new Chart(ctx, {
            type: 'line',
            data: {
                labels: hours,
                datasets: [{
                    label: 'Ventas por Hora',
                    data: data,
                    borderColor: DashboardConfig.chartColors.primary,
                    backgroundColor: 'rgba(0, 123, 255, 0.1)',
                    fill: true,
                    tension: 0.4,
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: (context) => `$${context.parsed.y.toLocaleString()}`
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: (value) => `$${(value/1000).toFixed(0)}K`
                        }
                    }
                }
            }
        });
    }

    // GRÁFICO: Métodos de Pago (Donut)
    createMetodosPagoChart() {
        const ctx = document.getElementById('metodosPagoChart');
        if (!ctx) return;

        this.charts.metodosPago = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Efectivo', 'Tarjetas', 'Transferencias', 'Crédito'],
                datasets: [{
                    data: [185400, 245800, 87300, 15600],
                    backgroundColor: [
                        DashboardConfig.chartColors.success,
                        DashboardConfig.chartColors.primary,
                        DashboardConfig.chartColors.info,
                        DashboardConfig.chartColors.warning
                    ],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 10,
                            font: { size: 11 },
                            generateLabels: (chart) => {
                                const data = chart.data;
                                return data.labels.map((label, i) => {
                                    const value = data.datasets[0].data[i];
                                    const total = data.datasets[0].data.reduce((a, b) => a + b, 0);
                                    const percentage = ((value / total) * 100).toFixed(1);
                                    return {
                                        text: `${label} - ${percentage}%`,
                                        fillStyle: data.datasets[0].backgroundColor[i]
                                    };
                                });
                            }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                const label = context.label || '';
                                const value = context.parsed;
                                return `${label}: $${value.toLocaleString()}`;
                            }
                        }
                    }
                }
            }
        });
    }

    // GRÁFICO: Análisis ABC (Barras)
    createABCChart() {
        const ctx = document.getElementById('abcChart');
        if (!ctx) return;

        this.charts.abc = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Clase A', 'Clase B', 'Clase C'],
                datasets: [{
                    label: 'Productos',
                    data: [124, 248, 875],
                    backgroundColor: [
                        DashboardConfig.chartColors.success,
                        DashboardConfig.chartColors.warning,
                        DashboardConfig.chartColors.danger
                    ],
                    borderRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            afterLabel: (context) => {
                                const percentages = ['80% ventas', '15% ventas', '5% ventas'];
                                return percentages[context.dataIndex];
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }

    // GRÁFICO: Top Vendedores (Barras Horizontales)
    createVendedoresChart() {
        const ctx = document.getElementById('vendedoresChart');
        if (!ctx) return;

        this.charts.vendedores = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Juan Pérez', 'María García', 'Carlos López', 'Ana Martínez', 'Pedro Silva'],
                datasets: [{
                    label: 'Ventas ($)',
                    data: [1200000, 980000, 850000, 720000, 650000],
                    backgroundColor: DashboardConfig.chartColors.primary,
                    borderRadius: 6
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: (context) => `$${context.parsed.x.toLocaleString()}`
                        }
                    }
                },
                scales: {
                    x: {
                        beginAtZero: true,
                        ticks: {
                            callback: (value) => `$${(value/1000).toFixed(0)}K`
                        }
                    }
                }
            }
        });
    }

    // GRÁFICO: Aging de Cuentas (Barras Apiladas)
    createAgingChart() {
        const ctx = document.getElementById('agingChart');
        if (!ctx) return;

        this.charts.aging = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['0-30', '31-60', '61-90', '+90'],
                datasets: [{
                    label: 'Días',
                    data: [1800000, 485000, 345000, 170000],
                    backgroundColor: [
                        DashboardConfig.chartColors.success,
                        DashboardConfig.chartColors.warning,
                        DashboardConfig.chartColors.orange,
                        DashboardConfig.chartColors.danger
                    ],
                    borderRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                const value = context.parsed.y;
                                const total = 2800000;
                                const percentage = ((value / total) * 100).toFixed(1);
                                return `$${value.toLocaleString()} (${percentage}%)`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: (value) => `$${(value/1000).toFixed(0)}K`
                        }
                    }
                }
            }
        });
    }

    // GRÁFICO: Ventas del Mes (Área)
    createVentasMesChart() {
        const ctx = document.getElementById('ventasMesChart');
        if (!ctx) return;

        const days = [];
        const data = [];
        for (let i = 1; i <= 26; i++) {
            days.push(i);
            data.push(Math.floor(Math.random() * 800000) + 200000);
        }

        this.charts.ventasMes = new Chart(ctx, {
            type: 'line',
            data: {
                labels: days,
                datasets: [{
                    label: 'Ventas Diarias',
                    data: data,
                    borderColor: DashboardConfig.chartColors.success,
                    backgroundColor: 'rgba(40, 167, 69, 0.1)',
                    fill: true,
                    tension: 0.4,
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: (context) => `$${context.parsed.y.toLocaleString()}`
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: (value) => `$${(value/1000).toFixed(0)}K`
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Día del Mes'
                        }
                    }
                }
            }
        });
    }

    // GRÁFICO: Segmentación de Clientes (Donut)
    createSegmentacionChart() {
        const ctx = document.getElementById('segmentacionChart');
        if (!ctx) return;

        this.charts.segmentacion = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Premium', 'Regulares', 'Ocasionales'],
                datasets: [{
                    data: [89, 567, 1300],
                    backgroundColor: [
                        DashboardConfig.chartColors.purple,
                        DashboardConfig.chartColors.primary,
                        DashboardConfig.chartColors.info
                    ],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 10,
                            font: { size: 11 }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                const label = context.label || '';
                                const value = context.parsed;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((value / total) * 100).toFixed(1);
                                return `${label}: ${value} clientes (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
    }

    // GRÁFICO: Sparkline Inventario
    createInventarioSparkline() {
        const ctx = document.getElementById('inventarioSparkline');
        if (!ctx) return;

        const data = [];
        for (let i = 0; i < 20; i++) {
            data.push(Math.floor(Math.random() * 2000000) + 14000000);
        }

        this.charts.sparkline = new Chart(ctx, {
            type: 'line',
            data: {
                labels: Array(20).fill(''),
                datasets: [{
                    data: data,
                    borderColor: 'rgba(255, 255, 255, 0.8)',
                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                    fill: true,
                    tension: 0.4,
                    borderWidth: 2,
                    pointRadius: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: { enabled: false }
                },
                scales: {
                    x: { display: false },
                    y: { display: false }
                }
            }
        });
    }

    // ====================================
    // ACTUALIZACIONES EN TIEMPO REAL
    // ====================================
    startRealTimeUpdates() {
        if (!DashboardConfig.enableRealTimeUpdates) return;

        // Actualizar métricas cada 5 segundos
        const metricsTimer = setInterval(() => {
            this.updateMetrics();
        }, DashboardConfig.updateInterval);

        // Actualizar gráficos cada 10 segundos
        const chartsTimer = setInterval(() => {
            this.updateCharts();
        }, DashboardConfig.updateInterval * 2);

        this.updateTimers.push(metricsTimer, chartsTimer);
        
        console.log('⏰ Actualizaciones en tiempo real iniciadas');
    }

    updateMetrics() {
        // Actualizar métricas con variación aleatoria
        const metrics = document.querySelectorAll('.metric');
        metrics.forEach(metric => {
            if (Math.random() > 0.9) {
                const text = metric.textContent;
                if (text.includes('$')) {
                    const value = this.parseNumber(text);
                    const variation = (Math.random() - 0.5) * 0.05;
                    const newValue = Math.floor(value * (1 + variation));
                    
                    metric.style.transform = 'scale(1.1)';
                    setTimeout(() => {
                        metric.textContent = this.formatCurrency(newValue);
                        metric.style.transform = 'scale(1)';
                    }, 150);
                }
            }
        });
    }

    updateCharts() {
        // Actualizar datos de gráficos con nuevos valores
        Object.keys(this.charts).forEach(chartKey => {
            const chart = this.charts[chartKey];
            if (chart && Math.random() > 0.7) {
                // Actualizar solo algunos gráficos aleatoriamente
                if (chart.data.datasets[0]) {
                    const dataset = chart.data.datasets[0];
                    dataset.data = dataset.data.map(value => {
                        const variation = (Math.random() - 0.5) * 0.1;
                        return Math.floor(value * (1 + variation));
                    });
                    chart.update('none');
                }
            }
        });
    }

    // ====================================
    // INTERACCIONES
    // ====================================
    setupInteractions() {
        // Click en cards para expandir/contraer
        document.querySelectorAll('.bento-card').forEach(card => {
            card.addEventListener('click', (e) => {
                if (e.target.closest('.card-header')) {
                    card.classList.toggle('expanded');
                }
            });
        });

        // Hover effects
        document.querySelectorAll('.metric-card').forEach(card => {
            card.addEventListener('mouseenter', () => {
                card.style.transform = 'scale(1.02)';
            });
            
            card.addEventListener('mouseleave', () => {
                card.style.transform = 'scale(1)';
            });
        });
    }

    // ====================================
    // UTILIDADES
    // ====================================
    parseNumber(text) {
        return parseInt(text.replace(/[^\d]/g, '')) || 0;
    }

    formatCurrency(number) {
        return '$' + number.toLocaleString('es-ES');
    }

    destroy() {
        // Limpiar timers
        this.updateTimers.forEach(timer => clearInterval(timer));
        this.updateTimers = [];

        // Destruir gráficos
        Object.keys(this.charts).forEach(key => {
            if (this.charts[key]) {
                this.charts[key].destroy();
            }
        });
        this.charts = {};
        
        console.log('🧹 Dashboard limpiado');
    }
}

// ====================================
// API PÚBLICA
// ====================================
window.DashboardAPI = {
    instance: null,
    
    init() {
        if (!this.instance) {
            this.instance = new BentoDashboard();
        }
        return this.instance;
    },
    
    refresh() {
        if (this.instance) {
            this.instance.updateMetrics();
            this.instance.updateCharts();
        }
    },
    
    destroy() {
        if (this.instance) {
            this.instance.destroy();
            this.instance = null;
        }
    }
};

// ====================================
// AUTO-INICIALIZACIÓN
// ====================================
(function() {
    'use strict';
    
    console.log('📊 Bento Dashboard JavaScript cargado');
    
    // Inicializar dashboard
    window.DashboardAPI.init();
    
    // Manejar eventos de visibilidad
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            console.log('⏸️ Dashboard pausado');
        } else {
            console.log('▶️ Dashboard reanudado');
            window.DashboardAPI.refresh();
        }
    });
    
})();