export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');
    
    const { amount, userId } = req.body;

    try {
        const response = await fetch('https://pay.crypt.bot/api/createInvoice', {
            method: 'POST',
            headers: {
                'Crypto-Pay-API-Token': process.env.CRYPTO_BOT_TOKEN,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                asset: 'USDT',
                amount: amount.toString( ),
                payload: userId.toString(), // نحفظ رقم المستخدم هنا لنعرف من دفع
                allow_comments: false,
                allow_anonymous: false
            })
        });
        
        const data = await response.json();
        if (data.ok) {
            res.status(200).json({ payUrl: data.result.pay_url });
        } else {
            res.status(400).json({ error: data.error });
        }
    } catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
}
