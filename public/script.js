const API_URL = "/api/transactions";

let transactions = [];

const form = document.getElementById("transactionForm");
const descriptionInput = document.getElementById("description");
const amountInput = document.getElementById("amount");
const typeInput = document.getElementById("type");
const addBtn = document.getElementById("addBtn");

const totalIncome = document.getElementById("totalIncome");
const totalExpense = document.getElementById("totalExpense");
const moneyLeft = document.getElementById("moneyLeft");

const transactionList = document.getElementById("transactionList");
const emptyMessage = document.getElementById("emptyMessage");
const error = document.getElementById("error");
const clearBtn = document.getElementById("clearBtn");
const connectionStatus = document.getElementById("connectionStatus");

function formatMoney(amount) {
  return `₹${Number(amount).toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  })}`;
}

function setStatus(message, kind = "") {
  connectionStatus.textContent = message;
  connectionStatus.className = `status ${kind}`.trim();
}

async function apiRequest(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.message || `Request failed (${response.status}).`);
  }
  return payload;
}

function updateSummary() {
  const income = transactions
    .filter(item => item.type === "income")
    .reduce((sum, item) => sum + Number(item.amount), 0);
  const expense = transactions
    .filter(item => item.type === "expense")
    .reduce((sum, item) => sum + Number(item.amount), 0);

  totalIncome.textContent = formatMoney(income);
  totalExpense.textContent = formatMoney(expense);
  moneyLeft.textContent = formatMoney(income - expense);
}

function renderTransactions() {
  transactionList.replaceChildren();
  emptyMessage.style.display = transactions.length === 0 ? "block" : "none";

  for (const transaction of transactions) {
    const item = document.createElement("div");
    item.className = "transaction";

    const info = document.createElement("div");
    info.className = "transaction-info";

    const title = document.createElement("h3");
    title.textContent = transaction.description;

    const type = document.createElement("p");
    type.textContent = transaction.type;

    info.append(title, type);

    const right = document.createElement("div");
    right.className = "transaction-right";

    const amount = document.createElement("span");
    amount.className = transaction.type === "income" ? "amount-income" : "amount-expense";
    amount.textContent = `${transaction.type === "income" ? "+" : "−"}${formatMoney(transaction.amount)}`;

    const deleteButton = document.createElement("button");
    deleteButton.className = "delete-btn";
    deleteButton.type = "button";
    deleteButton.textContent = "Delete";
    deleteButton.addEventListener("click", () => deleteTransaction(transaction._id, deleteButton));

    right.append(amount, deleteButton);
    item.append(info, right);
    transactionList.appendChild(item);
  }
}

function refreshUI() {
  updateSummary();
  renderTransactions();
}

async function loadTransactions() {
  setStatus("Connecting to your database…");
  try {
    transactions = await apiRequest(API_URL);
    refreshUI();
    setStatus("Connected — transactions are saved in MongoDB.", "success");
  } catch (err) {
    setStatus("Could not connect to the database.", "failure");
    error.textContent = `${err.message} Check your backend and MongoDB setup.`;
  }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const description = descriptionInput.value.trim();
  const amount = Number(amountInput.value);
  const type = typeInput.value;

  if (!description || !Number.isFinite(amount) || amount <= 0) {
    error.textContent = "Enter a description and an amount greater than zero.";
    return;
  }

  error.textContent = "";
  addBtn.disabled = true;
  addBtn.textContent = "Saving…";

  try {
    const savedTransaction = await apiRequest(API_URL, {
      method: "POST",
      body: JSON.stringify({ description, amount, type })
    });
    transactions.unshift(savedTransaction);
    form.reset();
    refreshUI();
    setStatus("Transaction saved to MongoDB.", "success");
  } catch (err) {
    error.textContent = err.message;
    setStatus("Save failed.", "failure");
  } finally {
    addBtn.disabled = false;
    addBtn.textContent = "Add Transaction";
  }
});

async function deleteTransaction(id, button) {
  if (!confirm("Delete this transaction?")) return;

  button.disabled = true;
  try {
    await apiRequest(`${API_URL}/${encodeURIComponent(id)}`, { method: "DELETE" });
    transactions = transactions.filter(item => item._id !== id);
    refreshUI();
    setStatus("Transaction deleted.", "success");
  } catch (err) {
    error.textContent = err.message;
    button.disabled = false;
  }
}

clearBtn.addEventListener("click", async () => {
  if (transactions.length === 0) return;
  if (!confirm("Delete ALL transactions from the database? This cannot be undone.")) return;

  clearBtn.disabled = true;
  error.textContent = "";
  try {
    await apiRequest(API_URL, { method: "DELETE" });
    transactions = [];
    refreshUI();
    setStatus("All transactions deleted.", "success");
  } catch (err) {
    error.textContent = err.message;
  } finally {
    clearBtn.disabled = false;
  }
});

loadTransactions();