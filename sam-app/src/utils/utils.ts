import { SendEmailCommand, SESClient } from '@aws-sdk/client-ses';
import { marketplaceURL, streamToString } from './index';
import { Readable } from 'stream';
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';

const ses = new SESClient({ region: 'eu-west-2' });
const s3Client = new S3Client({ region: 'eu-west-2' });

export async function sendInviteEmail1(email: string, token: string, referrerLink: string) {
    const link = 'https://cusecho.store/';
    const approvalUrl = `${link}guest-user?token=${encodeURIComponent(token)}`;

    const emailParams = {
        Source: 'CUSECHO-SWAP <noreply@support.cusecho.com>',
        Destination: {
            ToAddresses: [email],
        },
        Message: {
            Subject: {
                Data: 'Your Swap Request Has Been Approved!',
                Charset: 'UTF-8',
            },
            Body: {
                Text: {
                    Data: `Hello,

Good news! Your swap request has been approved by the seller.

Please click the link below to view the request and choose to accept or decline:

${approvalUrl}

This link will expire in 24 hours.

Thank you for using Cusecho!

— The Cusecho Team`,
                    Charset: 'UTF-8',
                },
                Html: {
                    Data: `<html>
  <body>
    <p>Hello,</p>
    <p>Good news! Your swap request has been approved by the seller.</p>
    <p>
      Please click the button below to view the request and choose to accept or decline:
    </p>
    <p style="text-align:center;">
      <a 
        href="${approvalUrl}" 
        style="
          display:inline-block;
          padding:12px 24px;
          background-color:#1E40AF;
          color:#ffffff;
          text-decoration:none;
          border-radius:4px;
          font-weight:bold;
        "
      >
        View Swap Request
      </a>
    </p>
    <p>This link will expire in 24 hours.</p>
    <p>Thank you for using <strong>Cusecho</strong>!</p>
    <hr />
    <p style="font-size:12px;color:#888;">
      If you did not expect this email, please ignore it.
    </p>
  </body>
</html>`,
                    Charset: 'UTF-8',
                },
            },
        },
    };

    try {
        const result = await ses.send(new SendEmailCommand(emailParams));
        console.log('Email sent; MessageId:', result.MessageId);
        return result;
    } catch (err) {
        console.error('Failed to send invite email:', err);
        throw err;
    }
}

export async function sendOrderConfirmationEmail(email: string, buyerFlowUrl: string) {
    const emailParams = {
        Source: 'CUSECHO-ADZONE <noreply@support.cusecho.com>',
        Destination: {
            ToAddresses: [email],
        },
        Message: {
            Subject: {
                Data: '✅ Your Adzone order has been confirmed!',
                Charset: 'UTF-8',
            },
            Body: {
                Text: {
                    Data: `Hello,

Great news! 🎉 Your order on Adzone by Cusecho has been successfully confirmed by the seller.

Here’s what happens next:
- 📦 Your item is being prepared for delivery or pickup.
- 🔔 You’ll receive timely updates on the progress of your order.
- 🛡 Safe & secure: Your payment is protected until your order is completed.

👉 Click below to view your order details:
${buyerFlowUrl}

This link will remain accessible for your records and future reference.

Thank you for shopping with Adzone, where original products meet the best deals. 🚀

Warm regards,  
The Cusecho Team`,
                    Charset: 'UTF-8',
                },
                Html: {
                    Data: `<html>
  <body style="font-family:Arial, sans-serif; color:#333; line-height:1.6;">
    <p>Hello,</p>
    <p>Great news! 🎉 Your order on <strong>Adzone by Cusecho</strong> has been successfully confirmed by the seller.</p>

    <p><strong>Here’s what happens next:</strong></p>
    <ul>
      <li>📦 Your item is being prepared for delivery or pickup.</li>
      <li>🔔 You’ll receive timely updates on the progress of your order.</li>
      <li>🛡 <strong>Safe & secure:</strong> Your payment is protected until your order is completed.</li>
    </ul>

    <p style="text-align:center; margin:24px 0;">
      <a 
        href="${buyerFlowUrl}" 
        style="
          display:inline-block;
          padding:12px 24px;
          background-color:#1E40AF;
          color:#ffffff;
          text-decoration:none;
          border-radius:6px;
          font-weight:bold;
        "
      >
        View My Order
      </a>
    </p>

    <p>This link will remain accessible for your records and future reference.</p>
    <p>Thank you for shopping with <strong>Adzone</strong>, where original products meet the best deals. 🚀</p>

    <p>Warm regards,<br/>The Cusecho Team</p>
    <hr />
    <p style="font-size:12px; color:#888;">
      If you did not expect this email, please ignore it.
    </p>
  </body>
</html>`,
                    Charset: 'UTF-8',
                },
            },
        },
    };

    try {
        const result = await ses.send(new SendEmailCommand(emailParams));
        console.log('Email sent; MessageId:', result.MessageId);
        return result;
    } catch (err) {
        console.error('Failed to send order confirmation email:', err);
        throw err;
    }
}

