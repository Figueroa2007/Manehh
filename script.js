let transactions = [];
let categories = new Set();
let budgetGoals = {};
const alerts = [];

// Chart configurations
const ctx1 = document.getElementById('incomeVsExpenseChart').getContext('2d');
const incomeVsExpenseChart = new Chart(ctx1, {
    type: 'bar',
    data: {
        labels: ['Income', 'Expense'],
        datasets: [{
            data: [0, 0],
            backgroundColor: ['#28a745', '#dc3545']
        }]
    },
    options: {
        responsive: true,
        maintainAspectRatio: false
    }
});

const ctx2 = document.getElementById('categoryPieChart').getContext('2d');
const categoryPieChart = new Chart(ctx2, {
    type: 'pie',
    data: {
        labels: [],
        datasets: [{
            data: [],
            backgroundColor: []
        }]
    },
    options: {
        responsive: true,
        maintainAspectRatio: false
    }
});

const ctx3 = document.getElementById('expenseTrendChart').getContext('2d');
const expenseTrendChart = new Chart(ctx3, {
    type: 'line',
    data: {
        labels: [],
        datasets: [{
            label: 'Expenses',
            data: [],
            backgroundColor: 'rgba(255, 99, 132, 0.2)',
            borderColor: 'rgba(255, 99, 132, 1)',
            borderWidth: 1
        }]
    },
    options: {
        responsive: true,
        maintainAspectRatio: false
    }
});

// Utility functions
function formatAmount(amount) {
    return `$${amount.toFixed(2)}`;
}

function formatDate(date) {
    return date.toDateString();
}

// Load data from local storage
function loadData() {
    try {
        const savedTransactions = localStorage.getItem('transactions');
        const savedBudgetGoals = localStorage.getItem('budgetGoals');

        if (savedTransactions) {
            transactions = JSON.parse(savedTransactions);
        }

        if (savedBudgetGoals) {
            budgetGoals = JSON.parse(savedBudgetGoals);
        }
    } catch (e) {
        console.error("Failed to load data:", e);
    }
    updatePage(); // Update the page with loaded data
}

// Save data to local storage
function saveData() {
    try {
        localStorage.setItem('transactions', JSON.stringify(transactions));
        localStorage.setItem('budgetGoals', JSON.stringify(budgetGoals));
    } catch (e) {
        console.error("Failed to save data:", e);
    }
}

// Add transaction function with save data call
function addTransaction() {
    const descriptionInput = document.getElementById('description');
    const amountInput = document.getElementById('amount');
    const typeInput = document.getElementById('transaction-type');
    const categoryInput = document.getElementById('category');
    const dateInput = document.getElementById('date');
    const recurringInput = document.getElementById('recurring');
    const tagsInput = document.getElementById('tags');
    const noteInput = document.getElementById('note');

    const description = descriptionInput.value.trim();
    const amount = parseFloat(amountInput.value);
    const type = typeInput.value; // Get the selected type
    const category = categoryInput.value.trim();
    const date = new Date(dateInput.value);
    const recurring = recurringInput.value;
    const tags = tagsInput.value.split(',').map(tag => tag.trim());
    const note = noteInput.value.trim();

    if (description === '' || isNaN(amount) || amount <= 0 || !category || !date) {
        alert('Please fill out all fields correctly.');
        return;
    }

    const transaction = {
        description,
        amount,
        type, // Include type in transaction
        category,
        date,
        recurring,
        tags,
        note
    };

    transactions.push(transaction);
    updatePage(); // Update the page with new transaction
    clearInputs();
    checkBudgetGoals();
    sendNotifications();
    saveData(); // Save data after adding a transaction
}

// Delete transaction function with save data call
function deleteTransaction(index) {
    transactions.splice(index, 1);
    updatePage(); // Update the page after deleting a transaction
    saveData(); // Save data after deleting a transaction
}

// Set budget goal function with save data call
function setBudgetGoal() {
    const category = document.getElementById('budget-category').value;
    const amount = parseFloat(document.getElementById('budget-amount').value);

    if (!category || isNaN(amount)) {
        alert('Please fill out all fields correctly.');
        return;
    }

    budgetGoals[category] = amount;
    alert(`Budget goal set for ${category}: ${formatAmount(amount)}`);
    saveData(); // Save data after setting a budget goal
    updatePage(); // Update the page with new budget goal
}

// Clear input fields
function clearInputs() {
    document.getElementById('description').value = '';
    document.getElementById('amount').value = '';
    document.getElementById('category').value = '';
    document.getElementById('date').value = '';
    document.getElementById('recurring').value = 'none';
    document.getElementById('tags').value = '';
    document.getElementById('note').value = '';
}

