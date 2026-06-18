const nodemailer = require('nodemailer');

// Create transporter
let transporter = null;

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }
  return transporter;
}

// Send order notification email to admin
async function sendOrderNotification(order, customer) {
  try {
    const transport = getTransporter();
    const paymentLabel = order.payment_method === 'online' ? '💳 Paid Online' : '📋 Pay Later (Credit)';

    const mailOptions = {
      from: `"Batter Shop" <${process.env.SMTP_USER}>`,
      to: process.env.ADMIN_EMAIL,
      subject: `🛒 New Order #${order.id} from ${customer.name}`,
      html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8f9fa; border-radius: 12px; overflow: hidden;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">🍚 New Batter Order</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 5px 0 0;">Order #${order.id}</p>
          </div>
          <div style="padding: 30px;">
            <div style="background: white; border-radius: 8px; padding: 20px; margin-bottom: 15px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
              <h3 style="margin: 0 0 15px; color: #333;">👤 Customer Details</h3>
              <p style="margin: 5px 0; color: #555;"><strong>Name:</strong> ${customer.name}</p>
              <p style="margin: 5px 0; color: #555;"><strong>Email:</strong> ${customer.email}</p>
              <p style="margin: 5px 0; color: #555;"><strong>Phone:</strong> ${customer.phone}</p>
            </div>
            <div style="background: white; border-radius: 8px; padding: 20px; margin-bottom: 15px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
              <h3 style="margin: 0 0 15px; color: #333;">📦 Order Details</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr style="border-bottom: 1px solid #eee;">
                  <td style="padding: 8px 0; color: #555;">Idli Batter</td>
                  <td style="padding: 8px 0; text-align: right; color: #333; font-weight: bold;">${order.idli_qty} × ₹${order.idli_price} = ₹${order.idli_qty * order.idli_price}</td>
                </tr>
                <tr style="border-bottom: 1px solid #eee;">
                  <td style="padding: 8px 0; color: #555;">Dosa Batter</td>
                  <td style="padding: 8px 0; text-align: right; color: #333; font-weight: bold;">${order.dosa_qty} × ₹${order.dosa_price} = ₹${order.dosa_qty * order.dosa_price}</td>
                </tr>
                <tr>
                  <td style="padding: 12px 0; color: #333; font-weight: bold; font-size: 16px;">Total</td>
                  <td style="padding: 12px 0; text-align: right; color: #667eea; font-weight: bold; font-size: 18px;">₹${order.total_amount}</td>
                </tr>
              </table>
            </div>
            <div style="background: ${order.payment_method === 'online' ? '#d4edda' : '#fff3cd'}; border-radius: 8px; padding: 15px; text-align: center;">
              <p style="margin: 0; font-size: 16px; font-weight: bold; color: ${order.payment_method === 'online' ? '#155724' : '#856404'};">${paymentLabel}</p>
            </div>
            <p style="text-align: center; color: #999; font-size: 12px; margin-top: 20px;">
              Order placed on ${new Date(order.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
            </p>
          </div>
        </div>
      `
    };

    await transport.sendMail(mailOptions);
    console.log(`✉️  Order notification sent to ${process.env.ADMIN_EMAIL}`);
    return true;
  } catch (error) {
    console.error('❌ Failed to send email:', error.message);
    return false;
  }
}

module.exports = { sendOrderNotification };
