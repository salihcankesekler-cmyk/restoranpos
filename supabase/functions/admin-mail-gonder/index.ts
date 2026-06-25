// Supabase Edge Function: admin-mail-gonder
// Integra POS admin mail bildirimi
// App.jsx içinden gelen baslik / mesaj / tip / metadata alanlarını düzgün mail içeriğine çevirir.

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ADMIN_MAIL = 'salihcankesekler@gmail.com';

const htmlEscape = (value: unknown) => {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
};

const metadataSatirlariOlustur = (metadata: Record<string, unknown>) => {
  const entries = Object.entries(metadata || {});

  if (entries.length === 0) {
    return '<tr><td colspan="2" style="padding:10px;color:#64748b">Ek detay yok.</td></tr>';
  }

  return entries
    .map(([key, value]) => {
      const temizValue =
        typeof value === 'object' && value !== null
          ? JSON.stringify(value, null, 2)
          : String(value ?? '-');

      return `
        <tr>
          <td style="padding:10px;border-bottom:1px solid #e2e8f0;font-weight:700;color:#334155;width:170px">
            ${htmlEscape(key)}
          </td>
          <td style="padding:10px;border-bottom:1px solid #e2e8f0;color:#0f172a;white-space:pre-wrap">
            ${htmlEscape(temizValue)}
          </td>
        </tr>
      `;
    })
    .join('');
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

    const tip = body?.tip || 'Bildirim';
    const baslik = body?.baslik || body?.subject || 'Integra POS Bildirim';
    const mesaj = body?.mesaj || body?.text || 'Mesaj içeriği bulunamadı.';
    const metadata = body?.metadata && typeof body.metadata === 'object' ? body.metadata : {};

    const subject = `${tip} - ${baslik}`;

    const metadataText = Object.entries(metadata)
      .map(([key, value]) => {
        const temizValue =
          typeof value === 'object' && value !== null
            ? JSON.stringify(value, null, 2)
            : String(value ?? '-');

        return `${key}: ${temizValue}`;
      })
      .join('\n');

    const text = `
INTEGRA POS BİLDİRİMİ

Tip: ${tip}
Başlık: ${baslik}

Mesaj:
${mesaj}

Detaylar:
${metadataText || 'Ek detay yok.'}
`.trim();

    const html = `
      <div style="font-family:Arial,sans-serif;background:#f8fafc;padding:24px;color:#0f172a">
        <div style="max-width:680px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:18px;overflow:hidden">
          <div style="background:#ff6b35;padding:18px 22px;color:#ffffff">
            <div style="font-size:13px;font-weight:700;opacity:.9">Integra POS Bildirimi</div>
            <h2 style="margin:6px 0 0;font-size:22px;line-height:1.3">${htmlEscape(baslik)}</h2>
          </div>

          <div style="padding:22px">
            <div style="display:inline-block;background:#fff7ed;color:#c2410c;border:1px solid #fed7aa;border-radius:999px;padding:7px 12px;font-size:13px;font-weight:800;margin-bottom:14px">
              ${htmlEscape(tip)}
            </div>

            <h3 style="margin:0 0 10px;color:#1e293b;font-size:17px">Mesaj</h3>
            <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:14px;padding:14px;white-space:pre-wrap;line-height:1.6;color:#334155">
              ${htmlEscape(mesaj)}
            </div>

            <h3 style="margin:22px 0 10px;color:#1e293b;font-size:17px">Detaylar</h3>
            <table style="width:100%;border-collapse:collapse;border:1px solid #e2e8f0;border-radius:14px;overflow:hidden">
              <tbody>
                ${metadataSatirlariOlustur(metadata)}
              </tbody>
            </table>

            <div style="margin-top:18px;font-size:12px;color:#64748b">
              Bu mail Integra POS sisteminden otomatik gönderilmiştir.
            </div>
          </div>
        </div>
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
        to: [ADMIN_MAIL],
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