document.addEventListener("DOMContentLoaded", () => {
    setupFormValidation();
    setupTodoList();
    setupCalculator();
    setupImageSlider();
    setupCart();
});

const generateId = () => {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
        return crypto.randomUUID();
    }
    return `${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
};

// ---------------------------
// 1. Form Validation
// ---------------------------
function setupFormValidation() {
    const form = document.getElementById("signup-form");
    if (!form) return;

    const fields = {
        email: {
            input: document.getElementById("email"),
            validator: (value) => /^\w+([.-]?\w+)*@[\w-]+(\.\w{2,})+$/.test(value.trim()),
            message: "Vui lòng nhập email hợp lệ."
        },
        password: {
            input: document.getElementById("password"),
            validator: (value) => /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d!@#$%^&*()_+\-=\[\]{};':\"\\|,.<>\/?]{8,}$/.test(value),
            message: "Mật khẩu tối thiểu 8 ký tự, gồm chữ và số."
        },
        phone: {
            input: document.getElementById("phone"),
            validator: (value) => /^(0|\+84)([3|5|7|8|9])\d{8}$/.test(value.replace(/\s+/g, "")),
            message: "Số điện thoại phải có 10 chữ số, bắt đầu bằng 0 hoặc +84."
        }
    };

    Object.values(fields).forEach(({ input, validator, message }) => {
        const errorTarget = document.querySelector(`.error-message[data-for="${input.id}"]`);

        input.addEventListener("input", () => {
            if (validator(input.value)) {
                setValidState(input, errorTarget);
            } else {
                setInvalidState(input, errorTarget, message);
            }
        });
    });

    form.addEventListener("submit", (event) => {
        event.preventDefault();
        let isValid = true;

        Object.values(fields).forEach(({ input, validator, message }) => {
            const errorTarget = document.querySelector(`.error-message[data-for="${input.id}"]`);
            if (validator(input.value)) {
                setValidState(input, errorTarget);
            } else {
                setInvalidState(input, errorTarget, message);
                isValid = false;
            }
        });

        const successMessage = document.getElementById("form-success");
        if (!successMessage) return;

        if (isValid) {
            successMessage.textContent = "Đăng ký thành công! Form đã được kiểm tra.";
            form.reset();
            Object.values(fields).forEach(({ input }) => input.classList.remove("invalid"));
        } else {
            successMessage.textContent = "";
        }
    });
}

function setInvalidState(input, errorTarget, message) {
    input.classList.add("invalid");
    if (errorTarget) {
        errorTarget.textContent = message;
    }
}

function setValidState(input, errorTarget) {
    input.classList.remove("invalid");
    if (errorTarget) {
        errorTarget.textContent = "";
    }
}

// ---------------------------
// 2. Todo List với LocalStorage
// ---------------------------
function setupTodoList() {
    const STORAGE_KEY = "dom_todos";
    const input = document.getElementById("todo-input");
    const addButton = document.getElementById("add-todo");
    const list = document.getElementById("todo-list");
    if (!input || !addButton || !list) return;

    let todos = loadTodos();
    renderTodos();

    addButton.addEventListener("click", handleAddTodo);
    input.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
            handleAddTodo();
        }
    });

    list.addEventListener("click", handleListClick);

    function handleAddTodo() {
        const value = input.value.trim();
        if (!value) {
            input.focus();
            return;
        }

        const newTodo = {
            id: generateId(),
            title: value,
            completed: false,
            createdAt: Date.now()
        };
        todos = [newTodo, ...todos];
        input.value = "";
        persistAndRender();
    }

    function handleListClick(event) {
        const target = event.target;
        const item = target.closest(".todo-item");
        if (!item) return;
        const id = item.dataset.id;

        if (target.matches("[data-action='toggle']")) {
            todos = todos.map((todo) =>
                todo.id === id ? { ...todo, completed: !todo.completed } : todo
            );
            persistAndRender();
        }

        if (target.matches("[data-action='delete']")) {
            todos = todos.filter((todo) => todo.id !== id);
            persistAndRender();
        }

        if (target.matches("[data-action='edit']")) {
            const original = todos.find((todo) => todo.id === id);
            if (!original) return;
            const updatedTitle = prompt("Cập nhật công việc:", original.title);
            if (updatedTitle && updatedTitle.trim()) {
                todos = todos.map((todo) =>
                    todo.id === id ? { ...todo, title: updatedTitle.trim() } : todo
                );
                persistAndRender();
            }
        }
    }

    function renderTodos() {
        if (!todos.length) {
            list.innerHTML = `<li class="todo-empty">Chưa có công việc. Thêm việc ngay!</li>`;
            return;
        }

        const fragment = document.createDocumentFragment();
        todos.forEach((todo) => {
            const li = document.createElement("li");
            li.className = `todo-item${todo.completed ? " completed" : ""}`;
            li.dataset.id = todo.id;
            li.innerHTML = `
                <button data-action="toggle" class="secondary">${todo.completed ? "Hoàn tác" : "Xong"}</button>
                <span class="todo-title">${todo.title}</span>
                <button data-action="edit" class="accent">Sửa</button>
                <button data-action="delete" class="secondary">Xóa</button>
            `;
            fragment.appendChild(li);
        });

        list.innerHTML = "";
        list.appendChild(fragment);
    }

    function loadTodos() {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            return saved ? JSON.parse(saved) : [];
        } catch (error) {
            console.error("Không thể đọc todo từ LocalStorage:", error);
            return [];
        }
    }

    function persistAndRender() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
        renderTodos();
    }
}

// ---------------------------
// 3. Calculator
// ---------------------------
function setupCalculator() {
    const display = document.getElementById("calc-display");
    const buttons = document.getElementById("calc-buttons");
    if (!display || !buttons) return;

    let currentValue = "0";
    let previousValue = null;
    let operator = null;
    let shouldResetDisplay = false;

    buttons.addEventListener("click", (event) => {
        const target = event.target;
        if (!(target instanceof HTMLButtonElement)) return;

        const { value, action, operation } = target.dataset;

        if (value !== undefined) {
            handleNumber(value);
        } else if (action) {
            handleAction(action);
        } else if (operation) {
            handleOperation(operation);
        }

        display.textContent = currentValue;
    });

    function handleNumber(value) {
        if (shouldResetDisplay || currentValue === "Không thể chia 0") {
            currentValue = value === "." ? "0." : value;
            shouldResetDisplay = false;
            return;
        }

        if (value === ".") {
            if (!currentValue.includes(".")) {
                currentValue += ".";
            }
            return;
        }

        currentValue = currentValue === "0" ? value : currentValue + value;
    }

    function handleAction(action) {
        switch (action) {
            case "clear":
                currentValue = "0";
                previousValue = null;
                operator = null;
                shouldResetDisplay = false;
                break;
            case "delete":
                if (shouldResetDisplay) {
                    currentValue = "0";
                    shouldResetDisplay = false;
                } else {
                    currentValue = currentValue.length > 1 ? currentValue.slice(0, -1) : "0";
                }
                break;
            case "calculate":
                if (operator && previousValue !== null) {
                    currentValue = compute(previousValue, currentValue, operator);
                    previousValue = null;
                    operator = null;
                    shouldResetDisplay = true;
                }
                break;
        }
    }

    function handleOperation(nextOperator) {
        if (currentValue === "Không thể chia 0") {
            currentValue = "0";
        }

        if (nextOperator === "%") {
            const current = parseFloat(currentValue);
            currentValue = Number.isFinite(current) ? String(current / 100) : "0";
            return;
        }

        if (operator && !shouldResetDisplay) {
            currentValue = compute(previousValue, currentValue, operator);
        }

        previousValue = currentValue;
        operator = nextOperator;
        shouldResetDisplay = true;
    }

    function compute(a, b, op) {
        const first = parseFloat(a);
        const second = parseFloat(b);
        if (Number.isNaN(first) || Number.isNaN(second)) return "0";

        let result;
        switch (op) {
            case "+":
                result = first + second;
                break;
            case "-":
                result = first - second;
                break;
            case "*":
                result = first * second;
                break;
            case "/":
                result = second === 0 ? "Không thể chia 0" : first / second;
                break;
            default:
                result = second;
                break;
        }

        if (typeof result === "number") {
            return Number.isFinite(result) ? String(parseFloat(result.toFixed(6))) : "0";
        }
        return String(result);
    }
}

// ---------------------------
// 4. Image Slider / Carousel
// ---------------------------
function setupImageSlider() {
    const track = document.getElementById("slider-track");
    const dotsContainer = document.getElementById("slider-dots");
    const prevButton = document.getElementById("slider-prev");
    const nextButton = document.getElementById("slider-next");
    if (!track || !dotsContainer || !prevButton || !nextButton) return;

    const slides = Array.from(track.children);
    const totalSlides = slides.length;
    let currentIndex = 0;
    let autoPlayTimer = null;

    createDots();
    updateSlider();
    startAutoPlay();

    prevButton.addEventListener("click", () => {
        currentIndex = (currentIndex - 1 + totalSlides) % totalSlides;
        updateSlider();
        restartAutoPlay();
    });

    nextButton.addEventListener("click", () => {
        goToNextSlide();
        restartAutoPlay();
    });

    dotsContainer.addEventListener("click", (event) => {
        if (!(event.target instanceof HTMLElement)) return;
        if (!event.target.classList.contains("slider-dot")) return;

        const { index } = event.target.dataset;
        currentIndex = Number(index);
        updateSlider();
        restartAutoPlay();
    });

    function createDots() {
        const fragment = document.createDocumentFragment();
        slides.forEach((_, index) => {
            const dot = document.createElement("button");
            dot.className = "slider-dot";
            dot.dataset.index = String(index);
            fragment.appendChild(dot);
        });
        dotsContainer.appendChild(fragment);
    }

    function updateSlider() {
        track.style.transform = `translateX(-${currentIndex * 100}%)`;
        const dots = dotsContainer.querySelectorAll(".slider-dot");
        dots.forEach((dot, index) => {
            dot.classList.toggle("active", index === currentIndex);
        });
    }

    function goToNextSlide() {
        currentIndex = (currentIndex + 1) % totalSlides;
        updateSlider();
    }

    function startAutoPlay() {
        autoPlayTimer = setInterval(goToNextSlide, 5000);
    }

    function restartAutoPlay() {
        clearInterval(autoPlayTimer);
        startAutoPlay();
    }
}

// ---------------------------
// 5. LocalStorage Cart Demo
// ---------------------------
function setupCart() {
    const PRODUCTS = [
        {
            id: "coffee",
            title: "Cà phê rang xay",
            price: 89000,
            image: "https://images.unsplash.com/photo-1447933601403-0c6688de566e?auto=format&fit=crop&w=600&q=80"
        },
        {
            id: "tea",
            title: "Trà hoa nhài",
            price: 76000,
            image: "https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?auto=format&fit=crop&w=600&q=80"
        },
        {
            id: "choco",
            title: "Socola đen 70%",
            price: 65000,
            image: "https://images.unsplash.com/photo-1499636136210-6f4ee915583e?auto=format&fit=crop&w=600&q=80"
        },
        {
            id: "bakery",
            title: "Bánh mì thủ công",
            price: 42000,
            image: "https://images.unsplash.com/photo-1511690743698-d9d85f2fbf38?auto=format&fit=crop&w=600&q=80"
        }
    ];
    const STORAGE_KEY = "dom_cart";

    const productList = document.getElementById("product-list");
    const cartList = document.getElementById("cart-items");
    const totalEl = document.getElementById("cart-total");
    const clearButton = document.getElementById("clear-cart");
    if (!productList || !cartList || !totalEl || !clearButton) return;

    let cart = loadCart();

    renderProducts();
    renderCart();

    productList.addEventListener("click", (event) => {
        const button = event.target.closest("[data-product-id]");
        if (!button) return;
        const { productId } = button.dataset;
        addToCart(productId);
    });

    cartList.addEventListener("click", (event) => {
        const button = event.target.closest("[data-action]");
        if (!button) return;
        const { action, productId } = button.dataset;
        if (action === "increment") {
            addToCart(productId);
        } else if (action === "decrement") {
            updateCartItem(productId, -1);
        } else if (action === "remove") {
            removeFromCart(productId);
        }
    });

    clearButton.addEventListener("click", () => {
        cart = {};
        persistAndRender();
    });

    function renderProducts() {
        const fragment = document.createDocumentFragment();
        PRODUCTS.forEach((product) => {
            const card = document.createElement("article");
            card.className = "product-card";
            card.innerHTML = `
                <img src="${product.image}" alt="${product.title}">
                <div>
                    <h4>${product.title}</h4>
                    <p class="price-tag">${formatCurrency(product.price)}</p>
                </div>
                <button data-product-id="${product.id}">Thêm vào giỏ</button>
            `;
            fragment.appendChild(card);
        });
        productList.appendChild(fragment);
    }

    function renderCart() {
        const entries = Object.entries(cart);
        if (!entries.length) {
            cartList.innerHTML = `<li class="cart-empty">Giỏ hàng đang trống.</li>`;
            totalEl.textContent = formatCurrency(0);
            return;
        }

        const fragment = document.createDocumentFragment();
        let total = 0;

        entries.forEach(([id, item]) => {
            const product = PRODUCTS.find((p) => p.id === id);
            if (!product) return;
            const subtotal = product.price * item.quantity;
            total += subtotal;

            const li = document.createElement("li");
            li.className = "cart-item";
            li.innerHTML = `
                <span>${product.title} × ${item.quantity}</span>
                <span>
                    <button class="secondary" data-action="decrement" data-product-id="${id}">-</button>
                    <button class="secondary" data-action="increment" data-product-id="${id}">+</button>
                    <button class="accent" data-action="remove" data-product-id="${id}">Xóa</button>
                </span>
                <strong>${formatCurrency(subtotal)}</strong>
            `;
            fragment.appendChild(li);
        });

        cartList.innerHTML = "";
        cartList.appendChild(fragment);
        totalEl.textContent = formatCurrency(total);
    }

    function addToCart(productId) {
        if (!cart[productId]) {
            cart[productId] = { quantity: 0 };
        }
        cart[productId].quantity += 1;
        persistAndRender();
    }

    function updateCartItem(productId, delta) {
        if (!cart[productId]) return;
        cart[productId].quantity += delta;
        if (cart[productId].quantity <= 0) {
            delete cart[productId];
        }
        persistAndRender();
    }

    function removeFromCart(productId) {
        delete cart[productId];
        persistAndRender();
    }

    function loadCart() {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            return saved ? JSON.parse(saved) : {};
        } catch (error) {
            console.error("Không thể đọc giỏ hàng từ LocalStorage:", error);
            return {};
        }
    }

    function persistAndRender() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
        renderCart();
    }
}

function formatCurrency(value) {
    return new Intl.NumberFormat("vi-VN", {
        style: "currency",
        currency: "VND",
        maximumFractionDigits: 0
    }).format(value);
}
