import { Resend } from "resend";

let resendInstance: Resend | null = null;

const getResend = () => {
  if (!resendInstance) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.warn("WARNING: RESEND_API_KEY is not defined in environment variables. Email sending might fail.");
    }
    resendInstance = new Resend(apiKey || "placeholder_key");
  }
  return resendInstance;
};

// Helper to send emails
export const sendEmail = async (to: string, subject: string, html: string) => {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || apiKey === "placeholder_key" || apiKey.trim() === "" || apiKey.includes("your_resend_api_key")) {
    console.log("\n=========================================");
    console.log(`MOCK EMAIL SENT TO: ${to}`);
    console.log(`SUBJECT: ${subject}`);
    console.log(`HTML CONTENT:`);
    console.log(html);
    console.log("=========================================\n");
    return { data: { id: "mock_id" } };
  }

  const from = process.env.EMAIL_FROM || "onboarding@resend.dev";
  const resend = getResend();
  try {
    const data = await resend.emails.send({
      from,
      to,
      subject,
      html,
    });
    console.log(`Email sent successfully to ${to}. Response ID: ${data.data?.id}`);
    return data;
  } catch (error) {
    console.error(`Error sending email to ${to}:`, error);
    throw error;
  }
};

// Send invitation email when admin creates a user
export const sendInvitationEmail = async (
  email: string,
  username: string,
  temporaryPassword: string,
) => {
  const loginUrl = `${process.env.FRONTEND_URL || "http://localhost:3000"}/login`;
  
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Te damos la bienvenida</title>
        <style>
          body {
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            background-color: #0f172a;
            color: #f8fafc;
            margin: 0;
            padding: 0;
            -webkit-font-smoothing: antialiased;
          }
          .container {
            max-width: 600px;
            margin: 40px auto;
            background-color: #1e293b;
            border-radius: 16px;
            overflow: hidden;
            border: 1px border #334155;
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.3);
          }
          .header {
            background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
            padding: 40px 20px;
            text-align: center;
          }
          .header h1 {
            color: #ffffff;
            margin: 0;
            font-size: 28px;
            font-weight: 800;
            letter-spacing: -0.025em;
          }
          .content {
            padding: 40px 30px;
          }
          .content p {
            font-size: 16px;
            line-height: 1.6;
            color: #cbd5e1;
            margin: 0 0 20px 0;
          }
          .credentials-box {
            background-color: #0f172a;
            border: 1px solid #334155;
            border-radius: 12px;
            padding: 24px;
            margin: 30px 0;
          }
          .credentials-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 12px;
            font-size: 15px;
          }
          .credentials-row:last-child {
            margin-bottom: 0;
          }
          .label {
            color: #94a3b8;
            font-weight: 500;
          }
          .value {
            color: #f8fafc;
            font-weight: 700;
            font-family: monospace;
            font-size: 16px;
          }
          .btn-container {
            text-align: center;
            margin: 30px 0 10px 0;
          }
          .btn {
            display: inline-block;
            background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
            color: #ffffff !important;
            text-decoration: none;
            padding: 14px 30px;
            border-radius: 12px;
            font-weight: 700;
            font-size: 15px;
            box-shadow: 0 4px 14px 0 rgba(59, 130, 246, 0.4);
            transition: all 0.2s ease;
          }
          .footer {
            background-color: #182235;
            padding: 20px;
            text-align: center;
            border-top: 1px solid #334155;
            font-size: 12px;
            color: #64748b;
          }
          .footer a {
            color: #3b82f6;
            text-decoration: none;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>¡Te damos la bienvenida! 🚀</h1>
          </div>
          <div class="content">
            <p>Hola, <strong>${username}</strong>,</p>
            <p>Un administrador ha creado una cuenta para ti en <strong>JJ Apps</strong>. Tu acceso al ecosistema financiero y personal está listo.</p>
            <p>Aquí están tus credenciales de acceso temporal:</p>
            
            <div class="credentials-box">
              <div class="credentials-row">
                <span class="label">Email:</span>
                <span class="value">${email}</span>
              </div>
              <div class="credentials-row">
                <span class="label">Contraseña temporal:</span>
                <span class="value">${temporaryPassword}</span>
              </div>
            </div>

            <p>Por razones de seguridad, te recomendamos cambiar esta contraseña en la configuración de tu perfil tan pronto como inicies sesión por primera vez.</p>
            
            <div class="btn-container">
              <a href="${loginUrl}" class="btn">Iniciar Sesión Ahora</a>
            </div>
          </div>
          <div class="footer">
            Este correo es automático, por favor no respondas a él.<br>
            &copy; ${new Date().getFullYear()} JJ Apps. Todos los derechos reservados.
          </div>
        </div>
      </body>
    </html>
  `;

  return sendEmail(email, "¡Te damos la bienvenida a JJ Apps! 🚀", html);
};

// Send reset password email
export const sendResetPasswordEmail = async (
  email: string,
  username: string,
  resetLink: string,
) => {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Recupera tu contraseña</title>
        <style>
          body {
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            background-color: #0f172a;
            color: #f8fafc;
            margin: 0;
            padding: 0;
            -webkit-font-smoothing: antialiased;
          }
          .container {
            max-width: 600px;
            margin: 40px auto;
            background-color: #1e293b;
            border-radius: 16px;
            overflow: hidden;
            border: 1px solid #334155;
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.3);
          }
          .header {
            background: linear-gradient(135deg, #ef4444 0%, #f97316 100%);
            padding: 40px 20px;
            text-align: center;
          }
          .header h1 {
            color: #ffffff;
            margin: 0;
            font-size: 28px;
            font-weight: 800;
            letter-spacing: -0.025em;
          }
          .content {
            padding: 40px 30px;
          }
          .content p {
            font-size: 16px;
            line-height: 1.6;
            color: #cbd5e1;
            margin: 0 0 20px 0;
          }
          .btn-container {
            text-align: center;
            margin: 35px 0;
          }
          .btn {
            display: inline-block;
            background: linear-gradient(135deg, #ef4444 0%, #f97316 100%);
            color: #ffffff !important;
            text-decoration: none;
            padding: 14px 30px;
            border-radius: 12px;
            font-weight: 700;
            font-size: 15px;
            box-shadow: 0 4px 14px 0 rgba(239, 68, 68, 0.4);
            transition: all 0.2s ease;
          }
          .warning-text {
            font-size: 13px;
            color: #64748b;
            border-top: 1px solid #334155;
            padding-top: 20px;
            margin-top: 30px;
          }
          .footer {
            background-color: #182235;
            padding: 20px;
            text-align: center;
            border-top: 1px solid #334155;
            font-size: 12px;
            color: #64748b;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Restablecer Contraseña 🔑</h1>
          </div>
          <div class="content">
            <p>Hola, <strong>${username}</strong>,</p>
            <p>Recibimos una solicitud para restablecer la contraseña de tu cuenta en <strong>JJ Apps</strong>.</p>
            <p>Para continuar con el cambio, haz clic en el siguiente botón. Este enlace expirará en 1 hora por seguridad:</p>
            
            <div class="btn-container">
              <a href="${resetLink}" class="btn">Restablecer mi Contraseña</a>
            </div>

            <p class="warning-text">Si tú no solicitaste este cambio, puedes ignorar este correo de forma segura. Tu contraseña actual seguirá siendo válida.</p>
          </div>
          <div class="footer">
            Este correo es automático, por favor no respondas a él.<br>
            &copy; ${new Date().getFullYear()} JJ Apps. Todos los derechos reservados.
          </div>
        </div>
      </body>
    </html>
  `;

  return sendEmail(email, "Recupera tu contraseña en JJ Apps 🔑", html);
};

