export default async function handler(req, res) {
    // الرد السريع على الطلبات غير الصالحة
    if (req.method !== 'POST') {
        return res.status(200).send('OK');
    }

    const update = req.body;

    // التأكد من أن التحديث يحتوي على رسالة نصية
    if (update.message && update.message.text) {
        const chatId = update.message.chat.id;
        const text = update.message.text;
        const firstName = update.message.from.first_name || 'المعدن';

        // إذا كانت الرسالة هي /start
        if (text.startsWith('/start')) {
            const welcomeMessage = `مرحباً بك يا ${firstName} في Miner Pro! 🚀\n\nأفضل منصة لتعدين العملات وربح الدولارات مجاناً.\n\nاضغط على الزر بالأسفل للبدء بجمع الأرباح 👇`;
            
            // 🔴 ضع رابط مشروعك على Vercel هنا
            const webAppUrl = 'https://time-traveler-bot.vercel.app'; 

            // إرسال الرسالة إلى تليجرام
            await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: chatId,
                    text: welcomeMessage,
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: "ابدأ التعدين 🚀", web_app: { url: webAppUrl } }]
                        ]
                    }
                } )
            });
        }
    }

    // يجب دائماً الرد بـ 200 لكي لا يعيد تليجرام إرسال الرسالة
    res.status(200).send('OK');
}
