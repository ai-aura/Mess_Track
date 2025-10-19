// MessTrack - Main Application JavaScript
// Offline-first mess attendance tracker

// ====================
// Application State
// ====================
class MessTrack {
    constructor() {
        this.currentPage = 'dashboard';
        this.currentViewMonth = new Date();
        this.data = {
            attendance: {},
            summaries: {},
            notes: {},
            settings: {
                theme: 'light',
                notifications: false,
                lunchTime: '12:00',
                dinnerTime: '19:00'
            }
        };
        this.bulkEditMode = false;
        this.selectedDays = new Set();
        this.currentSkipMeal = null;
        this.customDateRange = null; // For date range picker
        this.weeklyDays = []; // Store currently displayed days
        
        // Advanced features state
        this.pullToRefresh = { startY: 0, pulling: false };
        this.swipeNav = { startX: 0, swiping: false };
        this.longPressTimer = null;
        this.gestureHintsShown = JSON.parse(localStorage.getItem('gestureHintsShown') || '{}');
        this.appVersion = '2.0.0';
        // PWA install state
        this.deferredPrompt = null;
        
        this.init();
    }

    // ====================
    // Initialization
    // ====================
    init() {
        this.loadData();
        this.checkAndAutoReset();
        this.setupEventListeners();
        this.initializeUI();
        this.registerServiceWorker();

        // Check if app is opened for first time
        if (!localStorage.getItem('messtrack_initialized')) {
            this.showToast('Welcome to MessTrack! 🎉');
            localStorage.setItem('messtrack_initialized', 'true');
        }
    }

    // ====================
    // Data Management
    // ====================
    loadData() {
        // Load attendance data
        const attendanceData = localStorage.getItem('messtrack_attendance');
        if (attendanceData) {
            this.data.attendance = JSON.parse(attendanceData);
        }

        // Load summaries
        const summariesData = localStorage.getItem('messtrack_summaries');
        if (summariesData) {
            this.data.summaries = JSON.parse(summariesData);
        }

        // Load notes
        const notesData = localStorage.getItem('messtrack_notes');
        if (notesData) {
            this.data.notes = JSON.parse(notesData);
        }

        // Load settings
        const settingsData = localStorage.getItem('messtrack_settings');
        if (settingsData) {
            this.data.settings = {...this.data.settings, ...JSON.parse(settingsData)};
        }
    }

    saveData() {
        localStorage.setItem('messtrack_attendance', JSON.stringify(this.data.attendance));
        localStorage.setItem('messtrack_summaries', JSON.stringify(this.data.summaries));
        localStorage.setItem('messtrack_notes', JSON.stringify(this.data.notes));
        localStorage.setItem('messtrack_settings', JSON.stringify(this.data.settings));
    }

    // ====================
    // Auto Reset & Archive
    // ====================
    checkAndAutoReset() {
        const today = new Date();
        const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

        // Check last reset date
        const lastReset = localStorage.getItem('messtrack_last_reset');

        if (lastReset !== currentMonth) {
            // Archive previous month's data if exists
            if (Object.keys(this.data.attendance).length > 0) {
                this.archivePreviousMonth();
            }

            // Set new reset date
            localStorage.setItem('messtrack_last_reset', currentMonth);
            this.showToast('New month detected! Previous data archived.');
        }
    }

    archivePreviousMonth() {
        const previousMonth = new Date();
        previousMonth.setMonth(previousMonth.getMonth() - 1);
        const monthKey = `${previousMonth.getFullYear()}-${String(previousMonth.getMonth() + 1).padStart(2, '0')}`;

        // Calculate summary for previous month
        let lunchCount = 0;
        let dinnerCount = 0;
        let totalDays = 0;

        Object.entries(this.data.attendance).forEach(([date, meals]) => {
            if (date.startsWith(monthKey)) {
                totalDays++;
                if (meals.lunch) lunchCount++;
                if (meals.dinner) dinnerCount++;
            }
        });

        if (totalDays > 0) {
            const totalPossibleMeals = totalDays * 2;
            const totalAttended = lunchCount + dinnerCount;
            const percentage = ((totalAttended / totalPossibleMeals) * 100).toFixed(1);

            this.data.summaries[monthKey] = {
                lunchCount,
                dinnerCount,
                totalDays,
                percentage
            };

            // Remove old attendance data
            Object.keys(this.data.attendance).forEach(date => {
                if (date.startsWith(monthKey)) {
                    delete this.data.attendance[date];
                }
            });

            this.saveData();
        }
    }

    // ====================
    // UI Initialization
    // ====================
    initializeUI() {
        this.applyTheme(this.data.settings.theme);
        this.registerServiceWorker();
        this.scheduleReminder();
        
        // Initialize advanced mobile features
        this.initAdvancedFeatures();
        
        // Load today's page by default
        this.showPage('dashboard');
        this.updateDashboard();
        this.updateDateTime();
        this.initializeMealTimes();
        // Initialize PWA install handlers/UI
        this.initInstallHandlers();
        
        // Update date every minute
        setInterval(() => this.updateDateTime(), 60000);
    }

    initializeMealTimes() {
        const lunchTime = document.getElementById('lunchTime');
        const dinnerTime = document.getElementById('dinnerTime');
        
        if (lunchTime) {
            lunchTime.value = this.data.settings.lunchTime || '12:00';
        }
        
        if (dinnerTime) {
            dinnerTime.value = this.data.settings.dinnerTime || '19:00';
        }
    }

    updateDateTime() {
        const now = new Date();
        const options = {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        };

        const dateStr = now.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        const dayStr = now.toLocaleDateString('en-US', {
            weekday: 'long'
        });

        const currentDateEl = document.getElementById('currentDate');
        const currentDayEl = document.getElementById('currentDay');

        if (currentDateEl) currentDateEl.textContent = dateStr;
        if (currentDayEl) currentDayEl.textContent = dayStr;
    }

