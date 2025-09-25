// src/services/emailService.js - FIXED VERSION
const nodemailer = require('nodemailer');
const handlebars = require('handlebars');
const fs = require('fs');
const path = require('path');

class EmailService {
  constructor() {
    // FIXED: Changed from createTransporter to createTransport
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      }
    });
  }

  async sendBookingConfirmation(bookingData) {
    try {
      const template = this.getConfirmationTemplate();
      const html = template(bookingData);

      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: bookingData.customerEmail,
        subject: `Booking Confirmation - ${bookingData.facilityName}`,
        html: html
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('Confirmation email sent:', result.messageId);
      return result;
    } catch (error) {
      console.error('Failed to send confirmation email:', error);
      throw error;
    }
  }

  async sendCancellationConfirmation(bookingData) {
    try {
      const template = this.getCancellationTemplate();
      const html = template(bookingData);

      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: bookingData.customerEmail,
        subject: `Booking Cancelled - ${bookingData.facilityName}`,
        html: html
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('Cancellation email sent:', result.messageId);
      return result;
    } catch (error) {
      console.error('Failed to send cancellation email:', error);
      throw error;
    }
  }

  getConfirmationTemplate() {
    return handlebars.compile(`
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
            <p>Dear {{customerName}},</p>
            <p>Your booking has been confirmed! Here are your booking details:</p>
            
            <div class="booking-details">
              <h3>Booking Details</h3>
              <p><strong>Facility:</strong> {{facilityName}}</p>
              <p><strong>Court:</strong> {{courtName}}</p>
              <p><strong>Date:</strong> {{bookingDate}}</p>
              <p><strong>Time:</strong> {{startTime}} - {{endTime}}</p>
              <p><strong>Duration:</strong> {{duration}} minutes</p>
              <p><strong>Total Amount:</strong> ${{totalAmount}}</p>
              <p><strong>Booking ID:</strong> {{bookingId}}</p>
            </div>

            <div style="text-align: center;">
              <a href="{{cancelUrl}}" class="cancel-button">Cancel Booking</a>
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
    `);
  }

  getCancellationTemplate() {
    return handlebars.compile(`
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #1E293B; color: white; padding: 20px; text-align: center; }
          .content { background: #f9f9f9; padding: 20px; }
          .booking-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>D<span style="color: #EF4444;">O</span>ME</h1>
            <h2>Booking Cancelled</h2>
          </div>
          
          <div class="content">
            <p>Dear {{customerName}},</p>
            <p>Your booking has been successfully cancelled.</p>
            
            <div class="booking-details">
              <h3>Cancelled Booking Details</h3>
              <p><strong>Facility:</strong> {{facilityName}}</p>
              <p><strong>Court:</strong> {{courtName}}</p>
              <p><strong>Date:</strong> {{bookingDate}}</p>
              <p><strong>Time:</strong> {{startTime}} - {{endTime}}</p>
              <p><strong>Booking ID:</strong> {{bookingId}}</p>
            </div>

            <p>If this cancellation was made in error, please contact us immediately.</p>
          </div>
          
          <div class="footer">
            <p>Thank you for using DOME Sports Facility</p>
          </div>
        </div>
      </body>
      </html>
    `);
  }
}

module.exports = new EmailService();