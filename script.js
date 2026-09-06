/* ==========================================
   1. إعدادات Supabase وتليجرام
   ========================================== */
const SUPABASE_URL = 'https://tgpwdfegzdicypqfpjym.supabase.co'; 
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRncHdkZmVnemRpY3lwcWZwanltIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg1MjMzODMsImV4cCI6MjEwNDA5OTM4M30.wFodcxwYL4KbiR09__Esi6C8du0nB5R54oIio8gdvMk'; 
const BOT_USERNAME = 'BitPMinerbot'; 
const SUPPORT_USERNAME = 'YOUR_SUPPORT_USERNAME'; // 🔴 ضع يوزر حساب الدعم الفني هنا (بدون @ )

const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const tg = window.Telegram.WebApp;
tg.expand();
const tgUser = tg.initDataUnsafe?.user;
const USER_ID = tgUser ? tgUser.id : 123456789; 
const USER_NAME = tgUser ? tgUser.first_name : 'المعدن'; 
const START_PARAM = tg.initDataUnsafe?.start_param; 

/* ==========================================
   2. إعدادات قاعدة البيانات
   ========================================== */
const MINERS_DB = {
    0: { id: 0, name: "Free Node", cost: 0, monthly: 1, capacityHours: 1, img: "https://tgpwdfegzdicypqfpjym.supabase.co/storage/v1/object/public/tofe/miner0.png" },
    1: { id: 1, name: "Node V1", cost: 8, monthly: 10, capacityHours: 5, img: "https://tgpwdfegzdicypqfpjym.supabase.co/storage/v1/object/public/tofe/miner1.png" },
    2: { id: 2, name: "Server Cluster", cost: 20, monthly: 30, capacityHours: 5, img: "https://tgpwdfegzdicypqfpjym.supabase.co/storage/v1/object/public/tofe/miner2.png" },
    3: { id: 3, name: "ASIC Pro", cost: 50, monthly: 100, capacityHours: 5, img: "https://tgpwdfegzdicypqfpjym.supabase.co/storage/v1/object/public/tofe/miner3.png" },
    4: { id: 4, name: "Whale Farm", cost: 150, monthly: 500, capacityHours: 5, img: "https://tgpwdfegzdicypqfpjym.supabase.co/storage/v1/object/public/tofe/miner4.png" }
};

let TASKS_DB = [];

let player = {
    balance: 0,
    lastCollectTime: Date.now( ),
    lastDailyBonus: 0,
    lastBoxTime: 0, // 🟢 وقت آخر صندوق
    streakDays: 0,
    miners: [0],
    completedTasks: [],
    referralsCount: 0,
    referralEarnings: 0
};

let totalHourlyRate = 0;
let maxCapacityBTC = 0;

/* ==========================================
   3. التحميل المسبق للصور
   ========================================== */
function preloadImages() {
    Object.values(MINERS_DB).forEach(miner => {
        const img = new Image();
        img.src = miner.img;
    });
}
preloadImages(); 

/* ==========================================
   4. دوال الاتصال بقاعدة البيانات
   ========================================== */