// Send payday reminder email notification
export const sendPaydayReminderEmail = async (
  email: string,
  username: string,
  paydayConfig: any,
) => {
  const gastosUrl = `${process.env.FRONTEND_URL || "http://localhost:3000"}/app/gastos`;
  const formattedAmount = paydayConfig.amount
    ? new Intl.NumberFormat("es-CL", {
        style: "currency",
        currency: paydayConfig.currency || "CLP",
        maximumFractionDigits: 0,
      }).format(paydayConfig.amount)
    : null;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Recordatorio: Día de Pago Configurado</title>
        <style>
          body {
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            background-color: #0f172a;
            color: #f8fafc;
            margin: 0;
            padding: 0;
            -webkit-font-smoothing: antialiased;
          }
          .container {
            max-width: 600px;
            margin: 40px auto;
            background-color: #1e293b;
            border-radius: 16px;
            overflow: hidden;
            border: 1px solid #334155;
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.3);
          }
          .header {
            background: linear-gradient(135deg, #0d9488 0%, #3b82f6 100%);
            padding: 40px 20px;
            text-align: center;
          }
          .header h1 {
            color: #ffffff;
            margin: 0;
            font-size: 26px;
            font-weight: 800;
            letter-spacing: -0.025em;
          }
          .content {
            padding: 40px 30px;
          }
          .content p {
            font-size: 16px;
            line-height: 1.6;
            color: #cbd5e1;
            margin: 0 0 20px 0;
          }
          .details-box {
            background-color: #0f172a;
            border: 1px solid #334155;
            border-radius: 12px;
            padding: 20px;
            margin: 30px 0;
          }
          .details-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 12px;
            font-size: 15px;
          }
          .details-row:last-child {
            margin-bottom: 0;
          }
          .label {
            color: #94a3b8;
            font-weight: 500;
          }
          .value {
            color: #f8fafc;
            font-weight: 700;
          }
          .btn-container {
            text-align: center;
            margin: 30px 0 10px 0;
          }
          .btn {
            display: inline-block;
            background: linear-gradient(135deg, #0d9488 0%, #3b82f6 100%);
            color: #ffffff !important;
            text-decoration: none;
            padding: 14px 30px;
            border-radius: 12px;
            font-weight: 700;
            font-size: 15px;
            box-shadow: 0 4px 14px 0 rgba(13, 148, 136, 0.4);
            transition: all 0.2s ease;
          }
          .footer {
            background-color: #182235;
            padding: 20px;
            text-align: center;
            border-top: 1px solid #334155;
            font-size: 12px;
            color: #64748b;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>¡Hoy es tu Día de Pago! 💵🎉</h1>
          </div>
          <div class="content">
            <p>Hola, <strong>${username}</strong>,</p>
            <p>Te escribimos para recordarte que hoy es tu día de pago configurado en tu panel de control de gastos.</p>
            
            <p>Por seguridad y para darte el control absoluto de tus finanzas, <strong>este abono no se realiza automáticamente en tu saldo</strong>. Debes iniciar un nuevo período de gastos de forma manual para archivar tus movimientos anteriores y arrancar en limpio.</p>
            
            <div class="details-box">
              <div class="details-row">
                <span class="label">Detalle:</span>
                <span class="value">${paydayConfig.label || "Sueldo principal"}</span>
              </div>
              ${formattedAmount ? `
              <div class="details-row">
                <span class="label">Monto esperado:</span>
                <span class="value">${formattedAmount}</span>
              </div>` : ""}
            </div>

            <p><strong>¿Qué debes hacer ahora?</strong></p>
            <p>Ingresa al panel de gastos y presiona el botón <strong>"Recibí mi Pago"</strong> en el banner superior. Esto creará el abono en tu cuenta configurada de manera inmediata y abrirá tu nuevo ciclo.</p>
            
            <div class="btn-container">
              <a href="${gastosUrl}" class="btn">Ir al Dashboard de Gastos</a>
            </div>
          </div>
          <div class="footer">
            Este correo es automático, por favor no respondas a él.<br>
            &copy; ${new Date().getFullYear()} JJ Apps. Todos los derechos reservados.
          </div>
        </div>
      </body>
    </html>
  `;

  return sendEmail(email, "💵 ¡Hoy es tu día de pago! Registra tu sueldo", html);
};

