export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');
    
    const { userId, channel } = req.body;

    try {
        // الاتصال بـ API تليجرام للتحقق من حالة المستخدم في القناة
        const response = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/getChatMember?chat_id=${channel}&user_id=${userId}` );
        const data = await response.json();

        // إذا كان المستخدم عضواً أو أدمن أو مالك القناة
        if (data.ok && ['member', 'administrator', 'creator'].includes(data.result.status)) {
            res.status(200).json({ isSubscribed: true });
        } else {
            res.status(200).json({ isSubscribed: false });
        }
    } catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
}
