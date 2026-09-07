import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
    // حماية الـ API بكلمة مرور حتى لا يرسل أحد غيرك إشعارات
    const { admin_password, message, button_text, button_url } = req.body;

    if (admin_password !== '123456789') { // 🔴 غير كلمة المرور هذه برقم سري خاص بك
        return res.status(401).json({ error: 'غير مصرح لك' });
    }

    // الاتصال بقاعدة البيانات
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
    const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN; // توكن البوت من BotFather

    // جلب جميع المستخدمين من قاعدة البيانات
    const { data: users, error } = await supabase.from('users').select('id');
    if (error) return res.status(500).json({ error: error.message });

    let successCount = 0;

    // تجهيز الزر الشفاف (إذا تم إرسال رابط)
    let reply_markup = {};
    if (button_text && button_url) {
        reply_markup = {
            inline_keyboard: [[
                { text: button_text, url: button_url }
            ]]
        };
    }

    // إرسال الرسالة لكل مستخدم
    for (const user of users) {
        try {
            await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: user.id,
                    text: message,
                    reply_markup: Object.keys(reply_markup ).length > 0 ? reply_markup : undefined
                })
            });
            successCount++;
            
            // تأخير بسيط لتجنب حظر تليجرام (تليجرام يسمح بـ 30 رسالة في الثانية)
            await new Promise(resolve => setTimeout(resolve, 50));
        } catch (err) {
            console.error(`فشل الإرسال للمستخدم ${user.id}`);
        }
    }

    res.status(200).json({ success: true, sent_to: successCount });
}