function updateTransactionList() {
    const transactionList = document.getElementById('transaction-list');
    transactionList.innerHTML = '';

    transactions.forEach((transaction, index) => {
        const listItem = document.createElement('li');
        listItem.classList.add('new-item');
        listItem.textContent = `${formatDate(transaction.date)}: ${transaction.description} - ${formatAmount(transaction.amount)} (${transaction.category})`;

        const deleteButton = document.createElement('button');
        deleteButton.textContent = 'Delete';
        deleteButton.addEventListener('click', () => deleteTransaction(index));

        listItem.appendChild(deleteButton);
        transactionList.appendChild(listItem);
    });
}

function updateBalance() {
    const balanceElement = document.getElementById('balance');
    const totalIncome = transactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
    const totalExpense = transactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);

    balanceElement.textContent = formatAmount(totalIncome + totalExpense);
    balanceElement.classList.add('highlight');

    setTimeout(() => {
        balanceElement.classList.remove('highlight');
    }, 1000);
}

function updateCharts() {
    const totalIncome = transactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
    const totalExpense = transactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);

    incomeVsExpenseChart.data.datasets[0].data = [totalIncome, Math.abs(totalExpense)];
    incomeVsExpenseChart.update();

    const categoryData = {};
    transactions.forEach(transaction => {
        if (transaction.type === 'expense') {
            if (!categoryData[transaction.category]) {
                categoryData[transaction.category] = 0;
            }
            categoryData[transaction.category] += Math.abs(transaction.amount);
        }
    });

    categoryPieChart.data.labels = Object.keys(categoryData);
    categoryPieChart.data.datasets[0].data = Object.values(categoryData);
    categoryPieChart.data.datasets[0].backgroundColor = Object.keys(categoryData).map(() => '#' + Math.floor(Math.random() * 16777215).toString(16));
    categoryPieChart.update();

    const expenseTrend = transactions.filter(t => t.type === 'expense').reduce((acc, t) => {
        const month = t.date.toISOString().slice(0, 7);
        if (!acc[month]) {
            acc[month] = 0;
        }
        acc[month] += Math.abs(t.amount);
        return acc;
    }, {});

    expenseTrendChart.data.labels = Object.keys(expenseTrend);
    expenseTrendChart.data.datasets[0].data = Object.values(expenseTrend);
    expenseTrendChart.update();
}

function filterTransactions() {
    const transactionList = document.getElementById('transaction-list');
    const filter = document.getElementById('filter').value;
    const categoryFilter = document.getElementById('category-filter').value.toLowerCase();
    const tagFilter = document.getElementById('tag-filter').value.toLowerCase();
    const search = document.getElementById('search').value.toLowerCase();

    transactionList.classList.add('fade-out');

    setTimeout(() => {
        transactionList.innerHTML = '';

        transactions.forEach((transaction, index) => {
            const matchesFilter = filter === 'all' || (filter === 'income' && transaction.type === 'income') || (filter === 'expense' && transaction.type === 'expense');
            const matchesCategory = categoryFilter === '' || transaction.category.toLowerCase().includes(categoryFilter);
            const matchesTags = tagFilter === '' || transaction.tags.some(tag => tag.toLowerCase().includes(tagFilter));
            const matchesSearch = search === '' || transaction.description.toLowerCase().includes(search) || transaction.note.toLowerCase().includes(search);

            if (matchesFilter && matchesCategory && matchesTags && matchesSearch) {
                const listItem = document.createElement('li');
                listItem.textContent = `${formatDate(transaction.date)}: ${transaction.description} - ${formatAmount(transaction.amount)} (${transaction.category})`;

                const deleteButton = document.createElement('button');
                deleteButton.textContent = 'Delete';
                deleteButton.addEventListener('click', () => deleteTransaction(index));

                listItem.appendChild(deleteButton);
                transactionList.appendChild(listItem);
            }
        });

        transactionList.classList.remove('fade-out');
        transactionList.classList.add('fade-in');

        setTimeout(() => {
            transactionList.classList.remove('fade-in');
        }, 500);
    }, 500);
}

function toggleVisibility() {
    const details = document.getElementById('transaction-details');
    const button = document.getElementById('toggle-visibility');

    if (details.style.display === 'none') {
        details.style.display = 'block';
        button.textContent = 'Hide Transaction Details';
    } else {
        details.style.display = 'none';
        button.textContent = 'Show Transaction Details';
    }
}

