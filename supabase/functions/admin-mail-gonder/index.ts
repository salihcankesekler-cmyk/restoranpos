// Supabase Edge Function: admin-mail-gonder
// Kurulum özeti:
// 1) Supabase projesinde Edge Functions bölümünden admin-mail-gonder oluşturun.
// 2) RESEND_API_KEY environment secret ekleyin.
// 3) Bu dosya içeriğini function içine koyup deploy edin.
// 4) App.jsx zaten supabase.functions.invoke('admin-mail-gonder') çağırıyor.

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      return new Response(JSON.stringify({ error: 'RESEND_API_KEY tanımlı değil.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const to = body.to || 'salihcankesekler@gmail.com';
    const subject = body.subject || 'Integra POS Bildirim';
    const text = body.text || '';

    const html = `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#1e293b">
        <h2 style="margin:0 0 12px;color:#ff6b35">Integra POS Bildirim</h2>
        <h3 style="margin:0 0 10px">${subject}</h3>
        <pre style="white-space:pre-wrap;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:14px">${text}</pre>
      </div>
    `;

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Integra POS <onboarding@resend.dev>',
        to: [to],
        subject,
        text,
        html,
      }),
    });

    const result = await resendResponse.json();

    if (!resendResponse.ok) {
      return new Response(JSON.stringify(result), {
        status: resendResponse.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ ok: true, result }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error?.message || 'Mail gönderilemedi.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