const EMAIL_TEMPLATE_BUCKET = 'cusecho-emailing-testing-bucket';
const EMAIL_TEMPLATE_KEY = 'Email-template-1/swapRequestEmail_Adzone.html';
const EMAIL_TEMPLATE_KEY_2 = 'newsletters0_1/ilorinticket2.html';
const EMAIL_TEMPLATE_KEY_3 = 'newsletters0_1/IlorinPurchase.html';

export async function sendInviteEmail(email: string, token: string, referrerLink: string) {
    const approvalUrl = `${marketplaceURL}${encodeURIComponent(token)}`;

    const getObjectCommand = new GetObjectCommand({
        Bucket: EMAIL_TEMPLATE_BUCKET,
        Key: EMAIL_TEMPLATE_KEY,
    });
    const response = await s3Client.send(getObjectCommand);

    let templateContent = '';
    if (response.Body instanceof Readable) {
        templateContent = await streamToString(response.Body);
    } else {
        templateContent = (await response.Body?.transformToString()) || '';
    }

    if (!templateContent) {
        throw new Error('Email template content is empty');
    }

    // personalize the template
    const personalizedContent = templateContent.replace(/{{approvalUrl}}/g, approvalUrl);

    // send email
    const sendEmailCommand = new SendEmailCommand({
        Source: 'CUSECHO-ADZONE <noreply@support.cusecho.com>',
        Destination: {
            ToAddresses: [email],
        },
        Message: {
            Subject: {
                Data: '"Your Swap Request Has Been Approved!",',
                Charset: 'UTF-8',
            },
            Body: {
                Html: {
                    Data: personalizedContent,
                    Charset: 'UTF-8',
                },
            },
        },
    });

    try {
        const result = await ses.send(sendEmailCommand);
        console.log('Email sent; MessageId:', result.MessageId);
        return result;
    } catch (err) {
        console.error('Failed to send order confirmation email:', err);
        throw err;
    }
}