async function loadUserData() {
    try {
        const { data: tasksData } = await db.from('tasks').select('*');
        if (tasksData) {
            TASKS_DB = tasksData;
            TASKS_DB.forEach(task => {
                if (task.icon && (task.icon.startsWith('http' ) || task.icon.startsWith('images/'))) {
                    const img = new Image();
                    img.src = task.icon;
                }
            });
        }

        const { data, error } = await db.from('users').select('*').eq('id', USER_ID).single();

        if (data) {
            player.balance = data.balance;
            player.lastCollectTime = data.last_collect_time;
            player.lastDailyBonus = data.last_daily_bonus || 0;
            player.lastBoxTime = data.last_box_time || 0; // 🟢 تحميل وقت الصندوق
            player.streakDays = data.streak_days || 0;
            player.miners = data.miners;
            player.completedTasks = data.completed_tasks || [];
            player.referralsCount = data.referrals_count || 0;
            player.referralEarnings = data.referral_earnings || 0;
            
            saveUserData(); 
        } else {
            player.lastCollectTime = Date.now();
            let inviterId = null;
            
            if (START_PARAM && START_PARAM != USER_ID) {
                inviterId = parseInt(START_PARAM);
                await rewardInviter(inviterId);
            }

            await db.from('users').insert([{
                id: USER_ID,
                first_name: USER_NAME, 
                balance: player.balance,
                miners: player.miners,
                last_collect_time: player.lastCollectTime,
                last_daily_bonus: player.lastDailyBonus,
                last_box_time: player.lastBoxTime, // 🟢 حفظ وقت الصندوق
                streak_days: player.streakDays,
                completed_tasks: player.completedTasks,
                referred_by: inviterId
            }]);
        }

        document.getElementById('invite-link').innerText = `https://t.me/${BOT_USERNAME}/app?startapp=${USER_ID}`;
        document.getElementById('ref-count' ).innerText = player.referralsCount;
        document.getElementById('ref-earnings').innerText = player.referralEarnings.toFixed(2);

        calculateStats();
        setInterval(gameLoop, 1000);
        gameLoop();
    } catch (err) {
        console.error("خطأ في تحميل البيانات:", err);
    }
}

async function rewardInviter(inviterId) {
    const rewardAmount = 0.10; 
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
        first_name: USER_NAME, 
        balance: player.balance,
        miners: player.miners,
        last_collect_time: player.lastCollectTime,
        last_daily_bonus: player.lastDailyBonus,
        last_box_time: player.lastBoxTime, // 🟢 تحديث وقت الصندوق
        streak_days: player.streakDays,
        completed_tasks: player.completedTasks
    }).eq('id', USER_ID);
}

/* ==========================================
   5. دوال الواجهة (تحديث الشاشة)
   ========================================== */
