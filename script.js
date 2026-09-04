/* ==========================================
   1. إعدادات قاعدة البيانات (أسعار الأجهزة)
   ========================================== */
const MINERS_DB = {
    0: { id: 0, name: "Free Node", cost: 0, monthly: 1, capacityHours: 1, img: "images/miner0.png" },
    1: { id: 1, name: "Node V1", cost: 8, monthly: 10, capacityHours: 5, img: "images/miner1.png" },
    2: { id: 2, name: "Server Cluster", cost: 20, monthly: 30, capacityHours: 5, img: "images/miner2.png" },
    3: { id: 3, name: "ASIC Pro", cost: 50, monthly: 100, capacityHours: 5, img: "images/miner3.png" },
    4: { id: 4, name: "Whale Farm", cost: 150, monthly: 500, capacityHours: 5, img: "images/miner4.png" }
};

/* ==========================================
   2. بيانات اللاعب والحفظ
   ========================================== */
let player = {
    balance: 0,
    lastCollectTime: Date.now( ),
    miners: [0] // يبدأ بالجهاز المجاني
};

// استرجاع البيانات المحفوظة
const savedData = localStorage.getItem('btc_miner_pro');
if (savedData) {
    player = JSON.parse(savedData);
}

let totalHourlyRate = 0;
let maxCapacityBTC = 0;

/* ==========================================
   3. دوال الواجهة (تحديث الشاشة)
   ========================================== */
function renderGrid() {
    const grid = document.getElementById('miners-grid');
    grid.innerHTML = '';
    
    player.miners.forEach(minerId => {
        const miner = MINERS_DB[minerId];
        grid.innerHTML += `
            <div class="grid-slot bg-orange-500/10 border-orange-500/30 border-solid">
                <img src="${miner.img}" class="w-10 h-10 drop-shadow-lg">
            </div>
        `;
    });

    const emptySlots = Math.max(0, 6 - player.miners.length);
    for(let i=0; i<emptySlots; i++) {
        grid.innerHTML += `<div class="grid-slot"></div>`;
    }
}

function renderShop() {
    const shop = document.getElementById('shop-container');
    shop.innerHTML = '';

    for(let i=1; i<=4; i++) {
        const miner = MINERS_DB[i];
        const isOwned = player.miners.includes(i);
        const dailyIncome = (miner.monthly / 30).toFixed(2);
        const dailyPercent = Math.round((miner.monthly / miner.cost / 30) * 100);

        if (isOwned) {
            shop.innerHTML += `
                <div class="btc-card p-4 text-center relative opacity-60">
                    <p class="text-gray-400 text-[10px] font-bold uppercase">الدخل الشهري</p>
                    <p class="text-btc font-bold text-xl mt-1">₿ ${miner.monthly}</p>
                    <img src="${miner.img}" class="w-16 h-16 mx-auto my-3 grayscale">
                    <div class="absolute inset-0 flex items-center justify-center z-10">
                        <div class="bg-black/80 text-btc font-bold px-4 py-1 rounded-full border border-orange-500/50 transform -rotate-12">
                            مكتمل ✓
                        </div>
                    </div>
                    <div class="flex justify-between text-[10px] text-gray-400 mt-3 bg-black/30 p-2 rounded">
                        <span>${dailyPercent}% يومي</span>
                        <span class="text-white">₿ ${dailyIncome}</span>
                    </div>
                </div>
            `;
        } else {
            shop.innerHTML += `
                <div class="btc-card p-4 text-center">
                    <p class="text-gray-400 text-[10px] font-bold uppercase">الدخل الشهري</p>
                    <p class="text-btc font-bold text-xl mt-1">₿ ${miner.monthly}</p>
                    <img src="${miner.img}" class="w-16 h-16 mx-auto my-3 drop-shadow-[0_0_10px_rgba(247,147,26,0.2)]">
                    <div class="flex justify-between text-[10px] text-gray-400 mt-3 bg-black/30 p-2 rounded mb-3">
                        <span>${dailyPercent}% يومي</span>
                        <span class="text-white">₿ ${dailyIncome}</span>
                    </div>
                    <button onclick="buyMiner(${i})" class="w-full bg-white text-black hover:bg-gray-200 font-bold py-2 rounded-lg text-sm transition">
                        شراء بـ ${miner.cost} ₿
                    </button>
                </div>
            `;
        }
    }
}

