/* ==========================================
   1. إعدادات Supabase وتليجرام
   ========================================== */
const SUPABASE_URL = 'https://tgpwdfegzdicypqfpjym.supabase.co'; // 🔴 ضع رابط Supabase هنا
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRncHdkZmVnemRpY3lwcWZwanltIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg1MjMzODMsImV4cCI6MjEwNDA5OTM4M30.wFodcxwYL4KbiR09__Esi6C8du0nB5R54oIio8gdvMk'; // 🔴 ضع مفتاح Supabase هنا
const BOT_USERNAME = 'BitPMinerbot'; // ✅ تم إضافة يوزر بوتك هنا

const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const tg = window.Telegram.WebApp;
tg.expand();
const tgUser = tg.initDataUnsafe?.user;
const USER_ID = tgUser ? tgUser.id : 123456789; 
const START_PARAM = tg.initDataUnsafe?.start_param; 

/* ==========================================
   2. إعدادات قاعدة البيانات (الصور تم تحديثها لروابط خارجية)
   ========================================== */
const MINERS_DB = {
    0: { id: 0, name: "Free Node", cost: 0, monthly: 1, capacityHours: 1, img: "https://cdn-icons-png.flaticon.com/512/1198/1198367.png" },
    1: { id: 1, name: "Node V1", cost: 8, monthly: 10, capacityHours: 5, img: "https://cdn-icons-png.flaticon.com/512/2910/2910008.png" },
    2: { id: 2, name: "Server Cluster", cost: 20, monthly: 30, capacityHours: 5, img: "https://cdn-icons-png.flaticon.com/512/1440/1440693.png" },
    3: { id: 3, name: "ASIC Pro", cost: 50, monthly: 100, capacityHours: 5, img: "https://cdn-icons-png.flaticon.com/512/2094/2094308.png" },
    4: { id: 4, name: "Whale Farm", cost: 150, monthly: 500, capacityHours: 5, img: "https://cdn-icons-png.flaticon.com/512/3260/3260867.png" }
};

// سيتم جلب المهام من Supabase بدلاً من كتابتها هنا
let TASKS_DB = [];

let player = {
    balance: 0,
    lastCollectTime: Date.now( ),
    lastDailyBonus: 0,
    miners: [0],
    completedTasks: [],
    referralsCount: 0,
    referralEarnings: 0
};

let totalHourlyRate = 0;
let maxCapacityBTC = 0;

/* ==========================================
   3. دوال الاتصال بقاعدة البيانات
   ========================================== */
async function loadUserData() {
    try {
        // 🟢 جلب المهام من Supabase أولاً
        const { data: tasksData } = await db.from('tasks').select('*');
        if (tasksData) {
            TASKS_DB = tasksData;
        }

        // 🟢 جلب بيانات المستخدم
        const { data, error } = await db.from('users').select('*').eq('id', USER_ID).single();

        if (data) {
            player.balance = data.balance;
            player.lastCollectTime = data.last_collect_time;
            player.lastDailyBonus = data.last_daily_bonus;
            player.miners = data.miners;
            player.completedTasks = data.completed_tasks || [];
            player.referralsCount = data.referrals_count || 0;
            player.referralEarnings = data.referral_earnings || 0;
        } else {
            player.lastCollectTime = Date.now();
            let inviterId = null;
            
            if (START_PARAM && START_PARAM != USER_ID) {
                inviterId = parseInt(START_PARAM);
                await rewardInviter(inviterId);
            }

            await db.from('users').insert([{
                id: USER_ID,
                balance: player.balance,
                miners: player.miners,
                last_collect_time: player.lastCollectTime,
                last_daily_bonus: player.lastDailyBonus,
                completed_tasks: player.completedTasks,
                referred_by: inviterId
            }]);
        }

        document.getElementById('invite-link').innerText = `https://t.me/${BOT_USERNAME}?start=${USER_ID}`;
        document.getElementById('ref-count' ).innerText = player.referralsCount;
        document.getElementById('ref-earnings').innerText = player.referralEarnings.toFixed(4);

        calculateStats();
        setInterval(gameLoop, 1000);
        gameLoop();
    } catch (err) {
        console.error("خطأ في تحميل البيانات:", err);
    }
}