function renderGrid() {
    const grid = document.getElementById('miners-grid');
    grid.innerHTML = '';
    player.miners.forEach(minerId => {
        const miner = MINERS_DB[minerId];
        grid.innerHTML += `<div class="grid-slot"><img src="${miner.img}" class="w-10 h-10 drop-shadow-lg"></div>`;
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

        if (isOwned) {
            shop.innerHTML += `
                <div class="btc-card p-4 text-center relative opacity-60">
                    <p class="text-gray-400 text-[10px] font-bold uppercase">الدخل الشهري</p>
                    <p class="text-btc font-bold text-xl mt-1">$ ${miner.monthly}</p>
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
                    <p class="text-btc font-bold text-xl mt-1">$ ${miner.monthly}</p>
                    <img src="${miner.img}" class="w-16 h-16 mx-auto my-3 drop-shadow-[0_0_10px_rgba(247,147,26,0.2)]">
                    <button onclick="buyMiner(${i})" class="w-full bg-white text-black hover:bg-gray-200 font-bold py-2 rounded-lg text-sm transition">شراء بـ ${miner.cost} $</button>
                </div>
            `;
        }
    }
}

let activeTasks = {};

function renderTasks() {
    const container = document.getElementById('tasks-container');
    container.innerHTML = '';
    TASKS_DB.forEach(task => {
        const isCompleted = player.completedTasks.includes(task.id);
        
        let iconHtml = '';
        if (task.icon && (task.icon.startsWith('http' ) || task.icon.startsWith('images/'))) {
            iconHtml = `<img src="${task.icon}" class="w-8 h-8 object-contain drop-shadow-md">`;
        } else {
            iconHtml = task.icon || '🎯';
        }

        const noteHtml = task.note ? `<p class="text-[10px] text-gray-400 mt-1">📌 ${task.note}</p>` : '';

        container.innerHTML += `
            <div class="btc-card p-3 mb-3">
                <div class="flex items-center gap-3">
                    <div class="w-12 h-12 bg-gray-800 rounded-xl border border-gray-700 flex items-center justify-center text-2xl">
                        ${iconHtml}
                    </div>
                    <div class="flex-1">
                        <h4 class="font-bold text-sm text-white">${task.title}</h4>
                        <p class="text-xs text-btc font-bold mt-1">+ $ ${task.reward}</p>
                        ${noteHtml}
                    </div>
                    <div>
                        ${isCompleted 
                            ? `<button class="btn-task completed">مكتمل ✓</button>`
                            : `<button onclick="startTask(${task.id}, '${task.type}', '${task.target}', ${task.req_time})" id="btn-task-${task.id}" class="btn-task">اذهب</button>`
                        }
                    </div>
                </div>
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

    document.getElementById('main-balance').innerText = player.balance.toFixed(2);
    document.getElementById('pending-balance').innerText = pending.toFixed(4);

    const progressPercent = (pending / maxCapacityBTC) * 100;
    document.getElementById('progress-fill').style.width = `${progressPercent}%`;
    document.getElementById('progress-text').innerText = `${Math.floor(progressPercent)}%`;
}

/* ==========================================
   6. التفاعلات (الإحالات، المهام، الشراء)
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
    const text = "انضم إلي في التعدين واربح الدولارات مجاناً! 🚀💰";
    const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(link )}&text=${encodeURIComponent(text)}`;
    
    if (window.Telegram && window.Telegram.WebApp) {
        window.Telegram.WebApp.openTelegramLink(shareUrl);
    } else {
        window.open(shareUrl, '_blank');
    }
}

async function startTask(taskId, type, target, reqTime) {
    const btn = document.getElementById(`btn-task-${taskId}`);

    if (!activeTasks[taskId]) {
        if (window.Telegram && window.Telegram.WebApp) window.Telegram.WebApp.openLink(target);
        else window.open(target, '_blank');
        
        activeTasks[taskId] = Date.now();
        btn.innerText = "تحقق";
        btn.style.backgroundColor = "#facc15";
        return;
    }

    btn.innerText = "جاري التحقق... ⏳";
    btn.disabled = true;

    const task = TASKS_DB.find(t => t.id === taskId);

    if (type === 'telegram') {
        try {
            const res = await fetch('/api/checkSub', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: USER_ID, channel: target })
            });
            const data = await res.json();
            
            if (data.isSubscribed) {
                completeTask(task);
            } else {
                alert("عذراً، أنت لم تشترك في القناة بعد! ❌");
                btn.innerText = "تحقق";
                btn.disabled = false;
            }
        } catch (e) {
            alert("حدث خطأ في الاتصال بالخادم ⚠️");
            btn.innerText = "تحقق";
            btn.disabled = false;
        }
    } else {
        const elapsedSeconds = (Date.now() - activeTasks[taskId]) / 1000;
        if (elapsedSeconds >= reqTime) {
            completeTask(task);
        } else {
            const remaining = Math.ceil(reqTime - elapsedSeconds);
            alert(`يجب البقاء في الموقع للمدة المحددة. يرجى الانتظار ${remaining} ثانية إضافية ⏳`);
            btn.innerText = "تحقق";
            btn.disabled = false;
        }
    }
}

function completeTask(task) {
    player.balance += task.reward;
    player.completedTasks.push(task.id);
    saveUserData();
    gameLoop();
    renderTasks();
    alert(`تم التحقق بنجاح! حصلت على $ ${task.reward} 🎉`);
}

document.getElementById('btn-collect').addEventListener('click', () => {
    const now = Date.now();
    const elapsedHours = (now - player.lastCollectTime) / (1000 * 60 * 60);
    let pending = elapsedHours * totalHourlyRate;
    if (pending >= maxCapacityBTC) pending = maxCapacityBTC;
    const MIN_COLLECT = 0.01; 

    if (pending >= MIN_COLLECT || pending >= maxCapacityBTC) {
        player.balance += pending;
        player.lastCollectTime = now;
        saveUserData();
        gameLoop();
    } else {
        alert(`عذراً! الحد الأدنى للجمع هو $ ${MIN_COLLECT}.`);
    }
});