function setGoalAlerts() {
    // Clear previous alerts
    alerts.length = 0;
    document.getElementById('alert-list').innerHTML = '';

    if (Object.keys(budgetGoals).length === 0) {
        alerts.push('No budget goals set.');
        document.getElementById('alert-list').textContent = 'No budget goals set.';
        return;
    }

    Object.entries(budgetGoals).forEach(([category, goal]) => {
        const totalSpent = transactions
            .filter(t => t.category === category && t.type === 'expense')
            .reduce((acc, t) => acc + Math.abs(t.amount), 0);

        if (totalSpent > goal) {
            alerts.push(`You have exceeded your budget goal for ${category}.`);
        } else if (totalSpent > goal * 0.8) {
            alerts.push(`You are nearing your budget goal for ${category}.`);
        }
    });

    alerts.forEach(alert => {
        const alertItem = document.createElement('li');
        alertItem.textContent = alert;
        document.getElementById('alert-list').appendChild(alertItem);
    });
}

function checkBudgetGoals() {
    setGoalAlerts();
}

// Update the budget goal list
function updateBudgetGoalList() {
    const budgetGoalList = document.getElementById('budget-goal-list');
    budgetGoalList.innerHTML = ''; // Clear the list

    for (const [category, amount] of Object.entries(budgetGoals)) {
        const listItem = document.createElement('li');
        listItem.textContent = `${category}: ${formatAmount(amount)}`;
        budgetGoalList.appendChild(listItem);
    }
}

// Display insights
function displayInsights() {
    // Calculate total income and expenses
    const totalIncome = transactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
    const totalExpense = transactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
    const remainingBudget = Object.entries(budgetGoals).reduce((acc, [category, goal]) => {
        const totalSpent = transactions
            .filter(t => t.category === category && t.type === 'expense')
            .reduce((acc, t) => acc + t.amount, 0);
        return acc + (goal - totalSpent);
    }, 0);

    // Display insights
    document.getElementById('insights').innerHTML = `
        <h3>Insights</h3>
        <p>Total Income: ${formatAmount(totalIncome)}</p>
        <p>Total Expenses: ${formatAmount(totalExpense)}</p>
        <p>Remaining Budget: ${formatAmount(remainingBudget)}</p>
        <p>${remainingBudget < 0 ? 'You have exceeded your overall budget!' : 'You are within your overall budget.'}</p>
    `;
}

// Update the page with all necessary information
function updatePage() {
    updateTransactionList();
    updateBalance();
    updateCharts();
    setGoalAlerts();
    updateBudgetGoalList();
    displayInsights(); // Call the displayInsights function to update the insights section
}

// Export data as CSV
function exportData() {
    const csvContent = "data:text/csv;charset=utf-8,"
        + transactions.map(e => `${e.date.toISOString()},${e.description},${e.amount},${e.type},${e.category},${e.recurring},${e.tags.join('|')},${e.note}`).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "transactions.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Generate PDF report
function generatePDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.text('Expense Report', 10, 10);

    transactions.forEach((t, i) => {
        doc.text(`${formatDate(t.date)}: ${t.description} - ${formatAmount(t.amount)} (${t.category})`, 10, 20 + (i * 10));
    });

    doc.save('transactions.pdf');
}

// Generate visual report with Chart.js graphs
function generateReport() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    doc.text('Expense Report', 10, 10);

    const totalIncome = transactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
    const totalExpense = transactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
    const netBalance = totalIncome + totalExpense;

    doc.text(`Total Income: ${formatAmount(totalIncome)}`, 10, 20);
    doc.text(`Total Expense: ${formatAmount(Math.abs(totalExpense))}`, 10, 30);
    doc.text(`Net Balance: ${formatAmount(netBalance)}`, 10, 40);

    // Add the charts
    doc.addImage(incomeVsExpenseChart.toBase64Image(), 'PNG', 10, 50, 180, 100);
    doc.addImage(categoryPieChart.toBase64Image(), 'PNG', 10, 160, 180, 100);
    doc.addImage(expenseTrendChart.toBase64Image(), 'PNG', 10, 270, 180, 100);

    doc.save('expense_report.pdf');
}

// Add event listeners for buttons
document.getElementById('apply-filters').addEventListener('click', filterTransactions);
document.getElementById('generate-report').addEventListener('click', generateReport);
document.getElementById('set-budget-goal').addEventListener('click', setBudgetGoal);
document.getElementById('export-data').addEventListener('click', exportData);
document.getElementById('generate-pdf').addEventListener('click', generatePDF);

// Initialize data on page load
window.onload = () => {
    loadData();
    updatePage(); // Call the new updatePage function
};

// Automatically save data on page unload
window.addEventListener('beforeunload', (event) => {
    saveData();
});
