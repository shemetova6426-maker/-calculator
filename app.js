"use strict";

        /* =========================================================
           КАЛЬКУЛЯТОР СЕМЕЙНОГО БЮДЖЕТА
           ---------------------------------------------------------
           Весь JavaScript находится в этом файле.

           Основные возможности:
           1. Добавление доходов и расходов.
           2. Редактирование операций.
           3. Удаление операций.
           4. Расчёт доходов, расходов и баланса.
           5. Диаграмма расходов.
           6. Поиск и фильтрация.
           7. Сохранение в localStorage.
           8. Экспорт операций в CSV.
           ========================================================= */


        /* =========================================================
           1. КАТЕГОРИИ
           ========================================================= */

        const categories = {
            income: [
                "Зарплата",
                "Аванс",
                "Премия",
                "Подработка",
                "Пособия",
                "Подарки",
                "Возврат долга",
                "Инвестиции",
                "Другой доход"
            ],

            expense: [
                "Продукты",
                "Жильё",
                "Коммунальные услуги",
                "Транспорт",
                "Автомобиль",
                "Здоровье",
                "Одежда",
                "Дети",
                "Образование",
                "Красота",
                "Развлечения",
                "Кафе и рестораны",
                "Кредиты",
                "Связь и интернет",
                "Подарки",
                "Путешествия",
                "Другой расход"
            ]
        };


        /* =========================================================
           2. ЦВЕТА КАТЕГОРИЙ ДЛЯ ДИАГРАММЫ
           ========================================================= */

        const chartColors = [
            "#0f766e",
            "#15803d",
            "#ca8a04",
            "#dc2626",
            "#0369a1",
            "#c2410c",
            "#0d9488",
            "#be185d",
            "#4d7c0f",
            "#1d4ed8",
            "#b45309",
            "#047857",
            "#e11d48",
            "#475569",
            "#0e7490",
            "#a16207",
            "#166534"
        ];


        /* =========================================================
           3. КЛЮЧИ ДЛЯ СОХРАНЕНИЯ ДАННЫХ
           ========================================================= */

        const STORAGE_KEY = "familyBudgetTransactions_v1";
        const CURRENCY_KEY = "familyBudgetCurrency_v1";


        /* =========================================================
           4. СОСТОЯНИЕ ПРИЛОЖЕНИЯ
           ========================================================= */

        let transactions = loadTransactions();

        /*
            editingId содержит ID редактируемой операции.
            Если значение null, создаётся новая операция.
        */
        let editingId = null;

        const prefersReducedMotion = window.matchMedia(
            "(prefers-reduced-motion: reduce)"
        ).matches;

        const summaryDisplay = {
            income: 0,
            expense: 0,
            balance: 0
        };

        const summaryAnimFrames = {
            income: null,
            expense: null,
            balance: null
        };

        let chartAnimFrame = null;
        let chartAnimToken = 0;


        /* =========================================================
           5. ПОЛУЧЕНИЕ HTML-ЭЛЕМЕНТОВ
           ========================================================= */

        const transactionForm =
            document.getElementById("transactionForm");

        const typeInput =
            document.getElementById("type");

        const amountInput =
            document.getElementById("amount");

        const categoryInput =
            document.getElementById("category");

        const dateInput =
            document.getElementById("date");

        const descriptionInput =
            document.getElementById("description");

        const submitButton =
            document.getElementById("submitButton");

        const cancelEditButton =
            document.getElementById("cancelEditButton");

        const addDemoButton =
            document.getElementById("addDemoButton");

        const formTitle =
            document.getElementById("formTitle");

        const totalIncomeElement =
            document.getElementById("totalIncome");

        const totalExpenseElement =
            document.getElementById("totalExpense");

        const totalBalanceElement =
            document.getElementById("totalBalance");

        const balanceHintElement =
            document.getElementById("balanceHint");

        const transactionTableBody =
            document.getElementById("transactionTableBody");

        const searchInput =
            document.getElementById("searchInput");

        const filterType =
            document.getElementById("filterType");

        const filterCategory =
            document.getElementById("filterCategory");

        const filterMonth =
            document.getElementById("filterMonth");

        const currencyInput =
            document.getElementById("currency");

        const exportButton =
            document.getElementById("exportButton");

        const clearButton =
            document.getElementById("clearButton");

        const notification =
            document.getElementById("notification");

        const chartCanvas =
            document.getElementById("budgetChart");

        const chartLegend =
            document.getElementById("chartLegend");

        const chartTotal =
            document.getElementById("chartTotal");

        const savingRateElement =
            document.getElementById("savingRate");

        const savingProgress =
            document.getElementById("savingProgress");

        const savingMessage =
            document.getElementById("savingMessage");


        /* =========================================================
           6. ПЕРВОНАЧАЛЬНАЯ НАСТРОЙКА
           ========================================================= */

        initializeApplication();

        window.addEventListener("themechange", renderApplication);

        function initializeApplication() {
            /*
                Устанавливаем сохранённую валюту.
                Если её нет, используем российский рубль.
            */
            currencyInput.value =
                localStorage.getItem(CURRENCY_KEY) || "RUB";

            /*
                По умолчанию в форме устанавливается сегодняшняя дата.
            */
            dateInput.value = getTodayDate();

            /*
                Заполняем список категорий в зависимости
                от выбранного типа операции.
            */
            fillCategorySelect();

            /*
                Заполняем категории в фильтре.
            */
            fillCategoryFilter();

            /*
                Отображаем все данные.
            */
            renderApplication();
        }


        /* =========================================================
           7. ОБРАБОТЧИКИ СОБЫТИЙ
           ========================================================= */

        transactionForm.addEventListener(
            "submit",
            handleFormSubmit
        );

        typeInput.addEventListener(
            "change",
            fillCategorySelect
        );

        cancelEditButton.addEventListener(
            "click",
            resetForm
        );

        addDemoButton.addEventListener(
            "click",
            addDemoTransactions
        );

        searchInput.addEventListener(
            "input",
            renderApplication
        );

        filterType.addEventListener(
            "change",
            renderApplication
        );

        filterCategory.addEventListener(
            "change",
            renderApplication
        );

        filterMonth.addEventListener(
            "change",
            renderApplication
        );

        currencyInput.addEventListener(
            "change",
            function () {
                localStorage.setItem(
                    CURRENCY_KEY,
                    currencyInput.value
                );

                renderApplication();

                showNotification("Валюта изменена.");
            }
        );

        exportButton.addEventListener(
            "click",
            exportToCSV
        );

        clearButton.addEventListener(
            "click",
            clearAllTransactions
        );


        /* =========================================================
           8. ДОБАВЛЕНИЕ И РЕДАКТИРОВАНИЕ ОПЕРАЦИИ
           ========================================================= */

        function handleFormSubmit(event) {
            /*
                Запрещаем стандартную отправку формы,
                чтобы страница не перезагружалась.
            */
            event.preventDefault();

            const amount = Number(amountInput.value);

            if (!Number.isFinite(amount) || amount <= 0) {
                showNotification(
                    "Введите корректную сумму больше нуля.",
                    true
                );

                amountInput.focus();
                return;
            }

            if (!dateInput.value) {
                showNotification(
                    "Выберите дату операции.",
                    true
                );

                dateInput.focus();
                return;
            }

            const transactionData = {
                type: typeInput.value,
                amount: roundMoney(amount),
                category: categoryInput.value,
                date: dateInput.value,
                description:
                    descriptionInput.value.trim() ||
                    "Без описания"
            };

            if (editingId !== null) {
                /*
                    Обновляем существующую операцию.
                */
                transactions = transactions.map(
                    function (transaction) {
                        if (transaction.id === editingId) {
                            return {
                                ...transaction,
                                ...transactionData
                            };
                        }

                        return transaction;
                    }
                );

                showNotification("Операция обновлена.");
            } else {
                /*
                    Создаём новую операцию.
                */
                const newTransaction = {
                    id: createUniqueId(),
                    createdAt: Date.now(),
                    ...transactionData
                };

                transactions.push(newTransaction);

                showNotification("Операция добавлена.");
            }

            saveTransactions();
            resetForm();
            fillCategoryFilter();
            renderApplication();
        }


        /* =========================================================
           9. РЕДАКТИРОВАНИЕ ОПЕРАЦИИ
           ========================================================= */

        function startEditingTransaction(id) {
            const transaction = transactions.find(
                function (item) {
                    return item.id === id;
                }
            );

            if (!transaction) {
                showNotification(
                    "Операция не найдена.",
                    true
                );
                return;
            }

            editingId = id;

            typeInput.value = transaction.type;

            /*
                После изменения типа заново формируем категории.
            */
            fillCategorySelect();

            categoryInput.value = transaction.category;
            amountInput.value = transaction.amount;
            dateInput.value = transaction.date;
            descriptionInput.value =
                transaction.description === "Без описания"
                    ? ""
                    : transaction.description;

            formTitle.textContent = "Редактирование операции";
            submitButton.textContent = "Сохранить изменения";
            cancelEditButton.hidden = false;

            /*
                Прокручиваем страницу к форме.
            */
            transactionForm.scrollIntoView({
                behavior: "smooth",
                block: "center"
            });

            amountInput.focus();
        }


        /* =========================================================
           10. УДАЛЕНИЕ ОПЕРАЦИИ
           ========================================================= */

        function deleteTransaction(id) {
            const transaction = transactions.find(
                function (item) {
                    return item.id === id;
                }
            );

            if (!transaction) {
                return;
            }

            const confirmed = window.confirm(
                "Удалить операцию «" +
                transaction.description +
                "»?"
            );

            if (!confirmed) {
                return;
            }

            transactions = transactions.filter(
                function (item) {
                    return item.id !== id;
                }
            );

            if (editingId === id) {
                resetForm();
            }

            saveTransactions();
            fillCategoryFilter();
            renderApplication();

            showNotification("Операция удалена.");
        }


        /* =========================================================
           11. СБРОС ФОРМЫ
           ========================================================= */

        function resetForm() {
            editingId = null;

            transactionForm.reset();

            typeInput.value = "expense";
            dateInput.value = getTodayDate();

            fillCategorySelect();

            formTitle.textContent = "Добавить операцию";
            submitButton.textContent = "Добавить операцию";
            cancelEditButton.hidden = true;
        }


        /* =========================================================
           12. ЗАПОЛНЕНИЕ КАТЕГОРИЙ
           ========================================================= */

        function fillCategorySelect() {
            const selectedType = typeInput.value;
            const selectedCategories = categories[selectedType];

            categoryInput.innerHTML = "";

            selectedCategories.forEach(function (category) {
                const option = document.createElement("option");

                option.value = category;
                option.textContent = category;

                categoryInput.appendChild(option);
            });
        }

        function fillCategoryFilter() {
            const currentValue = filterCategory.value || "all";

            const usedCategories = [
                ...new Set(
                    transactions.map(function (transaction) {
                        return transaction.category;
                    })
                )
            ].sort(function (a, b) {
                return a.localeCompare(b, "ru");
            });

            filterCategory.innerHTML =
                '<option value="all">Все категории</option>';

            usedCategories.forEach(function (category) {
                const option = document.createElement("option");

                option.value = category;
                option.textContent = category;

                filterCategory.appendChild(option);
            });

            /*
                Сохраняем выбранное значение фильтра,
                если категория всё ещё существует.
            */
            if (
                currentValue === "all" ||
                usedCategories.includes(currentValue)
            ) {
                filterCategory.value = currentValue;
            }
        }


        /* =========================================================
           13. ОБЩАЯ ОТРИСОВКА ПРИЛОЖЕНИЯ
           ========================================================= */

        function renderApplication() {
            const filteredTransactions =
                getFilteredTransactions();

            renderSummary(filteredTransactions);
            renderTransactionsTable(filteredTransactions);
            renderExpenseChart(filteredTransactions);
            renderSavingRate(filteredTransactions);
        }


        /* =========================================================
           14. ФИЛЬТРАЦИЯ ОПЕРАЦИЙ
           ========================================================= */

        function getFilteredTransactions() {
            const searchValue =
                searchInput.value.trim().toLowerCase();

            const selectedType =
                filterType.value;

            const selectedCategory =
                filterCategory.value;

            const selectedMonth =
                filterMonth.value;

            return transactions
                .filter(function (transaction) {
                    const matchesSearch =
                        !searchValue ||
                        transaction.description
                            .toLowerCase()
                            .includes(searchValue) ||
                        transaction.category
                            .toLowerCase()
                            .includes(searchValue);

                    const matchesType =
                        selectedType === "all" ||
                        transaction.type === selectedType;

                    const matchesCategory =
                        selectedCategory === "all" ||
                        transaction.category === selectedCategory;

                    const matchesMonth =
                        !selectedMonth ||
                        transaction.date.startsWith(selectedMonth);

                    return (
                        matchesSearch &&
                        matchesType &&
                        matchesCategory &&
                        matchesMonth
                    );
                })
                .sort(function (a, b) {
                    /*
                        Сначала сортируем по дате,
                        затем по времени создания.
                    */
                    const dateDifference =
                        new Date(b.date) - new Date(a.date);

                    if (dateDifference !== 0) {
                        return dateDifference;
                    }

                    return (b.createdAt || 0) - (a.createdAt || 0);
                });
        }


        /* =========================================================
           15. РАСЧЁТ ИТОГОВ
           ========================================================= */

        function calculateTotals(transactionList) {
            return transactionList.reduce(
                function (totals, transaction) {
                    if (transaction.type === "income") {
                        totals.income += transaction.amount;
                    } else {
                        totals.expense += transaction.amount;
                    }

                    totals.balance =
                        totals.income - totals.expense;

                    return totals;
                },
                {
                    income: 0,
                    expense: 0,
                    balance: 0
                }
            );
        }

        function renderSummary(transactionList) {
            const totals = calculateTotals(transactionList);

            animateMoneyValue(
                totalIncomeElement,
                "income",
                totals.income
            );

            animateMoneyValue(
                totalExpenseElement,
                "expense",
                totals.expense
            );

            animateMoneyValue(
                totalBalanceElement,
                "balance",
                totals.balance
            );

            if (totals.balance > 0) {
                totalBalanceElement.style.color = "var(--income)";
                balanceHintElement.textContent =
                    "Бюджет находится в плюсе";
            } else if (totals.balance < 0) {
                totalBalanceElement.style.color = "var(--expense)";
                balanceHintElement.textContent =
                    "Расходы превышают доходы";
            } else {
                totalBalanceElement.style.color = "var(--balance)";
                balanceHintElement.textContent =
                    "Доходы равны расходам";
            }
        }

        function animateMoneyValue(element, key, target) {
            if (prefersReducedMotion) {
                summaryDisplay[key] = target;
                element.textContent = formatMoney(target);
                return;
            }

            if (summaryAnimFrames[key] !== null) {
                cancelAnimationFrame(summaryAnimFrames[key]);
                summaryAnimFrames[key] = null;
            }

            const from = summaryDisplay[key];
            const delta = target - from;

            if (Math.abs(delta) < 0.005) {
                summaryDisplay[key] = target;
                element.textContent = formatMoney(target);
                return;
            }

            const start = performance.now();
            const duration = 780;

            function frame(now) {
                const progress = Math.min(1, (now - start) / duration);
                const eased = 1 - Math.pow(1 - progress, 3);
                const value = from + delta * eased;

                element.textContent = formatMoney(
                    Number.isInteger(target)
                        ? Math.round(value)
                        : Math.round(value * 100) / 100
                );

                if (progress < 1) {
                    summaryAnimFrames[key] =
                        requestAnimationFrame(frame);
                    return;
                }

                summaryDisplay[key] = target;
                summaryAnimFrames[key] = null;
                element.textContent = formatMoney(target);
            }

            summaryAnimFrames[key] = requestAnimationFrame(frame);
        }


        /* =========================================================
           16. ТАБЛИЦА ОПЕРАЦИЙ
           ========================================================= */

        function renderTransactionsTable(transactionList) {
            transactionTableBody.innerHTML = "";

            if (transactionList.length === 0) {
                transactionTableBody.innerHTML = `
                    <tr>
                        <td colspan="6" class="empty-state">
                            Операции не найдены.
                            Добавьте первую запись или измените фильтры.
                        </td>
                    </tr>
                `;

                return;
            }

            transactionList.forEach(function (transaction) {
                const row = document.createElement("tr");

                const typeText =
                    transaction.type === "income"
                        ? "Доход"
                        : "Расход";

                const amountSign =
                    transaction.type === "income"
                        ? "+"
                        : "−";

                row.innerHTML = `
                    <td>
                        ${escapeHTML(formatDate(transaction.date))}
                    </td>

                    <td>
                        <span class="
                            transaction-type
                            transaction-type--${transaction.type}
                        ">
                            ${typeText}
                        </span>
                    </td>

                    <td>
                        ${escapeHTML(transaction.category)}
                    </td>

                    <td>
                        ${escapeHTML(transaction.description)}
                    </td>

                    <td>
                        <span class="
                            amount
                            amount--${transaction.type}
                        ">
                            ${amountSign}${escapeHTML(
                                formatMoney(transaction.amount)
                            )}
                        </span>
                    </td>

                    <td>
                        <div class="actions">
                            <button
                                class="icon-button edit-button"
                                type="button"
                                title="Редактировать"
                                aria-label="Редактировать операцию"
                            >
                                ✎
                            </button>

                            <button
                                class="
                                    icon-button
                                    icon-button--delete
                                    delete-button
                                "
                                type="button"
                                title="Удалить"
                                aria-label="Удалить операцию"
                            >
                                ×
                            </button>
                        </div>
                    </td>
                `;

                /*
                    Назначаем события кнопкам после создания строки.
                */
                row
                    .querySelector(".edit-button")
                    .addEventListener(
                        "click",
                        function () {
                            startEditingTransaction(
                                transaction.id
                            );
                        }
                    );

                row
                    .querySelector(".delete-button")
                    .addEventListener(
                        "click",
                        function () {
                            deleteTransaction(
                                transaction.id
                            );
                        }
                    );

                transactionTableBody.appendChild(row);
            });
        }


        /* =========================================================
           17. ДИАГРАММА РАСХОДОВ
           ========================================================= */

        function renderExpenseChart(transactionList) {
            /*
                Сначала получаем только расходы.
            */
            const expenses = transactionList.filter(
                function (transaction) {
                    return transaction.type === "expense";
                }
            );

            /*
                Группируем расходы по категориям.
            */
            const groupedExpenses = expenses.reduce(
                function (result, transaction) {
                    if (!result[transaction.category]) {
                        result[transaction.category] = 0;
                    }

                    result[transaction.category] +=
                        transaction.amount;

                    return result;
                },
                {}
            );

            const chartData = Object.entries(groupedExpenses)
                .map(function ([category, amount]) {
                    return {
                        category,
                        amount
                    };
                })
                .sort(function (a, b) {
                    return b.amount - a.amount;
                });

            const totalExpense = chartData.reduce(
                function (sum, item) {
                    return sum + item.amount;
                },
                0
            );

            chartTotal.textContent = formatMoney(totalExpense);
            chartLegend.innerHTML = "";

            const context = chartCanvas.getContext("2d");

            if (chartAnimFrame !== null) {
                cancelAnimationFrame(chartAnimFrame);
                chartAnimFrame = null;
            }

            chartAnimToken += 1;
            const token = chartAnimToken;

            /*
                Очищаем предыдущую диаграмму.
            */
            context.clearRect(
                0,
                0,
                chartCanvas.width,
                chartCanvas.height
            );

            if (chartData.length === 0 || totalExpense <= 0) {
                drawEmptyChart(context);

                chartLegend.innerHTML = `
                    <div class="chart-empty">
                        Пока нет расходов для построения диаграммы.
                    </div>
                `;

                return;
            }

            chartData.forEach(function (item, index) {
                const color =
                    chartColors[index % chartColors.length];

                createLegendItem(
                    item,
                    color,
                    totalExpense
                );
            });

            if (prefersReducedMotion) {
                drawExpenseChartSlices(
                    context,
                    chartData,
                    totalExpense,
                    1
                );
                return;
            }

            const start = performance.now();
            const duration = 900;

            function frame(now) {
                if (token !== chartAnimToken) {
                    return;
                }

                const progress = Math.min(
                    1,
                    (now - start) / duration
                );
                const eased = 1 - Math.pow(1 - progress, 3);

                context.clearRect(
                    0,
                    0,
                    chartCanvas.width,
                    chartCanvas.height
                );

                drawExpenseChartSlices(
                    context,
                    chartData,
                    totalExpense,
                    eased
                );

                if (progress < 1) {
                    chartAnimFrame = requestAnimationFrame(frame);
                    return;
                }

                chartAnimFrame = null;
            }

            chartAnimFrame = requestAnimationFrame(frame);
        }

        function drawExpenseChartSlices(
            context,
            chartData,
            totalExpense,
            progress
        ) {
            /*
                Canvas имеет фактический размер 440 × 440,
                но отображается как 220 × 220.
                Благодаря этому диаграмма остаётся чёткой.
            */
            const centerX = chartCanvas.width / 2;
            const centerY = chartCanvas.height / 2;
            const radius = 190;
            const lineWidth = 82;
            const safeProgress = Math.max(0, Math.min(1, progress));
            const revealEnd =
                -Math.PI / 2 + Math.PI * 2 * safeProgress;

            let startAngle = -Math.PI / 2;

            chartData.forEach(function (item, index) {
                const sliceAngle =
                    (item.amount / totalExpense) *
                    Math.PI *
                    2;
                const endAngle = startAngle + sliceAngle;

                if (startAngle < revealEnd) {
                    const drawEnd = Math.min(
                        endAngle,
                        revealEnd
                    );

                    if (drawEnd > startAngle) {
                        const color =
                            chartColors[
                                index % chartColors.length
                            ];

                        context.beginPath();
                        context.arc(
                            centerX,
                            centerY,
                            radius - lineWidth / 2,
                            startAngle,
                            drawEnd
                        );

                        context.strokeStyle = color;
                        context.lineWidth = lineWidth;
                        context.lineCap = "butt";
                        context.stroke();
                    }
                }

                startAngle = endAngle;
            });
        }

        function drawEmptyChart(context) {
            const centerX = chartCanvas.width / 2;
            const centerY = chartCanvas.height / 2;

            context.beginPath();
            context.arc(
                centerX,
                centerY,
                149,
                0,
                Math.PI * 2
            );

            context.strokeStyle =
                getComputedStyle(document.documentElement)
                    .getPropertyValue("--progress-track")
                    .trim() || "#e5e7eb";
            context.lineWidth = 82;
            context.stroke();
        }

        function createLegendItem(item, color, totalExpense) {
            const percentage =
                totalExpense > 0
                    ? (item.amount / totalExpense) * 100
                    : 0;

            const legendItem =
                document.createElement("div");

            legendItem.className = "legend__item";

            legendItem.innerHTML = `
                <span
                    class="legend__color"
                    style="background: ${color}"
                ></span>

                <span
                    class="legend__name"
                    title="${escapeHTML(item.category)}"
                >
                    ${escapeHTML(item.category)}
                </span>

                <span class="legend__value">
                    ${percentage.toFixed(1)}%
                </span>
            `;

            chartLegend.appendChild(legendItem);
        }


        /* =========================================================
           18. НОРМА СБЕРЕЖЕНИЙ
           ========================================================= */

        function renderSavingRate(transactionList) {
            const totals = calculateTotals(transactionList);

            let savingRate = 0;

            if (totals.income > 0) {
                savingRate =
                    (totals.balance / totals.income) * 100;
            }

            /*
                Для полосы ограничиваем значение диапазоном 0–100.
                Сам текстовый процент может быть отрицательным.
            */
            const progressValue = Math.min(
                100,
                Math.max(0, savingRate)
            );

            savingRateElement.textContent =
                savingRate.toFixed(1) + "%";

            savingProgress.style.width =
                progressValue + "%";

            savingProgress
                .parentElement
                .setAttribute(
                    "aria-valuenow",
                    String(progressValue)
                );

            if (totals.income === 0) {
                savingMessage.textContent =
                    "Добавьте доходы, чтобы рассчитать норму сбережений.";
            } else if (savingRate < 0) {
                savingMessage.textContent =
                    "Расходы превышают доходы. Стоит пересмотреть крупные траты.";
            } else if (savingRate < 10) {
                savingMessage.textContent =
                    "Сбережения небольшие. Попробуйте откладывать хотя бы 10% дохода.";
            } else if (savingRate < 20) {
                savingMessage.textContent =
                    "Хорошее начало. Вы сохраняете заметную часть дохода.";
            } else if (savingRate <= 50) {
                savingMessage.textContent =
                    "Отличный результат: семейный бюджет имеет хороший запас.";
            } else {
                savingMessage.textContent =
                    "Очень высокий уровень сбережений. Проверьте, все ли расходы внесены.";
            }
        }


        /* =========================================================
           19. ДЕМОНСТРАЦИОННЫЕ ДАННЫЕ
           ========================================================= */

        function addDemoTransactions() {
            const confirmed =
                transactions.length === 0 ||
                window.confirm(
                    "Добавить демонстрационные операции к текущим данным?"
                );

            if (!confirmed) {
                return;
            }

            const today = new Date();

            const demoTransactions = [
                {
                    id: createUniqueId(),
                    type: "income",
                    category: "Зарплата",
                    description: "Основная зарплата",
                    amount: 75000,
                    date: createDateForCurrentMonth(5),
                    createdAt: Date.now()
                },
                {
                    id: createUniqueId(),
                    type: "income",
                    category: "Подработка",
                    description: "Дополнительный проект",
                    amount: 18000,
                    date: createDateForCurrentMonth(12),
                    createdAt: Date.now() + 1
                },
                {
                    id: createUniqueId(),
                    type: "expense",
                    category: "Продукты",
                    description: "Продукты на неделю",
                    amount: 8400,
                    date: createDateForCurrentMonth(7),
                    createdAt: Date.now() + 2
                },
                {
                    id: createUniqueId(),
                    type: "expense",
                    category: "Коммунальные услуги",
                    description: "Квартплата",
                    amount: 6900,
                    date: createDateForCurrentMonth(9),
                    createdAt: Date.now() + 3
                },
                {
                    id: createUniqueId(),
                    type: "expense",
                    category: "Транспорт",
                    description: "Проезд и такси",
                    amount: 4200,
                    date: createDateForCurrentMonth(14),
                    createdAt: Date.now() + 4
                },
                {
                    id: createUniqueId(),
                    type: "expense",
                    category: "Здоровье",
                    description: "Аптека",
                    amount: 2300,
                    date: createDateForCurrentMonth(
                        Math.min(today.getDate(), 18)
                    ),
                    createdAt: Date.now() + 5
                }
            ];

            transactions.push(...demoTransactions);

            saveTransactions();
            fillCategoryFilter();
            renderApplication();

            showNotification(
                "Демонстрационные операции добавлены."
            );
        }

        function createDateForCurrentMonth(day) {
            const currentDate = new Date();

            const year = currentDate.getFullYear();
            const month = currentDate.getMonth();

            const lastDay = new Date(
                year,
                month + 1,
                0
            ).getDate();

            const safeDay = Math.min(day, lastDay);

            return (
                year +
                "-" +
                String(month + 1).padStart(2, "0") +
                "-" +
                String(safeDay).padStart(2, "0")
            );
        }


        /* =========================================================
           20. ОЧИСТКА ВСЕХ ДАННЫХ
           ========================================================= */

        function clearAllTransactions() {
            if (transactions.length === 0) {
                showNotification(
                    "Список операций уже пуст."
                );
                return;
            }

            const confirmed = window.confirm(
                "Удалить все операции? Это действие нельзя отменить."
            );

            if (!confirmed) {
                return;
            }

            transactions = [];

            saveTransactions();
            resetForm();
            fillCategoryFilter();
            renderApplication();

            showNotification("Все операции удалены.");
        }


        /* =========================================================
           21. ЭКСПОРТ В CSV
           ========================================================= */

        function exportToCSV() {
            const filteredTransactions =
                getFilteredTransactions();

            if (filteredTransactions.length === 0) {
                showNotification(
                    "Нет операций для экспорта.",
                    true
                );
                return;
            }

            const csvRows = [
                [
                    "Дата",
                    "Тип",
                    "Категория",
                    "Описание",
                    "Сумма",
                    "Валюта"
                ]
            ];

            filteredTransactions.forEach(
                function (transaction) {
                    csvRows.push([
                        transaction.date,
                        transaction.type === "income"
                            ? "Доход"
                            : "Расход",
                        transaction.category,
                        transaction.description,
                        transaction.amount
                            .toFixed(2)
                            .replace(".", ","),
                        currencyInput.value
                    ]);
                }
            );

            /*
                Экранируем значения:
                - помещаем каждое значение в кавычки;
                - двойные кавычки внутри значения удваиваем.
            */
            const csvContent = csvRows
                .map(function (row) {
                    return row
                        .map(function (value) {
                            return (
                                '"' +
                                String(value).replace(
                                    /"/g,
                                    '""'
                                ) +
                                '"'
                            );
                        })
                        .join(";");
                })
                .join("\n");

            /*
                BOM нужен, чтобы Excel правильно распознавал
                русские буквы в UTF-8.
            */
            const blob = new Blob(
                ["\uFEFF" + csvContent],
                {
                    type: "text/csv;charset=utf-8;"
                }
            );

            const downloadUrl =
                URL.createObjectURL(blob);

            const link =
                document.createElement("a");

            link.href = downloadUrl;
            link.download =
                "family-budget-" +
                getTodayDate() +
                ".csv";

            document.body.appendChild(link);
            link.click();
            link.remove();

            URL.revokeObjectURL(downloadUrl);

            showNotification(
                "CSV-файл подготовлен."
            );
        }


        /* =========================================================
           22. СОХРАНЕНИЕ В LOCALSTORAGE
           ========================================================= */

        function saveTransactions() {
            try {
                localStorage.setItem(
                    STORAGE_KEY,
                    JSON.stringify(transactions)
                );
            } catch (error) {
                console.error(
                    "Не удалось сохранить данные:",
                    error
                );

                showNotification(
                    "Браузер не смог сохранить данные.",
                    true
                );
            }
        }

        function loadTransactions() {
            try {
                const savedData =
                    localStorage.getItem(STORAGE_KEY);

                if (!savedData) {
                    return [];
                }

                const parsedData =
                    JSON.parse(savedData);

                if (!Array.isArray(parsedData)) {
                    return [];
                }

                /*
                    Проверяем и нормализуем сохранённые операции.
                */
                return parsedData
                    .filter(function (transaction) {
                        return (
                            transaction &&
                            typeof transaction.id === "string" &&
                            (
                                transaction.type === "income" ||
                                transaction.type === "expense"
                            ) &&
                            Number.isFinite(
                                Number(transaction.amount)
                            )
                        );
                    })
                    .map(function (transaction) {
                        return {
                            ...transaction,
                            amount:
                                Number(transaction.amount),
                            createdAt:
                                transaction.createdAt ||
                                Date.now()
                        };
                    });
            } catch (error) {
                console.error(
                    "Не удалось загрузить данные:",
                    error
                );

                return [];
            }
        }


        /* =========================================================
           23. ФОРМАТИРОВАНИЕ ДЕНЕГ
           ========================================================= */

        function formatMoney(amount) {
            const currency =
                currencyInput.value || "RUB";

            const localeMap = {
                RUB: "ru-RU",
                EUR: "de-DE",
                USD: "en-US",
                KZT: "ru-KZ",
                BYN: "ru-BY"
            };

            try {
                return new Intl.NumberFormat(
                    localeMap[currency] || "ru-RU",
                    {
                        style: "currency",
                        currency: currency,
                        minimumFractionDigits:
                            Number.isInteger(amount) ? 0 : 2,
                        maximumFractionDigits: 2
                    }
                ).format(amount);
            } catch (error) {
                return amount.toFixed(2) + " " + currency;
            }
        }


        /* =========================================================
           24. ФОРМАТИРОВАНИЕ ДАТЫ
           ========================================================= */

        function formatDate(dateString) {
            if (!dateString) {
                return "—";
            }

            /*
                Добавляем время 00:00, чтобы избежать смещения даты
                из-за часового пояса браузера.
            */
            const date = new Date(
                dateString + "T00:00:00"
            );

            if (Number.isNaN(date.getTime())) {
                return dateString;
            }

            return new Intl.DateTimeFormat(
                "ru-RU",
                {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric"
                }
            ).format(date);
        }

        function getTodayDate() {
            const today = new Date();

            const year = today.getFullYear();
            const month = String(
                today.getMonth() + 1
            ).padStart(2, "0");

            const day = String(
                today.getDate()
            ).padStart(2, "0");

            return year + "-" + month + "-" + day;
        }


        /* =========================================================
           25. ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
           ========================================================= */

        function createUniqueId() {
            /*
                randomUUID поддерживается большинством
                современных браузеров.
            */
            if (
                window.crypto &&
                typeof window.crypto.randomUUID === "function"
            ) {
                return window.crypto.randomUUID();
            }

            /*
                Запасной вариант для старых браузеров.
            */
            return (
                Date.now().toString(36) +
                Math.random().toString(36).slice(2)
            );
        }

        function roundMoney(value) {
            /*
                Устраняет типичные ошибки JavaScript
                при работе с дробными числами.
            */
            return Math.round(
                (value + Number.EPSILON) * 100
            ) / 100;
        }

        function escapeHTML(value) {
            /*
                Защита от вставки HTML и JavaScript
                через описание или название категории.
            */
            return String(value)
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;")
                .replace(/'/g, "&#039;");
        }


        /* =========================================================
           26. ВСПЛЫВАЮЩИЕ УВЕДОМЛЕНИЯ
           ========================================================= */

        let notificationTimer = null;

        function showNotification(message, isError = false) {
            clearTimeout(notificationTimer);

            notification.textContent = message;

            notification.classList.toggle(
                "notification--error",
                isError
            );

            notification.classList.add(
                "notification--visible"
            );

            notificationTimer = setTimeout(
                function () {
                    notification.classList.remove(
                        "notification--visible"
                    );
                },
                2600
            );
        }
    