document.getElementById('btn-daily-bonus').addEventListener('click', () => {
    const now = Date.now();
    const cooldown = 24 * 60 * 60 * 1000;
    const resetTime = 48 * 60 * 60 * 1000;
    const timeSinceLastBonus = now - player.lastDailyBonus;

    if (timeSinceLastBonus >= cooldown) {
        if (timeSinceLastBonus >= resetTime) {
            player.streakDays = 1;
        } else {
            player.streakDays += 1;
            if (player.streakDays > 7) player.streakDays = 7;
        }

        let reward = 0.01;
        if (player.streakDays === 1) reward = 0.01;
        else if (player.streakDays === 2) reward = 0.02;
        else if (player.streakDays === 3) reward = 0.03;
        else if (player.streakDays === 4) reward = 0.04;
        else if (player.streakDays === 5) reward = 0.05;
        else if (player.streakDays === 6) reward = 0.06;
        else if (player.streakDays >= 7) reward = 0.10;

        player.balance += reward;
        player.lastDailyBonus = now;
        saveUserData();
        gameLoop();
        
        alert(`🎉 مبروك! حصلت على مكافأة اليوم ${player.streakDays}\nقيمة المكافأة: $ ${reward.toFixed(2)}\n\nعد غداً لزيادة مكافأتك!`);
    } else {
        const timeLeft = cooldown - timeSinceLastBonus;
        const hoursLeft = Math.floor(timeLeft / (1000 * 60 * 60));
        const minutesLeft = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
        alert(`⏳ لقد حصلت على مكافأتك اليوم.\nعد بعد ${hoursLeft} ساعة و ${minutesLeft} دقيقة.`);
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
        alert(`رصيدك غير كافٍ! تحتاج إلى $ ${miner.cost}`);
    }
}

/* ==========================================
   7. نظام السحب الجديد (50$ + 20 إحالة)
   ========================================== */
function handleWithdrawClick() {
    const modal = document.getElementById('withdraw-modal');
    const content = document.getElementById('withdraw-content');
    
    modal.classList.remove('hidden');
    
    if (player.balance < 50) {
        const remaining = (50 - player.balance).toFixed(2);
        content.innerHTML = `
            <div class="text-center">
                <div class="text-5xl mb-3">⚠️</div>
                <p class="text-gray-300 text-sm mb-4">عذراً، الحد الأدنى للسحب هو 50$.</p>
                <div class="bg-gray-900 p-3 rounded-lg border border-gray-700 mb-4">
                    <p class="text-xs text-gray-400">رصيدك الحالي: <span class="text-white font-bold text-lg">$ ${player.balance.toFixed(2)}</span></p>
                    <p class="text-xs text-red-400 mt-1">تحتاج إلى $ ${remaining} إضافية</p>
                </div>
                <button onclick="closeWithdrawModal()" class="w-full bg-gray-700 text-white font-bold py-3 rounded-lg transition shadow-lg">
                    حسناً، سأكمل التعدين ⛏️
                </button>
            </div>
        `;
    } 
    else if (player.referralsCount < 20) {
        const remaining = 20 - player.referralsCount;
        content.innerHTML = `
            <div class="text-center">
                <div class="text-5xl mb-3">👥</div>
                <p class="text-gray-300 text-sm mb-4">لقد وصلت للحد الأدنى! لكن يجب عليك دعوة 20 شخصاً على الأقل لتتمكن من السحب.</p>
                <div class="bg-gray-900 p-3 rounded-lg border border-gray-700 mb-4">
                    <p class="text-xs text-gray-400">دعواتك الحالية: <span class="text-white font-bold text-lg">${player.referralsCount}</span> / 20</p>
                    <p class="text-xs text-red-400 mt-1">متبقي لك ${remaining} دعوات</p>
                </div>
                <button onclick="closeWithdrawModal(); switchView('referrals', document.getElementById('nav-friends'))" class="w-full bg-btc text-black font-bold py-3 rounded-lg transition shadow-lg">
                    اذهب لدعوة الأصدقاء 🚀
                </button>
            </div>
        `;
    } 
    else {
        content.innerHTML = `
            <div class="text-center">
                <div class="text-5xl mb-3">🎉</div>
                <p class="text-green-400 font-bold text-lg mb-2">تهانينا! لقد أكملت جميع الشروط.</p>
                <p class="text-gray-300 text-sm mb-4">رصيدك الحالي هو: <span class="text-btc font-bold">$ ${player.balance.toFixed(2)}</span></p>
                <p class="text-xs text-gray-400 mb-4">يرجى مراسلة الدعم الفني وتزويدهم بعنوان محفظتك (USDT TRC20) لإرسال الأرباح إليك.</p>
                <button onclick="window.open('https://t.me/${SUPPORT_USERNAME}', '_blank' )" class="w-full bg-blue-600 text-white font-bold py-3 rounded-lg transition shadow-lg">
                    مراسلة الدعم الفني 💬
                </button>
            </div>
        `;
    }
}

function closeWithdrawModal() {
    document.getElementById('withdraw-modal').classList.add('hidden');
}

/* ==========================================
   8. نظام صناديق الحظ 🎁 🟢
   ========================================== */
function openBoxModal() {
    document.getElementById('box-modal').classList.remove('hidden');
    resetBoxes();
    checkBoxCooldown();
}

function closeBoxModal() {
    document.getElementById('box-modal').classList.add('hidden');
}

function resetBoxes() {
    const boxes = document.querySelectorAll('.box-item');
    boxes.forEach(box => {
        box.innerText = '📦';
        box.style.pointerEvents = 'auto';
        box.style.opacity = '1';
    });
    document.getElementById('box-result').innerText = '';
}

function checkBoxCooldown() {
    const now = Date.now();
    const cooldown = 10 * 60 * 60 * 1000; // 10 ساعات
    const timeSinceLastBox = now - player.lastBoxTime;
    const timerElement = document.getElementById('box-timer');
    const boxes = document.querySelectorAll('.box-item');

    if (timeSinceLastBox < cooldown) {
        const timeLeft = cooldown - timeSinceLastBox;
        const hoursLeft = Math.floor(timeLeft / (1000 * 60 * 60));
        const minutesLeft = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
        
        timerElement.innerText = `⏳ الصناديق تتجدد بعد ${hoursLeft} ساعة و ${minutesLeft} دقيقة`;
        timerElement.classList.remove('hidden');
        
        boxes.forEach(box => {
            box.style.pointerEvents = 'none';
            box.style.opacity = '0.5';
        });
    } else {
        timerElement.classList.add('hidden');
    }
}

function openBox(selectedIndex) {
    const boxes = document.querySelectorAll('.box-item');
    const resultElement = document.getElementById('box-result');
    
    boxes.forEach(box => box.style.pointerEvents = 'none');

    const isWin = Math.random() > 0.3; // نسبة الفوز 70%
    
    if (isWin) {
        const reward = (Math.random() * (0.1 - 0.001) + 0.001);
        boxes[selectedIndex].innerText = '💎';
        resultElement.innerHTML = `<span class="text-green-400">مبروك! ربحت $ ${reward.toFixed(3)}</span>`;
        
        player.balance += reward;
    } else {
        boxes[selectedIndex].innerText = '💨';
        resultElement.innerHTML = `<span class="text-gray-400">حظ أوفر! الصندوق فارغ.</span>`;
    }

    boxes.forEach((box, index) => {
        if (index !== selectedIndex) {
            box.innerText = Math.random() > 0.5 ? '💎' : '💨';
            box.style.opacity = '0.5';
        }
    });

    player.lastBoxTime = Date.now();
    saveUserData();
    gameLoop();
    
    setTimeout(checkBoxCooldown, 3000);
}

// 🚀 تشغيل التطبيق
loadUserData();
