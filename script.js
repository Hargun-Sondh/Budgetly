let transactions = [];

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

function formatMoney(amount) {
  return `₹${amount.toLocaleString("en-IN")}`;
}

function updateSummary() {
  let income = 0;
  let expense = 0;

  transactions.forEach(transaction => {
    if (transaction.type === "income") {
      income += transaction.amount;
    } else {
      expense += transaction.amount;
    }
  });

  totalIncome.textContent = formatMoney(income);
  totalExpense.textContent = formatMoney(expense);
  moneyLeft.textContent = formatMoney(income - expense);
}

function renderTransactions() {
  transactionList.innerHTML = "";
  emptyMessage.style.display = transactions.length === 0 ? "block" : "none";

  transactions.forEach((transaction, index) => {
    const item = document.createElement("div");
    item.className = "transaction";

    const sign = transaction.type === "income" ? "+" : "-";

    item.innerHTML = `
      <div class="transaction-info">
        <h3>${transaction.description}</h3>
        <p>${transaction.type}</p>
      </div>
      <div class="transaction-right">
        <span class="${transaction.type === "income" ? "amount-income" : "amount-expense"}">
          ${sign}${formatMoney(transaction.amount)}
        </span>
        <button class="delete-btn" data-index="${index}">Delete</button>
      </div>
    `;

    transactionList.appendChild(item);
  });

  document.querySelectorAll(".delete-btn").forEach(button => {
    button.addEventListener("click", () => {
      const index = Number(button.dataset.index);
      transactions.splice(index, 1);
      updateSummary();
      renderTransactions();
    });
  });
}

addBtn.addEventListener("click", () => {
  const description = descriptionInput.value.trim();
  const amount = Number(amountInput.value);
  const type = typeInput.value;

  if (description === "" || !amount || amount <= 0) {
    error.textContent = "Enter a description and a valid amount.";
    return;
  }

  error.textContent = "";

  transactions.push({
    description: description,
    amount: amount,
    type: type
  });

  descriptionInput.value = "";
  amountInput.value = "";

  updateSummary();
  renderTransactions();
});

clearBtn.addEventListener("click", () => {
  transactions = [];
  updateSummary();
  renderTransactions();
});

updateSummary();
renderTransactions();