    // ====================
    // Event Listeners
    // ====================
    setupEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const page = e.currentTarget.dataset.page;
                this.showPage(page);
            });
        });

        // Theme Toggle
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => this.toggleTheme());
        }

        // Theme Select
        const themeSelect = document.getElementById('themeSelect');
        if (themeSelect) {
            themeSelect.value = this.data.settings.theme;
            themeSelect.addEventListener('change', (e) => {
                this.applyTheme(e.target.value);
                this.data.settings.theme = e.target.value;
                this.saveData();
            });
        }

        // Attendance Buttons
        const lunchBtn = document.getElementById('lunchBtn');
        const dinnerBtn = document.getElementById('dinnerBtn');

        if (lunchBtn) {
            lunchBtn.addEventListener('click', () => this.markAttendance('lunch'));
        }

        if (dinnerBtn) {
            dinnerBtn.addEventListener('click', () => this.markAttendance('dinner'));
        }

        // Calendar Navigation
        const prevMonth = document.getElementById('prevMonth');
        const nextMonth = document.getElementById('nextMonth');

        if (prevMonth) {
            prevMonth.addEventListener('click', () => this.changeMonth(-1));
        }

        if (nextMonth) {
            nextMonth.addEventListener('click', () => this.changeMonth(1));
        }

        // Export Buttons
        const exportCSV = document.getElementById('exportCSV');
        const exportPDF = document.getElementById('exportPDF');

        if (exportCSV) {
            exportCSV.addEventListener('click', () => this.exportToCSV());
        }
        
        if (exportPDF) {
            exportPDF.addEventListener('click', () => this.exportToPDF());
        }

        // New Export/Share Buttons
        const generateQR = document.getElementById('generateQR');
        const shareReport = document.getElementById('shareReport');
        
        if (generateQR) {
            generateQR.addEventListener('click', () => this.generateQRCode());
        }
        
        if (shareReport) {
            shareReport.addEventListener('click', () => this.shareReport());
        }

        // Bulk Edit Event Listeners
        const bulkEditToggle = document.getElementById('bulkEditToggle');
        const bulkEditCancel = document.getElementById('bulkEditCancel');
        const bulkSelectAll = document.getElementById('bulkSelectAll');
        const bulkSelectNone = document.getElementById('bulkSelectNone');
        const bulkMarkLunch = document.getElementById('bulkMarkLunch');
        const bulkMarkDinner = document.getElementById('bulkMarkDinner');
        const bulkMarkBoth = document.getElementById('bulkMarkBoth');
        const bulkClear = document.getElementById('bulkClear');
        
        if (bulkEditToggle) {
            bulkEditToggle.addEventListener('click', () => this.toggleBulkEditMode());
        }
        
        if (bulkEditCancel) {
            bulkEditCancel.addEventListener('click', () => this.toggleBulkEditMode());
        }
        
        if (bulkSelectAll) {
            bulkSelectAll.addEventListener('click', () => this.bulkSelectAll());
        }
        
        if (bulkSelectNone) {
            bulkSelectNone.addEventListener('click', () => this.bulkSelectNone());
        }
        
        if (bulkMarkLunch) {
            bulkMarkLunch.addEventListener('click', () => this.bulkMarkMeal('lunch'));
        }
        
        if (bulkMarkDinner) {
            bulkMarkDinner.addEventListener('click', () => this.bulkMarkMeal('dinner'));
        }
        
        if (bulkMarkBoth) {
            bulkMarkBoth.addEventListener('click', () => this.bulkMarkMeal('both'));
        }
        
        if (bulkClear) {
            bulkClear.addEventListener('click', () => this.bulkClearMeals());
        }
        
        // Date Range Picker Event Listeners
        const dateRangeToggle = document.getElementById('dateRangeToggle');
        const closeDateRange = document.getElementById('closeDateRange');
        const applyDateRange = document.getElementById('applyDateRange');
        const resetToWeekly = document.getElementById('resetToWeekly');
        
        if (dateRangeToggle) {
            dateRangeToggle.addEventListener('click', () => this.toggleDateRangePanel());
        }
        
        if (closeDateRange) {
            closeDateRange.addEventListener('click', () => this.toggleDateRangePanel());
        }
        
        if (applyDateRange) {
            applyDateRange.addEventListener('click', () => this.applyCustomDateRange());
        }
        
        if (resetToWeekly) {
            resetToWeekly.addEventListener('click', () => this.resetToWeeklyView());
        }
        
        // Export Selected Event Listeners
        const exportSelectedCSV = document.getElementById('exportSelectedCSV');
        const exportSelectedPDF = document.getElementById('exportSelectedPDF');
        
        if (exportSelectedCSV) {
            exportSelectedCSV.addEventListener('click', () => this.exportSelectedToCSV());
        }
        
        if (exportSelectedPDF) {
            exportSelectedPDF.addEventListener('click', () => this.exportSelectedToPDF());
        }
        
        // Notification Toggle
        const notificationToggle = document.getElementById('notificationToggle');
        if (notificationToggle) {
            notificationToggle.checked = this.data.settings.notifications;
            notificationToggle.addEventListener('change', (e) => {
                this.data.settings.notifications = e.target.checked;
                this.saveData();
                if (e.target.checked) {
                    this.requestNotificationPermission();
                } else {
                    this.showToast('Notifications disabled');
                }
            });
        }
        
        // FAB Event Listeners
        this.setupFAB();
        
        // Skip Reason Modal
        this.setupSkipReasonModal();
        
        // Settings with meal times
        const lunchTime = document.getElementById('lunchTime');
        const dinnerTime = document.getElementById('dinnerTime');
        
        if (lunchTime) {
            lunchTime.value = this.data.settings.lunchTime;
            lunchTime.addEventListener('change', (e) => {
                this.data.settings.lunchTime = e.target.value;
                this.saveData();
            });
        }
        
        if (dinnerTime) {
            dinnerTime.value = this.data.settings.dinnerTime;
            dinnerTime.addEventListener('change', (e) => {
                this.data.settings.dinnerTime = e.target.value;
                this.saveData();
            });
        }
    }

    // ====================
    // Navigation
    // ====================
    showPage(pageName) {
        // Hide all pages
        document.querySelectorAll('.page').forEach(page => {
            page.classList.add('hidden');
        });

        // Show selected page
        const selectedPage = document.getElementById(pageName);
        if (selectedPage) {
            selectedPage.classList.remove('hidden');
        }

        // Update navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
            if (item.dataset.page === pageName) {
                item.classList.add('active');
            }
        });

        this.currentPage = pageName;

        // Update page-specific content
        switch(pageName) {
            case 'dashboard':
                this.updateDashboard();
                break;
            case 'weekly':
                this.updateWeeklyView();
                break;
            case 'history':
                this.updateCalendar();
                break;
            case 'summary':
                this.updateSummary();
                break;
            case 'settings':
                // Refresh install UI when opening Settings
                this.updateInstallUI();
                break;
        }
    }

    // ====================
    // Dashboard Functions
    // ====================
    updateDashboard() {
        const today = this.getTodayString();
        const todayData = this.data.attendance[today] || {
            lunch: false,
            dinner: false
        };

        // Update button states
        const lunchBtn = document.getElementById('lunchBtn');
        const dinnerBtn = document.getElementById('dinnerBtn');
        const lunchStatus = document.getElementById('lunchStatus');
        const dinnerStatus = document.getElementById('dinnerStatus');

        if (lunchBtn) {
            if (todayData.lunch) {
                lunchBtn.classList.add('marked');
                lunchStatus.innerHTML = '<i class="fas fa-check-circle text-green-400"></i> Marked';
            } else {
                lunchBtn.classList.remove('marked');
                lunchStatus.innerHTML = '';
            }
        }

        if (dinnerBtn) {
            if (todayData.dinner) {
                dinnerBtn.classList.add('marked');
                dinnerStatus.innerHTML = '<i class="fas fa-check-circle text-green-400"></i> Marked';
            } else {
                dinnerBtn.classList.remove('marked');
                dinnerStatus.innerHTML = '';
            }
        }

        // Update daily status
        this.updateDailyStatus();
    }

    updateDailyStatus() {
        const today = this.getTodayString();
        const todayData = this.data.attendance[today] || {
            lunch: false,
            dinner: false
        };
        const dailyStatus = document.getElementById('dailyStatus');

        if (dailyStatus) {
            dailyStatus.innerHTML = `
                <div class="glass p-4 text-center">
                    <i class="fas fa-sun text-2xl text-yellow-400 mb-2"></i>
                    <p class="font-bold">Lunch</p>
                    <p class="${todayData.lunch ? 'text-green-400' : 'opacity-60'}">
                        ${todayData.lunch ? 'Attended ✓' : 'Not Marked'}
                    </p>
                </div>
                <div class="glass p-4 text-center">
                    <i class="fas fa-moon text-2xl text-blue-400 mb-2"></i>
                    <p class="font-bold">Dinner</p>
                    <p class="${todayData.dinner ? 'text-green-400' : 'opacity-60'}">
                        ${todayData.dinner ? 'Attended ✓' : 'Not Marked'}
                    </p>
                </div>
            `;
        }
    }

    markAttendance(type) {
        const today = this.getTodayString();

        if (!this.data.attendance[today]) {
            this.data.attendance[today] = {
                lunch: false,
                dinner: false
            };
        }

        // Toggle attendance
        this.data.attendance[today][type] = !this.data.attendance[today][type];

        // Save data
        this.saveData();

        // Update UI
        this.updateDashboard();

        // Show toast
        if (this.data.attendance[today][type]) {
            this.showToast(`${type.charAt(0).toUpperCase() + type.slice(1)} attendance marked! ✓`);

            // Schedule notification if enabled
            if (this.data.settings.notifications) {
                this.scheduleReminder();
            }
        } else {
            this.showToast(`${type.charAt(0).toUpperCase() + type.slice(1)} attendance removed`);
        }
    }

    // ====================
    // Calendar Functions
    // ====================
    updateCalendar() {
        const year = this.currentViewMonth.getFullYear();
        const month = this.currentViewMonth.getMonth();

        // Update month display
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];
        const currentMonthEl = document.getElementById('currentMonth');
        if (currentMonthEl) {
            currentMonthEl.textContent = `${monthNames[month]} ${year}`;
        }

        // Generate calendar
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        const calendarGrid = document.getElementById('calendarGrid');
        if (!calendarGrid) return;

        calendarGrid.innerHTML = '';

        // Add empty cells for days before month starts
        for (let i = 0; i < firstDay; i++) {
            const emptyDay = document.createElement('div');
            calendarGrid.appendChild(emptyDay);
        }

        // Add days of month
        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const dayData = this.data.attendance[dateStr] || {
                lunch: false,
                dinner: false
            };

            const dayEl = document.createElement('div');
            dayEl.className = 'calendar-day glass p-2';

            // Determine icon based on attendance
            let icon = '';
            if (dayData.lunch && dayData.dinner) {
                icon = '<i class="fas fa-check-circle text-green-400 text-lg"></i>';
            } else if (dayData.lunch) {
                icon = '<i class="fas fa-sun text-yellow-400 text-lg"></i>';
            } else if (dayData.dinner) {
                icon = '<i class="fas fa-moon text-blue-400 text-lg"></i>';
            }

            // Highlight today
            const today = this.getTodayString();
            const isToday = dateStr === today;

            dayEl.innerHTML = `
                <div class="text-sm font-bold ${isToday ? 'text-blue-400' : ''}">${day}</div>
                <div class="mt-1">${icon}</div>
            `;

            if (isToday) {
                dayEl.classList.add('ring-2', 'ring-blue-400');
            }

            calendarGrid.appendChild(dayEl);
        }
    }

    changeMonth(direction) {
        this.currentViewMonth.setMonth(this.currentViewMonth.getMonth() + direction);
        this.updateCalendar();
    }

    // ====================
    // Summary Functions
    // ====================
    updateSummary() {
        const currentMonth = new Date();
        const monthKey = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}`;

        // Calculate current month stats
        let lunchCount = 0;
        let dinnerCount = 0;
        let totalDays = 0;

        Object.entries(this.data.attendance).forEach(([date, meals]) => {
            if (date.startsWith(monthKey)) {
                totalDays++;
                if (meals.lunch) lunchCount++;
                if (meals.dinner) dinnerCount++;
            }
        });

        const totalPossibleMeals = Math.max(totalDays * 2, 1);
        const totalAttended = lunchCount + dinnerCount;
        const percentage = ((totalAttended / totalPossibleMeals) * 100).toFixed(1);

        // Update UI
        const lunchCountEl = document.getElementById('lunchCount');
        const dinnerCountEl = document.getElementById('dinnerCount');
        const percentageEl = document.getElementById('attendancePercentage');

        if (lunchCountEl) lunchCountEl.textContent = lunchCount;
        if (dinnerCountEl) dinnerCountEl.textContent = dinnerCount;
        if (percentageEl) percentageEl.textContent = percentage + '%';

        // Update archived summaries
        this.updateArchivedSummaries();
    }

    updateArchivedSummaries() {
        const archivedSummaries = document.getElementById('archivedSummaries');
        if (!archivedSummaries) return;

        if (Object.keys(this.data.summaries).length === 0) {
            archivedSummaries.innerHTML = '<p class="opacity-60">No archived data yet</p>';
            return;
        }

        let html = '';
        const sortedMonths = Object.keys(this.data.summaries).sort().reverse();

        sortedMonths.forEach(monthKey => {
            const summary = this.data.summaries[monthKey];
            const [year, month] = monthKey.split('-');
            const monthName = new Date(year, parseInt(month) - 1).toLocaleDateString('en-US', {
                month: 'long',
                year: 'numeric'
            });

            html += `
                <div class="glass p-4 mb-4">
                    <h4 class="font-bold mb-2">${monthName}</h4>
                    <div class="grid grid-cols-3 gap-4 text-sm">
                        <div>
                            <i class="fas fa-sun text-yellow-400"></i>
                            <span class="ml-1">Lunch: ${summary.lunchCount}</span>
                        </div>
                        <div>
                            <i class="fas fa-moon text-blue-400"></i>
                            <span class="ml-1">Dinner: ${summary.dinnerCount}</span>
                        </div>
                        <div>
                            <i class="fas fa-percentage text-green-400"></i>
                            <span class="ml-1">${summary.percentage}%</span>
                        </div>
                    </div>
                </div>
            `;
        });

        archivedSummaries.innerHTML = html;
    }

    // ====================
    // Export Functions
    // ====================
    exportToCSV() {
        const currentMonth = new Date();
        const monthKey = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}`;

        let csv = 'Date,Day,Lunch,Dinner,Notes\n';

        // Sort dates
        const sortedDates = Object.keys(this.data.attendance)
            .filter(date => date.startsWith(monthKey))
            .sort();

        sortedDates.forEach(date => {
            const meals = this.data.attendance[date];
            const dateObj = new Date(date);
            const formattedDate = dateObj.toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'short', 
                day: 'numeric' 
            });
            const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
            const notes = this.data.notes[date] || {};
            const noteText = notes.note || notes.skipReason || '';
            
            // Escape commas in notes
            const escapedNotes = noteText.replace(/"/g, '""');
            csv += `"${formattedDate}","${dayName}","${meals.lunch ? 'Yes' : 'No'}","${meals.dinner ? 'Yes' : 'No'}","${escapedNotes}"\n`;
        });

        // Download CSV
        const blob = new Blob([csv], {
            type: 'text/csv'
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `MessTrack_Report_${monthKey}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        this.showToast('CSV exported with proper formatting! 📊');
    }

    exportToPDF() {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        const currentMonth = new Date();
        const monthKey = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}`;
        const monthName = currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        
        // Colors
        const primaryColor = [102, 126, 234];
        const successColor = [34, 197, 94];
        const dangerColor = [239, 68, 68];
        
        // Header
        doc.setFillColor(...primaryColor);
        doc.rect(0, 0, 210, 40, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(24);
        doc.text('🍽️ MessTrack Report', 20, 25);
        doc.setFontSize(14);
        doc.text(monthName, 20, 35);
        doc.setTextColor(0, 0, 0);
        
        // Summary calculations
        let lunchCount = 0;
        let dinnerCount = 0;
        let totalDays = 0;
        let notesCount = 0;
        
        Object.entries(this.data.attendance).forEach(([date, meals]) => {
            if (date.startsWith(monthKey)) {
                totalDays++;
                if (meals.lunch) lunchCount++;
                if (meals.dinner) dinnerCount++;
            }
        });
        
        Object.keys(this.data.notes).forEach(date => {
            if (date.startsWith(monthKey)) notesCount++;
        });
        
        const totalPossibleMeals = totalDays * 2;
        const totalAttended = lunchCount + dinnerCount;
        const percentage = totalPossibleMeals > 0 ? ((totalAttended / totalPossibleMeals) * 100).toFixed(1) : '0.0';
        
        let yPos = 55;
        
        // Summary section
        doc.setFontSize(16);
        doc.setTextColor(...primaryColor);
        doc.text('📊 Monthly Summary', 20, yPos);
        yPos += 15;
        
        // Summary cards
        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        
        // Lunch card
        doc.setFillColor(255, 252, 235);
        doc.roundedRect(20, yPos, 50, 25, 3, 3, 'F');
        doc.setTextColor(251, 191, 36);
        doc.text('☀️ Lunch', 25, yPos + 8);
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(16);
        doc.text(`${lunchCount}`, 25, yPos + 18);
        doc.setFontSize(10);
        doc.text('days', 35, yPos + 18);
        
        // Dinner card
        doc.setFillColor(239, 246, 255);
        doc.roundedRect(80, yPos, 50, 25, 3, 3, 'F');
        doc.setTextColor(59, 130, 246);
        doc.setFontSize(12);
        doc.text('🌙 Dinner', 85, yPos + 8);
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(16);
        doc.text(`${dinnerCount}`, 85, yPos + 18);
        doc.setFontSize(10);
        doc.text('days', 95, yPos + 18);
        
        // Percentage card
        doc.setFillColor(240, 253, 244);
        doc.roundedRect(140, yPos, 50, 25, 3, 3, 'F');
        doc.setTextColor(...successColor);
        doc.setFontSize(12);
        doc.text('📈 Overall', 145, yPos + 8);
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(16);
        doc.text(`${percentage}%`, 145, yPos + 18);
        
        yPos += 40;
        
        // Statistics
        doc.setFontSize(12);
        doc.setTextColor(...primaryColor);
        doc.text('📋 Statistics', 20, yPos);
        yPos += 10;
        
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(10);
        doc.text(`• Total Days: ${totalDays}`, 20, yPos);
        yPos += 7;
        doc.text(`• Meals Attended: ${totalAttended}/${totalPossibleMeals}`, 20, yPos);
        yPos += 7;
        doc.text(`• Notes: ${notesCount}`, 20, yPos);
        yPos += 7;
        doc.text(`• Generated: ${new Date().toLocaleString()}`, 20, yPos);
        yPos += 15;
        
        // Daily records table
        doc.setFontSize(14);
        doc.setTextColor(...primaryColor);
        doc.text('📅 Daily Records', 20, yPos);
        yPos += 10;
        
        // Table header
        doc.setFillColor(248, 250, 252);
        doc.rect(20, yPos, 170, 10, 'F');
        doc.setFontSize(10);
        doc.setTextColor(0, 0, 0);
        doc.text('Date', 25, yPos + 7);
        doc.text('Day', 65, yPos + 7);
        doc.text('Lunch', 90, yPos + 7);
        doc.text('Dinner', 120, yPos + 7);
        doc.text('Notes', 150, yPos + 7);
        yPos += 12;
        
        // Table content
        const sortedDates = Object.keys(this.data.attendance)
            .filter(date => date.startsWith(monthKey))
            .sort();
        
        sortedDates.forEach((date, index) => {
            const meals = this.data.attendance[date];
            const dateObj = new Date(date);
            const dateStr = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            const dayStr = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
            const notes = this.data.notes[date] || {};
            
            // Alternate row colors
            if (index % 2 === 0) {
                doc.setFillColor(249, 250, 251);
                doc.rect(20, yPos - 2, 170, 10, 'F');
            }
            
            doc.setTextColor(0, 0, 0);
            doc.text(dateStr, 25, yPos + 5);
            doc.text(dayStr, 65, yPos + 5);
            
            // Status with colors
            if (meals.lunch) {
                doc.setTextColor(...successColor);
            } else {
                doc.setTextColor(...dangerColor);
            }
            doc.text(meals.lunch ? '✓' : '✗', 95, yPos + 5);
            
            if (meals.dinner) {
                doc.setTextColor(...successColor);
            } else {
                doc.setTextColor(...dangerColor);
            }
            doc.text(meals.dinner ? '✓' : '✗', 125, yPos + 5);
            
            // Notes indicator
            doc.setTextColor(0, 0, 0);
            if (notes.note || notes.skipReason) {
                doc.setTextColor(59, 130, 246);
                doc.text('📝', 155, yPos + 5);
            }
            
            yPos += 10;
            
            // New page if needed
            if (yPos > 270) {
                doc.addPage();
                doc.setFillColor(...primaryColor);
                doc.rect(0, 0, 210, 25, 'F');
                doc.setTextColor(255, 255, 255);
                doc.setFontSize(16);
                doc.text('MessTrack Report (Cont.)', 20, 17);
                doc.setTextColor(0, 0, 0);
                yPos = 35;
            }
        });
        
        // Footer
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(100, 100, 100);
            doc.text(`MessTrack • Page ${i}/${pageCount} • Generated ${new Date().toLocaleDateString()}`, 20, 285);
        }
        
        doc.save(`MessTrack_Report_${monthKey}.pdf`);
        this.showToast('Enhanced PDF exported! 📄');
    }

    // ====================
    // Data Import/Export
    // ====================
    exportAllData() {
        const exportData = {
            version: '1.0.0',
            exportDate: new Date().toISOString(),
            data: this.data
        };

        const json = JSON.stringify(exportData, null, 2);
        const blob = new Blob([json], {
            type: 'application/json'
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'messtrack-backup.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        this.showToast('Data exported successfully!');
    }

    importData(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importedData = JSON.parse(e.target.result);

                if (importedData.data) {
                    // Confirm before importing
                    if (confirm('This will replace all existing data. Are you sure?')) {
                        this.data = importedData.data;
                        this.saveData();
                        this.initializeUI();
                        this.showToast('Data imported successfully!');
                    }
                }
            } catch (error) {
                this.showToast('Error importing data. Please check the file.');
            }
        };
        reader.readAsText(file);
    }

    resetAllData() {
        if (confirm('Are you sure you want to reset all data? This cannot be undone!')) {
            if (confirm('This will delete all your attendance records and summaries. Continue?')) {
                // Clear all data
                this.data = {
                    attendance: {},
                    summaries: {},
                    settings: {
                        theme: 'dark',
                        notifications: false
                    }
                };

                // Clear localStorage
                localStorage.removeItem('messtrack_attendance');
                localStorage.removeItem('messtrack_summaries');
                localStorage.removeItem('messtrack_settings');
                localStorage.removeItem('messtrack_last_reset');

                // Reinitialize UI
                this.initializeUI();
                this.showToast('All data has been reset');
            }
        }
    }

    // ====================
    // Theme Management
    // ====================
    toggleTheme() {
        const newTheme = this.data.settings.theme === 'dark' ? 'light' : 'dark';
        this.applyTheme(newTheme);
        this.data.settings.theme = newTheme;
        this.saveData();

        // Update theme select if on settings page
        const themeSelect = document.getElementById('themeSelect');
        if (themeSelect) {
            themeSelect.value = newTheme;
        }
    }

    applyTheme(theme) {
        const body = document.body;
        const themeIcon = document.getElementById('themeIcon');

        if (theme === 'light') {
            body.classList.remove('dark-theme');
            body.classList.add('light-theme');
            if (themeIcon) {
                themeIcon.classList.remove('fa-moon');
                themeIcon.classList.add('fa-sun');
            }
        } else {
            body.classList.remove('light-theme');
            body.classList.add('dark-theme');
            if (themeIcon) {
                themeIcon.classList.remove('fa-sun');
                themeIcon.classList.add('fa-moon');
            }
        }
    }

    // ====================
    // Notifications
    // ====================
    requestNotificationPermission() {
        if ('Notification' in window) {
            Notification.requestPermission().then(permission => {
                if (permission === 'granted') {
                    this.showToast('Notifications enabled!');
                    this.scheduleReminder();
                } else {
                    this.showToast('Notifications permission denied');
                    this.data.settings.notifications = false;
                    this.saveData();
                    document.getElementById('notificationToggle').checked = false;
                }
            });
        }
    }

    scheduleReminder() {
        if (!this.data.settings.notifications) return;

        const now = new Date();
        const today = this.getTodayString();
        const todayData = this.data.attendance[today] || {
            lunch: false,
            dinner: false
        };

        // Parse lunch time from settings
        const lunchTimeParts = this.data.settings.lunchTime.split(':');
        const lunchTime = new Date();
        lunchTime.setHours(parseInt(lunchTimeParts[0]), parseInt(lunchTimeParts[1]) - 30, 0, 0); // 30 min before

        // Parse dinner time from settings
        const dinnerTimeParts = this.data.settings.dinnerTime.split(':');
        const dinnerTime = new Date();
        dinnerTime.setHours(parseInt(dinnerTimeParts[0]), parseInt(dinnerTimeParts[1]) - 30, 0, 0); // 30 min before

        // Schedule lunch reminder
        if (!todayData.lunch && now < lunchTime) {
            const lunchDelay = lunchTime - now;
            if (lunchDelay > 0 && lunchDelay < 24 * 60 * 60 * 1000) { // Only if within 24 hours
                setTimeout(() => {
                    const currentData = this.data.attendance[this.getTodayString()] || { lunch: false, dinner: false };
                    if (!currentData.lunch) {
                        this.showNotification('Lunch Reminder', '🍽️ Lunch time in 30 minutes! Don\'t forget to mark your attendance.');
                    }
                }, lunchDelay);
            }
        }

        // Schedule dinner reminder
        if (!todayData.dinner && now < dinnerTime) {
            const dinnerDelay = dinnerTime - now;
            if (dinnerDelay > 0 && dinnerDelay < 24 * 60 * 60 * 1000) { // Only if within 24 hours
                setTimeout(() => {
                    const currentData = this.data.attendance[this.getTodayString()] || { lunch: false, dinner: false };
                    if (!currentData.dinner) {
                        this.showNotification('Dinner Reminder', '🌙 Dinner time in 30 minutes! Don\'t forget to mark your attendance.');
                    }
                }, dinnerDelay);
            }
        }
    }

    showNotification(title, body) {
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(title, {
                body: body,
                icon: 'icon-192.png',
                badge: 'icon-192.png'
            });
        }
    }

    // ====================
    // Utility Functions
    // ====================
    getTodayString() {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    showToast(message) {
        const toast = document.getElementById('toast');
        const toastMessage = document.getElementById('toastMessage');

        if (toast && toastMessage) {
            toastMessage.textContent = message;
            toast.classList.add('show');

            setTimeout(() => {
                toast.classList.remove('show');
            }, 3000);
        }
    }

    // ====================
    // New Enhanced Features
    // ====================
    
    // FAB Setup
    setupFAB() {
        const fabMain = document.getElementById('fabMain');
        const fabMenu = document.getElementById('fabMenu');
        const fabLunch = document.getElementById('fabLunch');
        const fabDinner = document.getElementById('fabDinner');
        const fabNote = document.getElementById('fabNote');
        const fabSkip = document.getElementById('fabSkip');
        
        let fabOpen = false;
        
        if (fabMain) {
            fabMain.addEventListener('click', () => {
                fabOpen = !fabOpen;
                if (fabOpen) {
                    fabMenu.classList.remove('opacity-0', 'pointer-events-none');
                    fabMenu.classList.add('opacity-100');
                    fabMain.querySelector('i').classList.replace('fa-plus', 'fa-times');
                } else {
                    fabMenu.classList.add('opacity-0', 'pointer-events-none');
                    fabMenu.classList.remove('opacity-100');
                    fabMain.querySelector('i').classList.replace('fa-times', 'fa-plus');
                }
            });
        }
        
        if (fabLunch) {
            fabLunch.addEventListener('click', () => {
                this.markAttendance('lunch');
                this.closeFAB();
            });
        }
        
        if (fabDinner) {
            fabDinner.addEventListener('click', () => {
                this.markAttendance('dinner');
                this.closeFAB();
            });
        }
        
        if (fabNote) {
            fabNote.addEventListener('click', () => {
                this.addNote();
                this.closeFAB();
            });
        }
        
        if (fabSkip) {
            fabSkip.addEventListener('click', () => {
                this.showSkipReasonModal();
                this.closeFAB();
            });
        }
    }
    
    closeFAB() {
        const fabMenu = document.getElementById('fabMenu');
        const fabMain = document.getElementById('fabMain');
        
        fabMenu.classList.add('opacity-0', 'pointer-events-none');
        fabMenu.classList.remove('opacity-100');
        fabMain.querySelector('i').classList.replace('fa-times', 'fa-plus');
    }
    
    // Weekly View
    updateWeeklyView() {
        const weeklyGrid = document.getElementById('weeklyGrid');
        if (!weeklyGrid) return;
        
        let displayDays = [];
        
        if (this.customDateRange) {
            // Use custom date range
            const start = new Date(this.customDateRange.start);
            const end = new Date(this.customDateRange.end);
            
            for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                displayDays.push(new Date(d));
            }
        } else {
            // Default: last 7 days
            const today = new Date();
            for (let i = 6; i >= 0; i--) {
                const date = new Date(today);
                date.setDate(date.getDate() - i);
                displayDays.push(date);
            }
        }
        
        this.weeklyDays = displayDays; // Store for export
        
        let html = '';
        displayDays.forEach(date => {
            const dateStr = this.formatDateToString(date);
            const dayData = this.data.attendance[dateStr] || { lunch: false, dinner: false };
            const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
            const dayNumber = date.getDate();
            const isToday = dateStr === this.getTodayString();
            
            html += `
                <div class="glass p-4 flex items-center justify-between ${isToday ? 'ring-2 ring-blue-400' : ''} ${this.bulkEditMode ? 'cursor-pointer day-selectable' : ''}" 
                     data-date="${dateStr}">
                    <div class="flex items-center gap-4">
                        ${this.bulkEditMode ? '<input type="checkbox" class="day-checkbox">' : ''}
                        <div>
                            <div class="font-bold">${dayName}</div>
                            <div class="text-sm opacity-60">${dayNumber}</div>
                        </div>
                    </div>
                    <div class="flex gap-4">
                        <div class="text-center">
                            <i class="fas fa-sun text-2xl ${dayData.lunch ? 'text-yellow-400' : 'opacity-30'}"></i>
                            <div class="text-xs mt-1">${dayData.lunch ? 'Yes' : 'No'}</div>
                        </div>
                        <div class="text-center">
                            <i class="fas fa-moon text-2xl ${dayData.dinner ? 'text-blue-400' : 'opacity-30'}"></i>
                            <div class="text-xs mt-1">${dayData.dinner ? 'Yes' : 'No'}</div>
                        </div>
                    </div>
                </div>
            `;
        });
        
        weeklyGrid.innerHTML = html;
        
        // Add event listeners for day selection in bulk edit mode
        if (this.bulkEditMode) {
            document.querySelectorAll('.day-selectable').forEach(dayElement => {
                dayElement.addEventListener('click', (e) => {
                    this.toggleDaySelect(dayElement);
                });
            });
        }
    }
    
    // Bulk Edit Functions
    toggleBulkEditMode() {
        this.bulkEditMode = !this.bulkEditMode;
        this.selectedDays.clear();
        
        const bulkEditPanel = document.getElementById('bulkEditPanel');
        const bulkEditToggle = document.getElementById('bulkEditToggle');
        
        if (this.bulkEditMode) {
            bulkEditPanel.classList.remove('hidden');
            bulkEditToggle.innerHTML = '<i class="fas fa-times mr-2"></i>Cancel';
            this.showToast('Bulk edit mode enabled. Select days to edit.');
        } else {
            bulkEditPanel.classList.add('hidden');
            bulkEditToggle.innerHTML = '<i class="fas fa-edit mr-2"></i>Bulk Edit';
            this.showToast('Bulk edit mode disabled.');
        }
        
        this.updateWeeklyView();
    }
    
    toggleDaySelect(element) {
        const dateStr = element.dataset.date;
        const checkbox = element.querySelector('.day-checkbox');
        
        if (checkbox) {
            checkbox.checked = !checkbox.checked;
            
            if (checkbox.checked) {
                this.selectedDays.add(dateStr);
                element.style.background = 'rgba(59, 130, 246, 0.2)';
            } else {
                this.selectedDays.delete(dateStr);
                element.style.background = '';
            }
        }
    }
    
    bulkSelectAll() {
        document.querySelectorAll('.day-checkbox').forEach((checkbox, index) => {
            checkbox.checked = true;
            const dateElement = checkbox.closest('[data-date]');
            if (dateElement) {
                const dateStr = dateElement.dataset.date;
                this.selectedDays.add(dateStr);
                dateElement.style.background = 'rgba(59, 130, 246, 0.2)';
            }
        });
        this.showToast(`Selected all ${this.selectedDays.size} days`);
    }
    
    bulkSelectNone() {
        document.querySelectorAll('.day-checkbox').forEach(checkbox => {
            checkbox.checked = false;
            const dateElement = checkbox.closest('[data-date]');
            if (dateElement) {
                dateElement.style.background = '';
            }
        });
        this.selectedDays.clear();
        this.showToast('Cleared all selections');
    }
    
    bulkMarkMeal(type) {
        if (this.selectedDays.size === 0) {
            this.showToast('Please select at least one day');
            return;
        }
        
        let count = 0;
        this.selectedDays.forEach(dateStr => {
            if (!this.data.attendance[dateStr]) {
                this.data.attendance[dateStr] = { lunch: false, dinner: false };
            }
            
            if (type === 'lunch') {
                this.data.attendance[dateStr].lunch = true;
            } else if (type === 'dinner') {
                this.data.attendance[dateStr].dinner = true;
            } else if (type === 'both') {
                this.data.attendance[dateStr].lunch = true;
                this.data.attendance[dateStr].dinner = true;
            }
            count++;
        });
        
        this.saveData();
        this.updateWeeklyView();
        
        const mealText = type === 'both' ? 'lunch and dinner' : type;
        this.showToast(`Marked ${mealText} for ${count} day(s) ✓`);
    }
    
    bulkClearMeals() {
        if (this.selectedDays.size === 0) {
            this.showToast('Please select at least one day');
            return;
        }
        
        if (confirm(`Clear all meals for ${this.selectedDays.size} selected day(s)?`)) {
            let count = 0;
            this.selectedDays.forEach(dateStr => {
                if (this.data.attendance[dateStr]) {
                    this.data.attendance[dateStr].lunch = false;
                    this.data.attendance[dateStr].dinner = false;
                    count++;
                }
            });
            
            this.saveData();
            this.updateWeeklyView();
            this.showToast(`Cleared meals for ${count} day(s)`);
        }
    }
    
    // Date Range Picker Functions
    toggleDateRangePanel() {
        const panel = document.getElementById('dateRangePanel');
        if (panel.classList.contains('hidden')) {
            panel.classList.remove('hidden');
            this.initializeDateInputs();
        } else {
            panel.classList.add('hidden');
        }
    }
    
    initializeDateInputs() {
        const today = new Date();
        const sevenDaysAgo = new Date(today);
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        
        const startDateInput = document.getElementById('startDate');
        const endDateInput = document.getElementById('endDate');
        
        if (startDateInput) {
            startDateInput.value = this.formatDateToString(sevenDaysAgo);
        }
        if (endDateInput) {
            endDateInput.value = this.formatDateToString(today);
        }
    }
    
    applyCustomDateRange() {
        const startDate = document.getElementById('startDate').value;
        const endDate = document.getElementById('endDate').value;
        
        if (!startDate || !endDate) {
            this.showToast('Please select both start and end dates');
            return;
        }
        
        const start = new Date(startDate);
        const end = new Date(endDate);
        
        if (start > end) {
            this.showToast('Start date must be before end date');
            return;
        }
        
        const daysDiff = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
        
        if (daysDiff > 90) {
            this.showToast('Please select a range of 90 days or less');
            return;
        }
        
        this.customDateRange = { start: startDate, end: endDate };
        this.updateWeeklyView();
        this.toggleDateRangePanel();
        this.showToast(`Showing ${daysDiff} days from ${start.toLocaleDateString()} to ${end.toLocaleDateString()}`);
    }
    
    resetToWeeklyView() {
        this.customDateRange = null;
        this.updateWeeklyView();
        this.toggleDateRangePanel();
        this.showToast('Reset to last 7 days view');
    }
    
    // Export Selected Functions
    exportSelectedToCSV() {
        if (this.selectedDays.size === 0) {
            this.showToast('Please select at least one day to export');
            return;
        }
        
        let csv = 'Date,Day,Lunch,Dinner,Notes\n';
        const sortedDates = Array.from(this.selectedDays).sort();
        
        sortedDates.forEach(date => {
            const meals = this.data.attendance[date] || { lunch: false, dinner: false };
            const dateObj = new Date(date);
            const formattedDate = dateObj.toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'short', 
                day: 'numeric' 
            });
            const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
            const notes = this.data.notes[date] || {};
            const noteText = notes.note || notes.skipReason || '';
            
            const escapedNotes = noteText.replace(/"/g, '""');
            csv += `"${formattedDate}","${dayName}","${meals.lunch ? 'Yes' : 'No'}","${meals.dinner ? 'Yes' : 'No'}","${escapedNotes}"\n`;
        });
        
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `MessTrack_Selected_${this.selectedDays.size}_Days.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.showToast(`Exported ${this.selectedDays.size} selected days to CSV! 📊`);
    }
    
    exportSelectedToPDF() {
        if (this.selectedDays.size === 0) {
            this.showToast('Please select at least one day to export');
            return;
        }
        
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        const primaryColor = [102, 126, 234];
        const successColor = [34, 197, 94];
        const dangerColor = [239, 68, 68];
        
        // Header
        doc.setFillColor(...primaryColor);
        doc.rect(0, 0, 210, 40, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(24);
        doc.text('🍽️ MessTrack - Selected Days', 20, 25);
        doc.setFontSize(14);
        doc.text(`${this.selectedDays.size} Days Selected`, 20, 35);
        doc.setTextColor(0, 0, 0);
        
        let yPos = 55;
        
        // Calculate summary
        let lunchCount = 0, dinnerCount = 0;
        Array.from(this.selectedDays).forEach(date => {
            const meals = this.data.attendance[date] || { lunch: false, dinner: false };
            if (meals.lunch) lunchCount++;
            if (meals.dinner) dinnerCount++;
        });
        
        const totalPossible = this.selectedDays.size * 2;
        const totalAttended = lunchCount + dinnerCount;
        const percentage = totalPossible > 0 ? ((totalAttended / totalPossible) * 100).toFixed(1) : '0.0';
        
        // Summary
        doc.setFontSize(16);
        doc.setTextColor(...primaryColor);
        doc.text('📊 Summary', 20, yPos);
        yPos += 15;
        
        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        doc.text(`Lunch: ${lunchCount} days`, 20, yPos);
        yPos += 7;
        doc.text(`Dinner: ${dinnerCount} days`, 20, yPos);
        yPos += 7;
        doc.text(`Overall: ${percentage}%`, 20, yPos);
        yPos += 15;
        
        // Table
        doc.setFontSize(14);
        doc.setTextColor(...primaryColor);
        doc.text('📅 Daily Records', 20, yPos);
        yPos += 10;
        
        // Table header
        doc.setFillColor(248, 250, 252);
        doc.rect(20, yPos, 170, 10, 'F');
        doc.setFontSize(10);
        doc.setTextColor(0, 0, 0);
        doc.text('Date', 25, yPos + 7);
        doc.text('Day', 65, yPos + 7);
        doc.text('Lunch', 90, yPos + 7);
        doc.text('Dinner', 120, yPos + 7);
        doc.text('Notes', 150, yPos + 7);
        yPos += 12;
        
        const sortedDates = Array.from(this.selectedDays).sort();
        sortedDates.forEach((date, index) => {
            const meals = this.data.attendance[date] || { lunch: false, dinner: false };
            const dateObj = new Date(date);
            const dateStr = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            const dayStr = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
            const notes = this.data.notes[date] || {};
            
            if (index % 2 === 0) {
                doc.setFillColor(249, 250, 251);
                doc.rect(20, yPos - 2, 170, 10, 'F');
            }
            
            doc.setTextColor(0, 0, 0);
            doc.text(dateStr, 25, yPos + 5);
            doc.text(dayStr, 65, yPos + 5);
            
            if (meals.lunch) {
                doc.setTextColor(successColor[0], successColor[1], successColor[2]);
            } else {
                doc.setTextColor(dangerColor[0], dangerColor[1], dangerColor[2]);
            }
            doc.text(meals.lunch ? '✓' : '✗', 95, yPos + 5);
            
            if (meals.dinner) {
                doc.setTextColor(successColor[0], successColor[1], successColor[2]);
            } else {
                doc.setTextColor(dangerColor[0], dangerColor[1], dangerColor[2]);
            }
            doc.text(meals.dinner ? '✓' : '✗', 125, yPos + 5);
            
            doc.setTextColor(0, 0, 0);
            if (notes.note || notes.skipReason) {
                doc.setTextColor(59, 130, 246);
                doc.text('📝', 155, yPos + 5);
            }
            
            yPos += 10;
            
            if (yPos > 270) {
                doc.addPage();
                yPos = 35;
            }
        });
        
        doc.save(`MessTrack_Selected_${this.selectedDays.size}_Days.pdf`);
        this.showToast(`Exported ${this.selectedDays.size} selected days to PDF! 📄`);
    }
    
    formatDateToString(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
    
    // QR Code Generation
    generateQRCode() {
        const summary = this.getCurrentMonthSummary();
        const reportData = {
            month: new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
            studentName: 'Hostel Student',
            ...summary,
            timestamp: new Date().toISOString()
        };
        
        // Create a shareable URL instead of JSON for better QR compatibility
        const reportText = `MessTrack Report - ${reportData.month}\n` +
                          `Lunch: ${reportData.lunchCount} days\n` +
                          `Dinner: ${reportData.dinnerCount} days\n` +
                          `Overall: ${reportData.percentage}%\n` +
                          `Generated: ${new Date().toLocaleDateString()}`;
        
        const canvas = document.getElementById('qrCodeCanvas');
        const container = document.getElementById('qrCodeContainer');
        
        // Check if QRCode library is available
        if (typeof QRCode === 'undefined') {
            // Fallback: Load QRCode library dynamically
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/qrcode/1.5.3/qrcode.min.js';
            script.onload = () => {
                this.generateQRCodeWithLibrary(canvas, container, reportText);
            };
            script.onerror = () => {
                this.showFallbackQR(container, reportText);
            };
            document.head.appendChild(script);
        } else {
            this.generateQRCodeWithLibrary(canvas, container, reportText);
        }
    }
    
    generateQRCodeWithLibrary(canvas, container, text) {
        if (canvas) {
            try {
                // Clear canvas first
                canvas.width = 250;
                canvas.height = 250;
                
                // Use the qrcode library's toCanvas method
                if (typeof QRCode !== 'undefined' && QRCode.toCanvas) {
                    QRCode.toCanvas(canvas, text, {
                        width: 250,
                        margin: 2,
                        color: {
                            dark: '#000000',
                            light: '#FFFFFF'
                        }
                    }, (error) => {
                        if (error) {
                            console.error('QR Code error:', error);
                            this.showFallbackQR(container, text);
                        } else {
                            container.classList.remove('hidden');
                            this.showToast('QR code generated successfully! 📱');
                        }
                    });
                } else if (typeof QRCode !== 'undefined') {
                    // Alternative: use QRCode constructor
                    canvas.innerHTML = '';
                    new QRCode(canvas, {
                        text: text,
                        width: 250,
                        height: 250,
                        colorDark: '#000000',
                        colorLight: '#ffffff',
                        correctLevel: QRCode.CorrectLevel.H
                    });
                    container.classList.remove('hidden');
                    this.showToast('QR code generated successfully! 📱');
                } else {
                    throw new Error('QRCode library not loaded');
                }
            } catch (error) {
                console.error('QR generation error:', error);
                this.showFallbackQR(container, text);
            }
        } else {
            this.showFallbackQR(container, text);
        }
    }
    
    showFallbackQR(container, text) {
        // Show a text version if QR generation fails
        container.innerHTML = `
            <div class="text-center p-4 glass rounded-lg">
                <h4 class="font-bold mb-4">📱 Share Report</h4>
                <div class="text-sm bg-gray-100 p-3 rounded mb-4 text-gray-800">
                    ${text.replace(/\n/g, '<br>')}
                </div>
                <button onclick="navigator.clipboard.writeText('${text.replace(/'/g, "\\'")}').then(() => messTrack.showToast('Report copied!'))" 
                        class="btn-glass">
                    📋 Copy Report
                </button>
            </div>
        `;
        container.classList.remove('hidden');
        this.showToast('QR generation failed, showing text version 📋');
    }
    
    getCurrentMonthSummary() {
        const currentMonth = new Date();
        const monthKey = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}`;
        
        let lunchCount = 0;
        let dinnerCount = 0;
        let totalDays = 0;
        
        Object.entries(this.data.attendance).forEach(([date, meals]) => {
            if (date.startsWith(monthKey)) {
                totalDays++;
                if (meals.lunch) lunchCount++;
                if (meals.dinner) dinnerCount++;
            }
        });
        
        const totalPossibleMeals = Math.max(totalDays * 2, 1);
        const totalAttended = lunchCount + dinnerCount;
        const percentage = ((totalAttended / totalPossibleMeals) * 100).toFixed(1);
        
        return { lunchCount, dinnerCount, totalDays, percentage };
    }
    
    // Share Report
    shareReport() {
        const summary = this.getCurrentMonthSummary();
        const month = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        
        const shareText = `📊 MessTrack Report - ${month}\n\n🥐 Lunch: ${summary.lunchCount} days\n🍽️ Dinner: ${summary.dinnerCount} days\n📈 Overall Attendance: ${summary.percentage}%\n\n#MessTrack #AttendanceTracker`;
        
        if (navigator.share) {
            navigator.share({
                title: 'MessTrack Report',
                text: shareText
            }).catch(err => console.log('Error sharing:', err));
        } else {
            // Fallback - copy to clipboard
            navigator.clipboard.writeText(shareText).then(() => {
                this.showToast('Report copied to clipboard!');
            }).catch(() => {
                this.showToast('Share feature not available');
            });
        }
    }
    
    // Skip Reason Modal
    setupSkipReasonModal() {
        const modal = document.getElementById('skipReasonModal');
        const saveBtn = document.getElementById('saveSkipReason');
        const cancelBtn = document.getElementById('cancelSkipReason');
        const reasonBtns = document.querySelectorAll('.skip-reason');
        
        reasonBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                document.getElementById('customReason').value = btn.dataset.reason;
            });
        });
        
        if (saveBtn) {
            saveBtn.addEventListener('click', () => this.saveSkipReason());
        }
        
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => this.hideSkipReasonModal());
        }
    }
    
    showSkipReasonModal() {
        document.getElementById('skipReasonModal').classList.remove('hidden');
    }
    
    hideSkipReasonModal() {
        document.getElementById('skipReasonModal').classList.add('hidden');
        document.getElementById('customReason').value = '';
        this.currentSkipMeal = null;
    }
    
    saveSkipReason() {
        const reason = document.getElementById('customReason').value || 'No reason provided';
        const today = this.getTodayString();
        
        if (!this.data.notes[today]) {
            this.data.notes[today] = {};
        }
        
        this.data.notes[today].skipReason = reason;
        this.saveData();
        this.hideSkipReasonModal();
        this.showToast('Skip reason saved');
    }
    
    addNote() {
        const note = prompt('Add a note for today:');
        if (note) {
            const today = this.getTodayString();
            if (!this.data.notes[today]) {
                this.data.notes[today] = {};
            }
            this.data.notes[today].note = note;
            this.saveData();
            this.showToast('Note added successfully!');
        }
    }

    // ====================
    // Service Worker
    // ====================
    registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('sw.js')
                .then(registration => {
                    console.log('Service Worker registered');
                    // Check for updates
                    registration.addEventListener('updatefound', () => {
                        const newWorker = registration.installing;
                        newWorker.addEventListener('statechange', () => {
                            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                this.showUpdatePrompt();
                            }
                        });
                    });
                })
                .catch(error => {
                    console.log('Service Worker registration failed:', error);
                });
        }
    }
    
    // ====================
    // Advanced Mobile Features
    // ====================
    initAdvancedFeatures() {
        this.initSplashScreen();
        this.initPullToRefresh();
        this.initSwipeNavigation();
        this.initHapticFeedback();
        this.initGestureHints();
        this.initTabBadges();
        this.initLongPressMenus();
        this.initOfflineDetection();
        this.handlePWAShortcuts();
        this.checkForUpdates();
    }
    
    // 1. Splash Screen
    initSplashScreen() {
        const splash = document.getElementById('splashScreen');
        setTimeout(() => {
            splash.classList.add('hidden');
            setTimeout(() => splash.remove(), 500);
        }, 2000);
    }
    
    // 2. Pull to Refresh
    initPullToRefresh() {
        const mainContent = document.getElementById('mainContent');
        const pullIndicator = document.querySelector('.pull-to-refresh');
        let startY = 0;
        let currentY = 0;
        let pulling = false;
        
        mainContent.addEventListener('touchstart', (e) => {
            if (mainContent.scrollTop === 0) {
                startY = e.touches[0].clientY;
                pulling = true;
            }
        });
        
        mainContent.addEventListener('touchmove', (e) => {
            if (!pulling) return;
            
            currentY = e.touches[0].clientY;
            const diff = currentY - startY;
            
            if (diff > 0 && diff < 150) {
                pullIndicator.style.transform = `translateY(${diff}px)`;
                pullIndicator.style.opacity = diff / 150;
            }
        });
        
        mainContent.addEventListener('touchend', () => {
            if (!pulling) return;
            
            const diff = currentY - startY;
            if (diff > 100) {
                pullIndicator.classList.add('pulling');
                this.hapticFeedback('medium');
                this.refreshData();
                setTimeout(() => {
                    pullIndicator.classList.remove('pulling');
                    pullIndicator.style.transform = '';
                    pullIndicator.style.opacity = '';
                }, 1000);
            } else {
                pullIndicator.style.transform = '';
                pullIndicator.style.opacity = '';
            }
            pulling = false;
        });
    }
    
    refreshData() {
        this.updateDashboard();
        this.updateWeeklyView();
        this.updateMonthCalendar();
        this.showToast('🔄 Data refreshed!');
    }
    
    // 3. Swipe Navigation
    initSwipeNavigation() {
        const pages = ['dashboard', 'weekly', 'history', 'summary', 'settings'];
        let startX = 0;
        let currentX = 0;
        let swiping = false;
        
        document.addEventListener('touchstart', (e) => {
            if (e.target.closest('.nav-item') || e.target.closest('button') || e.target.closest('input')) {
                return;
            }
            startX = e.touches[0].clientX;
            swiping = true;
        });
        
        document.addEventListener('touchmove', (e) => {
            if (!swiping) return;
            currentX = e.touches[0].clientX;
        });
        
        document.addEventListener('touchend', () => {
            if (!swiping) return;
            
            const diff = currentX - startX;
            const threshold = 100;
            
            if (Math.abs(diff) > threshold) {
                const currentIndex = pages.indexOf(this.currentPage);
                let newIndex;
                
                if (diff > 0 && currentIndex > 0) {
                    // Swipe right - previous page
                    newIndex = currentIndex - 1;
                    this.hapticFeedback('light');
                } else if (diff < 0 && currentIndex < pages.length - 1) {
                    // Swipe left - next page
                    newIndex = currentIndex + 1;
                    this.hapticFeedback('light');
                }
                
                if (newIndex !== undefined) {
                    this.showPage(pages[newIndex]);
                }
            }
            
            swiping = false;
        });
    }
    
    // 4. Haptic Feedback
    initHapticFeedback() {
        // Add haptic to all navigation items
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', () => this.hapticFeedback('light'));
        });
        
        // Add haptic to buttons
        document.querySelectorAll('.btn-glass').forEach(btn => {
            btn.addEventListener('click', () => this.hapticFeedback('medium'));
        });
    }
    
    hapticFeedback(intensity = 'medium') {
        if ('vibrate' in navigator) {
            const patterns = {
                light: 10,
                medium: 20,
                heavy: 30
            };
            navigator.vibrate(patterns[intensity] || 20);
        }
    }
    
    // 5. Gesture Hints
    initGestureHints() {
        const hints = [
            { key: 'swipe', text: '👈 Swipe to navigate pages 👉', delay: 3000 },
            { key: 'pull', text: '⬇️ Pull down to refresh', delay: 8000 },
            { key: 'longPress', text: '⏱️ Long press nav icons for quick actions', delay: 13000 }
        ];
        
        hints.forEach(hint => {
            if (!this.gestureHintsShown[hint.key]) {
                setTimeout(() => this.showGestureHint(hint.text, hint.key), hint.delay);
            }
        });
    }
    
    showGestureHint(text, key) {
        const container = document.getElementById('gestureHints');
        const hint = document.createElement('div');
        hint.className = 'gesture-hint';
        hint.textContent = text;
        container.appendChild(hint);
        
        setTimeout(() => {
            hint.remove();
            this.gestureHintsShown[key] = true;
            localStorage.setItem('gestureHintsShown', JSON.stringify(this.gestureHintsShown));
        }, 4000);
    }
    
    // 6. Tab Bar Badges
    initTabBadges() {
        this.updateTabBadges();
        // Update badges when data changes
        setInterval(() => this.updateTabBadges(), 30000);
    }
    
    updateTabBadges() {
        const today = this.getTodayString();
        const todayData = this.data.attendance[today] || { lunch: false, dinner: false };
        
        // Dashboard badge - show if meals not marked
        const dashboardNav = document.querySelector('[data-page="dashboard"]');
        let pendingCount = 0;
        if (!todayData.lunch) pendingCount++;
        if (!todayData.dinner) pendingCount++;
        
        this.updateBadge(dashboardNav, pendingCount);
        
        // Weekly badge - show number of days in selection
        const weeklyNav = document.querySelector('[data-page="weekly"]');
        if (this.bulkEditMode && this.selectedDays.size > 0) {
            this.updateBadge(weeklyNav, this.selectedDays.size);
        } else {
            this.updateBadge(weeklyNav, 0);
        }
    }
    
    updateBadge(element, count) {
        if (!element) return;
        
        let badge = element.querySelector('.nav-badge');
        if (count > 0) {
            if (!badge) {
                badge = document.createElement('span');
                badge.className = 'nav-badge';
                element.style.position = 'relative';
                element.appendChild(badge);
            }
            badge.textContent = count;
        } else if (badge) {
            badge.remove();
        }
    }
    
    // 7. Long Press Menus
    initLongPressMenus() {
        document.querySelectorAll('.nav-item').forEach(item => {
            let pressTimer;
            
            item.addEventListener('touchstart', (e) => {
                pressTimer = setTimeout(() => {
                    this.hapticFeedback('heavy');
                    this.showLongPressMenu(item, e.touches[0].clientX, e.touches[0].clientY);
                }, 500);
            });
            
            item.addEventListener('touchend', () => {
                clearTimeout(pressTimer);
            });
            
            item.addEventListener('touchmove', () => {
                clearTimeout(pressTimer);
            });
        });
    }
    
    showLongPressMenu(navItem, x, y) {
        const page = navItem.dataset.page;
        const menu = document.getElementById('longPressMenu');
        
        const actions = {
            dashboard: [
                { icon: 'fa-sun', text: 'Quick Lunch', action: () => this.markMeal('lunch') },
                { icon: 'fa-moon', text: 'Quick Dinner', action: () => this.markMeal('dinner') },
                { icon: 'fa-check-double', text: 'Mark Both', action: () => this.markBothMeals() }
            ],
            weekly: [
                { icon: 'fa-edit', text: 'Bulk Edit', action: () => this.toggleBulkEditMode() },
                { icon: 'fa-calendar-alt', text: 'Date Range', action: () => this.toggleDateRangePanel() },
                { icon: 'fa-download', text: 'Export', action: () => this.exportToCSV() }
            ],
            history: [
                { icon: 'fa-chevron-left', text: 'Previous Month', action: () => this.changeMonth(-1) },
                { icon: 'fa-chevron-right', text: 'Next Month', action: () => this.changeMonth(1) },
                { icon: 'fa-calendar-day', text: 'This Month', action: () => this.goToCurrentMonth() }
            ],
            summary: [
                { icon: 'fa-qrcode', text: 'Generate QR', action: () => this.generateQRCode() },
                { icon: 'fa-file-pdf', text: 'Export PDF', action: () => this.exportToPDF() },
                { icon: 'fa-chart-line', text: 'View Stats', action: () => {} }
            ],
            settings: [
                { icon: 'fa-moon', text: 'Toggle Theme', action: () => this.toggleTheme() },
                { icon: 'fa-bell', text: 'Notifications', action: () => this.toggleNotifications() },
                { icon: 'fa-trash', text: 'Clear Data', action: () => this.confirmClearData() }
            ]
        };
        
        const menuActions = actions[page] || [];
        menu.innerHTML = menuActions.map(action => `
            <div class="long-press-item" onclick="messTrack.closeLongPressMenu(); (${action.action.toString()})()">
                <i class="fas ${action.icon}"></i>${action.text}
            </div>
        `).join('');
        
        menu.style.left = `${x - 100}px`;
        menu.style.top = `${y - 50}px`;
        menu.classList.add('show');
        
        // Close on outside click
        setTimeout(() => {
            document.addEventListener('click', () => this.closeLongPressMenu(), { once: true });
        }, 100);
    }
    
    closeLongPressMenu() {
        const menu = document.getElementById('longPressMenu');
        menu.classList.remove('show');
    }
    
    // 8. PWA Shortcuts Handler
    handlePWAShortcuts() {
        const params = new URLSearchParams(window.location.search);
        const action = params.get('action');
        const page = params.get('page');
        
        if (action === 'lunch') {
            setTimeout(() => {
                this.markMeal('lunch');
                this.showToast('Lunch marked via shortcut! 🍽️');
            }, 2500);
        } else if (action === 'dinner') {
            setTimeout(() => {
                this.markMeal('dinner');
                this.showToast('Dinner marked via shortcut! 🌙');
            }, 2500);
        }
        
        if (page && page !== 'dashboard') {
            setTimeout(() => this.showPage(page), 2500);
        }
    }
    
    // 9. Offline Detection
    initOfflineDetection() {
        const banner = document.getElementById('offlineBanner');
        
        window.addEventListener('online', () => {
            banner.classList.remove('show');
            this.showToast('✅ Back online!');
            this.hapticFeedback('light');
        });
        
        window.addEventListener('offline', () => {
            banner.classList.add('show');
            this.hapticFeedback('heavy');
        });
        
        // Check initial state
        if (!navigator.onLine) {
            banner.classList.add('show');
        }
    }
    
    // 10. Update Prompt
    showUpdatePrompt() {
        const prompt = document.getElementById('updatePrompt');
        prompt.classList.add('show');
        
        document.getElementById('updateNow').addEventListener('click', () => {
            this.hapticFeedback('medium');
            window.location.reload();
        });
        
        document.getElementById('dismissUpdate').addEventListener('click', () => {
            prompt.classList.remove('show');
        });
    }
    
    checkForUpdates() {
        const lastVersion = localStorage.getItem('appVersion');
        if (lastVersion && lastVersion !== this.appVersion) {
            setTimeout(() => this.showUpdatePrompt(), 5000);
        }
        localStorage.setItem('appVersion', this.appVersion);
    }
    
    toggleNotifications() {
        const toggle = document.getElementById('notificationToggle');
        if (toggle) {
            toggle.click();
        }
    }
    
    confirmClearData() {
        if (confirm('Are you sure you want to clear all data? This cannot be undone!')) {
            localStorage.clear();
            location.reload();
        }
    }

    // ====================
    // PWA Install Flow
    // ====================
    initInstallHandlers() {
        const installBtn = document.getElementById('installAppBtn');

        if (installBtn) {
            installBtn.addEventListener('click', async () => {
                if (!this.deferredPrompt) return;
                this.deferredPrompt.prompt();
                try {
                    const choice = await this.deferredPrompt.userChoice;
                    if (choice && choice.outcome === 'accepted') {
                        this.showToast('Installing MessTrack...');
                    }
                } catch (e) {
                    // ignore
                }
                this.deferredPrompt = null;
                this.updateInstallUI();
            });
        }

        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            this.deferredPrompt = e;
            this.updateInstallUI();
        });

        window.addEventListener('appinstalled', () => {
            this.deferredPrompt = null;
            this.updateInstallUI();
            this.showToast('MessTrack installed successfully!');
        });

        // Initialize UI state
        this.updateInstallUI();
    }

    updateInstallUI() {
        const installBtn = document.getElementById('installAppBtn');
        const iosHint = document.getElementById('installIosHint');
        if (!installBtn || !iosHint) return;

        installBtn.classList.add('hidden');
        iosHint.classList.add('hidden');

        if (this.isStandalone()) {
            return; // already installed
        }

        if (this.deferredPrompt) {
            installBtn.classList.remove('hidden');
            return;
        }

        if (this.isIos()) {
            iosHint.classList.remove('hidden');
        }
    }

    isStandalone() {
        return window.matchMedia('(display-mode: standalone)').matches
            || window.navigator.standalone === true
            || document.referrer.includes('android-app://');
    }

    isIos() {
        const ua = window.navigator.userAgent || '';
        const iOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
        const isSafari = /^((?!chrome|android).)*safari/i.test(ua);
        return iOS && isSafari;
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.messTrack = new MessTrack();
});