async function rewardInviter(inviterId) {
    const rewardAmount = 0.001; 
    const { data: inviter } = await db.from('users').select('balance, referrals_count, referral_earnings').eq('id', inviterId).single();
    
    if (inviter) {
        await db.from('users').update({
            balance: inviter.balance + rewardAmount,
            referrals_count: (inviter.referrals_count || 0) + 1,
            referral_earnings: (inviter.referral_earnings || 0) + rewardAmount
        }).eq('id', inviterId);
    }
}

async function saveUserData() {
    await db.from('users').update({
        balance: player.balance,
        miners: player.miners,
        last_collect_time: player.lastCollectTime,
        last_daily_bonus: player.lastDailyBonus,
        completed_tasks: player.completedTasks
    }).eq('id', USER_ID);
}

/* ==========================================
   4. دوال الواجهة (تحديث الشاشة)
   ========================================== */
function renderGrid() {
    const grid = document.getElementById('miners-grid');
    grid.innerHTML = '';
    player.miners.forEach(minerId => {
        const miner = MINERS_DB[minerId];
        grid.innerHTML += `<div class="grid-slot bg-orange-500/10 border-orange-500/30 border-solid"><img src="${miner.img}" class="w-10 h-10 drop-shadow-lg"></div>`;
    });
    const emptySlots = Math.max(0, 6 - player.miners.length);
    for(let i=0; i<emptySlots; i++) grid.innerHTML += `<div class="grid-slot"></div>`;
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
                        <div class="bg-black/80 text-btc font-bold px-4 py-1 rounded-full border border-orange-500/50 transform -rotate-12">مكتمل ✓</div>
                    </div>
                </div>
            `;
        } else {
            shop.innerHTML += `
                <div class="btc-card p-4 text-center">
                    <p class="text-gray-400 text-[10px] font-bold uppercase">الدخل الشهري</p>
                    <p class="text-btc font-bold text-xl mt-1">₿ ${miner.monthly}</p>
                    <img src="${miner.img}" class="w-16 h-16 mx-auto my-3 drop-shadow-[0_0_10px_rgba(247,147,26,0.2)]">
                    <button onclick="buyMiner(${i})" class="w-full bg-white text-black hover:bg-gray-200 font-bold py-2 rounded-lg text-sm transition">شراء بـ ${miner.cost} ₿</button>
                </div>
            `;
        }
    }
}

function renderTasks() {
    const container = document.getElementById('tasks-container');
    container.innerHTML = '';
    TASKS_DB.forEach(task => {
        const isCompleted = player.completedTasks.includes(task.id);
        container.innerHTML += `
            <div class="task-card">
                <div class="flex items-center gap-3">
                    <div class="text-2xl bg-black/30 p-2 rounded-xl border border-gray-700">${task.icon}</div>
                    <div>
                        <h4 class="font-bold text-sm text-white">${task.title}</h4>
                        <p class="text-xs text-btc font-bold mt-1">+ ₿ ${task.reward}</p>
                    </div>
                </div>
                ${isCompleted 
                    ? `<button class="btn-task completed">مكتمل ✓</button>`
                    : `<button onclick="startTask(${task.id}, '${task.link}')" id="btn-task-${task.id}" class="btn-task">اذهب</button>`
                }
            </div>
        `;
    });
}

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
    renderTasks();
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
    document.getElementById('progress-fill').style.width = `${progressPercent}%`;
    document.getElementById('progress-text').innerText = `${Math.floor(progressPercent)}%`;
}

/* ==========================================
   5. التفاعلات (الإحالات، المهام، الشراء)
   ========================================== */
function switchView(viewId, navElement) {
    document.querySelectorAll('.view-section').forEach(el => el.classList.remove('active', 'hidden'));
    document.querySelectorAll('.view-section').forEach(el => el.classList.add('hidden'));
    document.getElementById(`view-${viewId}`).classList.remove('hidden');
    document.getElementById(`view-${viewId}`).classList.add('active');
    
    if(navElement) {
        document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
        navElement.classList.add('active');
    }
}

function copyInviteLink() {
    const link = document.getElementById('invite-link').innerText;
    navigator.clipboard.writeText(link);
    if (window.Telegram && window.Telegram.WebApp.HapticFeedback) {
        window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
    }
    alert("تم نسخ الرابط بنجاح! 📋");
}

function shareInviteLink() {
    const link = document.getElementById('invite-link').innerText;
    const text = "انضم إلي في تعدين البتكوين واربح العملات مجاناً! 🚀💰";
    const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(link )}&text=${encodeURIComponent(text)}`;
    
    if (window.Telegram && window.Telegram.WebApp) {
        window.Telegram.WebApp.openTelegramLink(shareUrl);
    } else {
        window.open(shareUrl, '_blank');
    }
}

