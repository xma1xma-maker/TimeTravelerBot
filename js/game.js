// بيانات اللاعب الأساسية
let player = {
    balance: 0,
    hourlyIncome: 0
};

// بيانات المتجر (البوابات)
const shopItems = [
    { id: 1, name: "عصر الديناصورات", price: 100, income: 10, color: "text-orange-400" },
    { id: 2, name: "عصر الفراعنة", price: 500, income: 60, color: "text-yellow-400" },
    { id: 3, name: "عصر النهضة", price: 2000, income: 300, color: "text-purple-400" },
    { id: 4, name: "مدينة 3000", price: 10000, income: 2000, color: "text-cyan-400" }
];

// بيانات المهام
const tasks = [
    { id: 1, title: "انضم لقناة التليجرام", reward: 500, action: "انضمام" },
    { id: 2, title: "شاهد إعلان (عرض)", reward: 1500, action: "مشاهدة" },
    { id: 3, title: "حمل تطبيق شريك", reward: 5000, action: "تحميل" }
];

// تحديث الشاشة
function updateUI() {
    document.getElementById('balance-display').innerText = player.balance.toFixed(3);
    document.getElementById('hourly-rate').innerText = player.hourlyIncome;
    document.getElementById('second-rate').innerText = (player.hourlyIncome / 3600).toFixed(4);
}

// التجميع اليدوي (النقر)
function manualCollect() {
    player.balance += 1;
    updateUI();
    // يمكن إضافة اهتزاز خفيف للهاتف
    if (window.Telegram.WebApp.HapticFeedback) {
        window.Telegram.WebApp.HapticFeedback.impactOccurred('light');
    }
}

// التجميع التلقائي (كل ثانية)
setInterval(() => {
    if (player.hourlyIncome > 0) {
        player.balance += (player.hourlyIncome / 3600);
        updateUI();
    }
}, 1000);

// شراء بوابة
function buyItem(id) {
    const item = shopItems.find(i => i.id === id);
    if (player.balance >= item.price) {
        player.balance -= item.price;
        player.hourlyIncome += item.income;
        alert(`تم شراء ${item.name} بنجاح!`);
        updateUI();
    } else {
        alert("طاقة الكرونو غير كافية!");
    }
}

// إكمال مهمة
function completeTask(id, reward) {
    player.balance += reward;
    alert(`تم إنجاز المهمة! حصلت على ${reward} 💎`);
    updateUI();
}

// توليد عناصر المتجر في HTML
function renderShop() {
    const shopContainer = document.getElementById('shop-items');
    shopItems.forEach(item => {
        shopContainer.innerHTML += `
            <div class="bg-slate-800 p-4 rounded-xl border border-slate-600 text-center flex flex-col justify-between">
                <div>
                    <h4 class="text-sm font-bold ${item.color}">${item.name}</h4>
                    <p class="text-xs text-gray-400 mt-1">دخل: ${item.income} 💎/ساعة</p>
                </div>
                <button onclick="buyItem(${item.id})" class="mt-3 w-full bg-slate-700 hover:bg-slate-600 text-white text-sm py-2 rounded transition">
                    ${item.price} 💎
                </button>
            </div>
        `;
    });
}

// توليد المهام في HTML
function renderTasks() {
    const tasksContainer = document.getElementById('tasks-list');
    tasks.forEach(task => {
        tasksContainer.innerHTML += `
            <div class="bg-slate-800 p-4 rounded-xl border border-slate-600 flex justify-between items-center">
                <div>
                    <h4 class="font-bold text-sm">${task.title}</h4>
                    <p class="text-xs text-green-400 mt-1">+${task.reward} 💎</p>
                </div>
                <button onclick="completeTask(${task.id}, ${task.reward})" class="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-lg text-sm font-bold transition">
                    ${task.action}
                </button>
            </div>
        `;
    });
}

// تشغيل الدوال عند تحميل الصفحة
window.onload = () => {
    renderShop();
    renderTasks();
    updateUI();
};
