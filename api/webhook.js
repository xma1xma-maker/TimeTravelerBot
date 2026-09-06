import { createClient } from '@supabase/supabase-js';

// الاتصال بقاعدة البيانات بصلاحيات الأدمن
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

    const update = req.body;

    // التحقق من أن الإشعار هو "تم دفع الفاتورة"
    if (update.update_type === 'invoice_paid') {
        const invoice = update.payload;
        const userId = invoice.payload; // رقم المستخدم الذي حفظناه سابقاً
        const amount = parseFloat(invoice.amount);

        // جلب رصيد المستخدم الحالي من Supabase
        const { data: user } = await supabase.from('users').select('balance').eq('id', userId).single();
        
        if (user) {
            // زيادة الرصيد
            await supabase.from('users').update({ balance: user.balance + amount }).eq('id', userId);
        }
    }

    // يجب أن نرد بـ 200 لكي يعرف CryptoBot أننا استلمنا الإشعار
    res.status(200).send('OK');
}
