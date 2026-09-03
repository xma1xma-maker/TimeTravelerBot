// تهيئة تطبيق تليجرام
const tg = window.Telegram.WebApp;
tg.expand(); // جعل التطبيق يملأ الشاشة
tg.ready();

// دالة التنقل بين الأقسام
function switchTab(tabName) {
    // إخفاء كل الأقسام
    document.querySelectorAll('.page-section').forEach(section => {
        section.classList.add('hidden');
    });
    
    // إزالة التفعيل من كل أزرار التنقل
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });

    // إظهار القسم المطلوب
    document.getElementById(`${tabName}-section`).classList.remove('hidden');
    
    // تفعيل الزر المطلوب (بناءً على الترتيب)
    const navItems = document.querySelectorAll('.nav-item');
    if(tabName === 'home') navItems[0].classList.add('active');
    if(tabName === 'shop') navItems[1].classList.add('active');
    if(tabName === 'tasks') navItems[2].classList.add('active');
}