export async function sendIlorinPurchaseEmail(
    email: string,
    purchaseId: string,
    productName: string,
    price: string,
    quantity: string,
    colour: string,
    size: string,
    shippingAddress: string,
    deliveryFee: string,
    fullName: string,
) {
    const getObjectCommand = new GetObjectCommand({
        Bucket: EMAIL_TEMPLATE_BUCKET,
        Key: EMAIL_TEMPLATE_KEY_3,
    });
    const response = await s3Client.send(getObjectCommand);

    let templateContent = '';
    if (response.Body instanceof Readable) {
        templateContent = await streamToString(response.Body);
    } else {
        templateContent = (await response.Body?.transformToString()) || '';
    }

    if (!templateContent) {
        throw new Error('Email template content is empty');
    }

    // personalize the template
    // const personalizedContent = templateContent.replace(/{{approvalUrl}}/g, approvalUrl);
    // --- 2. Replace Placeholders in HTML ---
    const personalizedContent = templateContent
        .replace(/{{Customer_Name}}/g, fullName || 'Valued Customer')
        .replace(/{{Ticket_Type}}/g, productName || 'General Access')
        .replace(/{{Product_Name}}/g, productName || '')
        .replace(/{{Ticket_Price}}/g, price || '')
        .replace(/{{Ticket_ID}}/g, purchaseId)
        .replace(/{{Event_Time}}/g, '12:00 NOON')
        .replace(/{{Quantity}}/g, quantity)
        .replace(/{{Delivery_Address}}/g, shippingAddress)
        .replace(/{{Size}}/g, size)
        .replace(/{Color}}/g, colour)
        .replace(/{{Delivery_Fee}}/g, deliveryFee);

    // send email
    const sendEmailCommand = new SendEmailCommand({
        Source: 'CUSECHO-ADZONE <noreply@support.cusecho.com>',
        Destination: {
            ToAddresses: [email],
        },
        Message: {
            Subject: {
                Data: 'Your Ilorin Car Show Merch Purchase was Successful',
                Charset: 'UTF-8',
            },
            Body: {
                Html: {
                    Data: personalizedContent,
                    Charset: 'UTF-8',
                },
            },
        },
    });

    try {
        const result = await ses.send(sendEmailCommand);
        console.log('Email sent; MessageId:', result.MessageId);
        return result;
    } catch (err) {
        console.error('Failed to send order confirmation email:', err);
        throw err;
    }
}

export async function sendIlorinTicketEmail(
    email: string,
    purchaseId: string,
    fullName: string,
    productName: string,
    price: string,
    no_of_allowedScan: number,
) {
    const validationUrl = `https://cusecho.store/ilorinautomotivefestival/verify-ticket/${purchaseId}`;
    const encodedUrl = encodeURIComponent(validationUrl);

    // const qrCodeDataUri = await QRCode.toDataURL(validationUrl);
    const qrCodeImageUrl = `https://quickchart.io/qr?text=${encodedUrl}&size=300&margin=2`;
    const getObjectCommand = new GetObjectCommand({
        Bucket: EMAIL_TEMPLATE_BUCKET,
        Key: EMAIL_TEMPLATE_KEY_2,
    });
    const response = await s3Client.send(getObjectCommand);

    let templateContent = '';
    if (response.Body instanceof Readable) {
        templateContent = await streamToString(response.Body);
    } else {
        templateContent = (await response.Body?.transformToString()) || '';
    }

    if (!templateContent) {
        throw new Error('Email template content is empty');
    }

    // personalize the template
    // const personalizedContent = templateContent.replace(/{{approvalUrl}}/g, approvalUrl);
    // --- 2. Replace Placeholders in HTML ---
    const personalizedContent = templateContent
        .replace(/{{Customer_Name}}/g, fullName || 'Valued Customer')
        .replace(/{{Ticket_Type}}/g, productName || 'General Access')
        .replace(/{{Product_Name}}/g, productName || '')
        .replace(/{{Ticket_Price}}/g, price || '')
        .replace(/{{Ticket_ID}}/g, purchaseId)
        .replace(/{{Event_Time}}/g, '12:00 NOON')
        .replace(/{{QR_Code_Image_or_Link}}/g, qrCodeImageUrl) // Injecting QR Code Image URL
        .replace(/{{No_of_persons}}/g, String(no_of_allowedScan) || '1');
    // send email
    const sendEmailCommand = new SendEmailCommand({
        Source: 'CUSECHO-ADZONE <noreply@support.cusecho.com>',
        Destination: {
            ToAddresses: [email],
        },
        Message: {
            Subject: {
                Data: 'Your Ilorin Car Show Ticket Purchase was Successful',
                Charset: 'UTF-8',
            },
            Body: {
                Html: {
                    Data: personalizedContent,
                    Charset: 'UTF-8',
                },
            },
        },
    });

    try {
        const result = await ses.send(sendEmailCommand);
        console.log('Email sent; MessageId:', result.MessageId);
        return result;
    } catch (err) {
        console.error('Failed to send order confirmation email:', err);
        throw err;
    }
}