/* ==========================================
   4. المنطق البرمجي (الحسابات والأزرار)
   ========================================== */
function calculateStats() {
    totalHourlyRate = 0;
    maxCapacityBTC = 0;
    let maxHours = 1;

    player.miners.forEach(minerId => {
        const miner = MINERS_DB[minerId];
        const hourly = miner.monthly / 720;
        totalHourlyRate += hourly;
        maxCapacityBTC += (hourly * miner.capacityHours);
        if (miner.capacityHours > maxHours) maxHours = miner.capacityHours;
    });

    document.getElementById('rate-hourly').innerText = totalHourlyRate.toFixed(4);
    document.getElementById('rate-daily').innerText = (totalHourlyRate * 24).toFixed(3);
    document.getElementById('rate-monthly').innerText = (totalHourlyRate * 720).toFixed(2);
    document.getElementById('storage-text').innerText = `سعة التخزين: ${maxHours} ساعات`;
    
    renderGrid();
    renderShop();
}

function gameLoop() {
    const now = Date.now();
    const elapsedHours = (now - player.lastCollectTime) / (1000 * 60 * 60);

    let pending = elapsedHours * totalHourlyRate;
    let isFull = false;

    if (pending >= maxCapacityBTC) {
        pending = maxCapacityBTC;
        isFull = true;
    }

    document.getElementById('main-balance').innerText = player.balance.toFixed(4);
    document.getElementById('pending-balance').innerText = pending.toFixed(6);

    const progressPercent = (pending / maxCapacityBTC) * 100;
    const fillElement = document.getElementById('progress-fill');
    const textElement = document.getElementById('progress-text');
    const warningElement = document.getElementById('storage-warning');

    fillElement.style.width = `${progressPercent}%`;
    textElement.innerText = `${Math.floor(progressPercent)}%`;

    if (isFull) {
        fillElement.classList.add('progress-full');
        textElement.classList.replace('text-btc', 'text-red-500');
        warningElement.innerText = "مكتمل! يرجى الجمع";
        warningElement.classList.replace('text-gray-500', 'text-red-500');
    } else {
        fillElement.classList.remove('progress-full');
        textElement.classList.replace('text-red-500', 'text-btc');
        warningElement.innerText = "يستمر التعدين حتى يمتلئ الخزان";
        warningElement.classList.replace('text-red-500', 'text-gray-500');
    }
}

// ربط زر الجمع
document.getElementById('btn-collect').addEventListener('click', () => {
    const now = Date.now();
    const elapsedHours = (now - player.lastCollectTime) / (1000 * 60 * 60);
    let pending = elapsedHours * totalHourlyRate;
    
    if (pending >= maxCapacityBTC) pending = maxCapacityBTC;

    if (pending > 0.000001) {
        player.balance += pending;
        player.lastCollectTime = now;
        localStorage.setItem('btc_miner_pro', JSON.stringify(player));
        gameLoop();
        
        if (window.Telegram && window.Telegram.WebApp.HapticFeedback) {
            window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
        }
    }
});

// دالة الشراء
function buyMiner(minerId) {
    const miner = MINERS_DB[minerId];
    if (player.balance >= miner.cost) {
        player.balance -= miner.cost;
        player.miners.push(minerId);
        
        // جمع الأرباح المعلقة قبل الشراء
        document.getElementById('btn-collect').click(); 
        
        calculateStats();
        localStorage.setItem('btc_miner_pro', JSON.stringify(player));
    } else {
        alert(`رصيدك غير كافٍ! تحتاج إلى ₿ ${miner.cost}`);
    }
}

// تهيئة التطبيق
calculateStats();
setInterval(gameLoop, 1000);
gameLoop();