function startTask(taskId, link) {
    if (window.Telegram && window.Telegram.WebApp) window.Telegram.WebApp.openLink(link);
    else window.open(link, '_blank');
    
    const btn = document.getElementById(`btn-task-${taskId}`);
    btn.innerText = "تحقق...";
    btn.style.backgroundColor = "#facc15";
    
    setTimeout(() => {
        const task = TASKS_DB.find(t => t.id === taskId);
        if(task) {
            player.balance += task.reward;
            player.completedTasks.push(taskId);
            saveUserData();
            gameLoop();
            renderTasks();
            alert(`تم التحقق! حصلت على ₿ ${task.reward}`);
        }
    }, 3000);
}

document.getElementById('btn-collect').addEventListener('click', () => {
    const now = Date.now();
    const elapsedHours = (now - player.lastCollectTime) / (1000 * 60 * 60);
    let pending = elapsedHours * totalHourlyRate;
    if (pending >= maxCapacityBTC) pending = maxCapacityBTC;
    const MIN_COLLECT = 0.0001; 

    if (pending >= MIN_COLLECT || pending >= maxCapacityBTC) {
        player.balance += pending;
        player.lastCollectTime = now;
        saveUserData();
        gameLoop();
    } else {
        alert(`عذراً! الحد الأدنى للجمع هو ${MIN_COLLECT} ₿.`);
    }
});

document.getElementById('btn-daily-bonus').addEventListener('click', () => {
    const now = Date.now();
    const cooldown = 24 * 60 * 60 * 1000;
    const timeSinceLastBonus = now - player.lastDailyBonus;

    if (timeSinceLastBonus >= cooldown) {
        player.balance += 0.0005;
        player.lastDailyBonus = now;
        saveUserData();
        gameLoop();
        alert(`مبروك! حصلت على مكافأة يومية ₿ 0.0005`);
    } else {
        const timeLeft = cooldown - timeSinceLastBonus;
        const hoursLeft = Math.floor(timeLeft / (1000 * 60 * 60));
        const minutesLeft = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
        alert(`عد بعد ${hoursLeft} ساعة و ${minutesLeft} دقيقة.`);
    }
});

function buyMiner(minerId) {
    const miner = MINERS_DB[minerId];
    if (player.balance >= miner.cost) {
        player.balance -= miner.cost;
        player.miners.push(minerId);
        document.getElementById('btn-collect').click(); 
        calculateStats();
        saveUserData();
    } else {
        alert(`رصيدك غير كافٍ! تحتاج إلى ₿ ${miner.cost}`);
    }
}

// 🚀 تشغيل التطبيق
loadUserData();
