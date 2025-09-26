// src/services/emailService.js - SendGrid Implementation
const sgMail = require('@sendgrid/mail');

class EmailService {
  constructor() {
    if (process.env.SENDGRID_API_KEY) {
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);
      console.log('SendGrid email service initialized');
    } else {
      console.warn('SENDGRID_API_KEY not found, email service will be disabled');
    }
  }

  async sendBookingConfirmation(bookingData) {
    try {
      if (!process.env.SENDGRID_API_KEY) {
        console.log('SendGrid not configured, skipping email');
        return { messageId: 'skipped-no-api-key' };
      }

      console.log('Sending confirmation email via SendGrid:', bookingData.customerEmail);
      
      const htmlTemplate = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #1E293B; color: white; padding: 20px; text-align: center; }
            .content { background: #f9f9f9; padding: 20px; }
            .booking-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .cancel-button { 
              display: inline-block; 
              background: #DC2626; 
              color: white; 
              padding: 12px 24px; 
              text-decoration: none; 
              border-radius: 6px; 
              margin: 20px 0;
              text-align: center;
            }
            .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>D<span style="color: #EF4444;">O</span>ME</h1>
              <h2>Booking Confirmation</h2>
            </div>
            
            <div class="content">
              <p>Dear ${bookingData.customerName},</p>
              <p>Your booking has been confirmed! Here are your booking details:</p>
              
              <div class="booking-details">
                <h3>Booking Details</h3>
                <p><strong>Facility:</strong> ${bookingData.facilityName}</p>
                <p><strong>Court:</strong> ${bookingData.courtName}</p>
                <p><strong>Date:</strong> ${bookingData.bookingDate}</p>
                <p><strong>Time:</strong> ${bookingData.startTime} - ${bookingData.endTime}</p>
                <p><strong>Duration:</strong> ${bookingData.duration} minutes</p>
                <p><strong>Total Amount:</strong> $${bookingData.totalAmount}</p>
                <p><strong>Booking ID:</strong> ${bookingData.bookingId}</p>
              </div>

              <div style="text-align: center;">
                <a href="${bookingData.cancelUrl}" class="cancel-button">Cancel Booking</a>
              </div>

              <p><strong>Cancellation Policy:</strong> Bookings can be cancelled up to 24 hours before the scheduled time.</p>
            </div>
            
            <div class="footer">
              <p>Thank you for choosing DOME Sports Facility</p>
              <p>If you have any questions, please contact us.</p>
            </div>
          </div>
        </body>
        </html>
      `;

      const msg = {
        to: bookingData.customerEmail,
        from: process.env.EMAIL_FROM || 'noreply@domesports.com',
        subject: `Booking Confirmation - ${bookingData.facilityName}`,
        html: htmlTemplate
      };

      const result = await sgMail.send(msg);
      console.log('SendGrid confirmation email sent successfully:', result[0].statusCode);
      return { messageId: result[0].headers['x-message-id'] };
      
    } catch (error) {
      console.error('Failed to send confirmation email via SendGrid:', error);
      if (error.response) {
        console.error('SendGrid error details:', error.response.body);
      }
      return { error: error.message };
    }
  }

  async sendCancellationConfirmation(bookingData) {
    try {
      if (!process.env.SENDGRID_API_KEY) {
        console.log('SendGrid not configured, skipping cancellation email');
        return { messageId: 'skipped-no-api-key' };
      }

      console.log('Sending cancellation email via SendGrid:', bookingData.customerEmail);
      
      const htmlTemplate = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
      	    .header { background: #1E293B; color: white; padding: 20px; text-align: center; }
            .content { background: #f9f9f9; padding: 20px; }
            .booking-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .amount-breakdown { background: #f8f9fa; padding: 15px; border-radius: 6px; margin: 10px 0; border-left: 4px solid #28a745; }
            .cancel-button { 
              display: inline-block; 
              background: #DC2626; 
              color: white; 
              padding: 12px 24px; 
              text-decoration: none; 
              border-radius: 6px; 
              margin: 20px 0;
              text-align: center;
            }
            .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
            .amount-row { display: flex; justify-content: space-between; margin: 5px 0; }
            .amount-total { font-weight: bold; border-top: 1px solid #ddd; padding-top: 5px; margin-top: 10px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>D<span style="color: #EF4444;">O</span>ME</h1>
              <h2>Booking Confirmation</h2>
            </div>
      
            <div class="content">
              <p>Dear ${bookingData.customerName},</p>
              <p>Your booking has been confirmed! Here are your booking details:</p>
        
              <div class="booking-details">
                <h3>Booking Details</h3>
                <p><strong>Facility:</strong> ${bookingData.facilityName}</p>
          	<p><strong>Court:</strong> ${bookingData.courtName}</p>
          	<p><strong>Date:</strong> ${bookingData.bookingDate}</p>
          	<p><strong>Time:</strong> ${bookingData.startTime} - ${bookingData.endTime}</p>
         	<p><strong>Duration:</strong> ${bookingData.duration} minutes</p>
          	<p><strong>Booking ID:</strong> ${bookingData.bookingId}</p>
          
       		<div class="amount-breakdown">
            	  <h4 style="margin-top: 0;">Payment Summary</h4>
            	  <div class="amount-row">
              	    <span>Court Rental (${bookingData.duration} minutes):</span>
              	    <span>$${bookingData.originalAmount}</span>
            	  </div>
            	  ${bookingData.discountAmount && parseFloat(bookingData.discountAmount) > 0 ? `
              	    <div class="amount-row" style="color: #28a745;">
                      <span>Discount Applied:</span>
                      <span>-$${bookingData.discountAmount}</span>
              	    </div>
                    <div class="amount-row">
               	      <span>Subtotal after discount:</span>
                      <span>$${bookingData.subtotal}</span>
                    </div>
                  ` : ''}
                  <div class="amount-row">
                    <span>Convenience Fee (3%):</span>
              	    <span>$${(parseFloat(bookingData.subtotal) * 0.03).toFixed(2)}</span>
            	  </div>
            	  <div class="amount-row">
              	    <span>Tax (13%):</span>
              	    <span>$${((parseFloat(bookingData.subtotal) * 1.03) * 0.13).toFixed(2)}</span>
            	  </div>
            	  <div class="amount-row amount-total">
              	    <span>Total Paid:</span>
              	    <span>$${bookingData.totalAmount}</span>
            	  </div>
          	</div>
              </div>

              <div style="text-align: center;">
                <a href="${bookingData.cancelUrl}" class="cancel-button">Cancel Booking</a>
              </div>

              <p><strong>Cancellation Policy:</strong> Bookings can be cancelled up to 24 hours before the scheduled time.</p>
            </div>
      
            <div class="footer">
              <p>Thank you for choosing DOME Sports Facility</p>
              <p>If you have any questions, please contact us.</p>
            </div>
          </div>
        </body>
        </html>
      `;

      const msg = {
        to: bookingData.customerEmail,
        from: process.env.EMAIL_FROM || 'noreply@domesports.com',
        subject: `Booking Cancelled - ${bookingData.facilityName}`,
        html: htmlTemplate
      };

      const result = await sgMail.send(msg);
      console.log('SendGrid cancellation email sent successfully:', result[0].statusCode);
      return { messageId: result[0].headers['x-message-id'] };
      
    } catch (error) {
      console.error('Failed to send cancellation email via SendGrid:', error);
      if (error.response) {
        console.error('SendGrid error details:', error.response.body);
      }
      return { error: error.message };
    }
  }
}

module.exports = new EmailService();