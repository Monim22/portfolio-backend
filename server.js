import express from 'express'
import nodemailer from 'nodemailer'
import cors from 'cors'
import dotenv from 'dotenv'

dotenv.config()

// Validate required environment variables
const requiredEnvVars = ['EMAIL_USER', 'EMAIL_APP_PASSWORD', 'RECEIVER_EMAIL']
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`Missing required environment variable: ${envVar}`)
    process.exit(1)
  }
}

const app = express()

// Updated CORS configuration
const allowedOrigins = ['http://localhost:3000', 'https://portfolio-website-omega-sage.vercel.app']

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true)

      if (allowedOrigins.indexOf(origin) === -1) {
        const msg = 'The CORS policy for this site does not allow access from the specified Origin.'
        return callback(new Error(msg), false)
      }
      return callback(null, true)
    },
    methods: ['POST', 'OPTIONS'],
    credentials: true,
  })
)

app.use(express.json())

// Create transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_APP_PASSWORD,
  },
})

// Verify transporter connection
transporter.verify((error) => {
  if (error) {
    console.error('Error with email transporter:', error)
  } else {
    console.log('Server is ready to send emails')
  }
})

// Contact form endpoint
app.post('/api/contact', async (req, res) => {
  const { name, email, message } = req.body

  // Input validation
  if (!name?.trim() || !email?.trim() || !message?.trim()) {
    return res.status(400).json({ error: 'All fields are required' })
  }

  // Email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Invalid email format' })
  }

  // Sanitize inputs for HTML
  const sanitizeHtml = (str) => {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
  }

  const sanitizedName = sanitizeHtml(name)
  const sanitizedMessage = sanitizeHtml(message)

  // Email to your professional address
  const mailToYou = {
    from: process.env.EMAIL_USER,
    to: process.env.RECEIVER_EMAIL,
    subject: `Portfolio Contact: ${sanitizedName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #0891b2;">New Portfolio Contact Message</h2>
        <div style="border-left: 4px solid #0891b2; padding-left: 15px; margin: 20px 0;">
          <p><strong>From:</strong> ${sanitizedName}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Message:</strong></p>
          <p style="white-space: pre-wrap;">${sanitizedMessage}</p>
        </div>
        <div style="margin-top: 20px; font-size: 12px; color: #666;">
          <p>This message was sent from your portfolio contact form.</p>
        </div>
      </div>
    `,
  }

  // Auto-reply to sender
  const autoReply = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Thank you for your message',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #0891b2;">Thank You for Contacting Me</h2>
        <p>Dear ${sanitizedName},</p>
        <p>Thank you for reaching out through my portfolio. I have received your message and will get back to you as soon as possible at this email address.</p>
        <div style="border-left: 4px solid #0891b2; padding-left: 15px; margin: 20px 0;">
          <p><strong>Your message:</strong></p>
          <p style="white-space: pre-wrap;">${sanitizedMessage}</p>
        </div>
        <p>Best regards,<br>ELMESTARI Abdelmonim</p>
        <div style="margin-top: 20px; font-size: 12px; color: #666;">
          <p>This is an automated response. Please do not reply to this email.</p>
        </div>
      </div>
    `,
  }

  try {
    // Send both emails
    await Promise.all([transporter.sendMail(mailToYou), transporter.sendMail(autoReply)])

    res.status(200).json({ message: 'Message sent successfully' })
  } catch (error) {
    console.error('Error sending email:', error)
    res.status(500).json({ error: 'Failed to send message. Please try again later.' })
  }
})

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).json({ error: 'Something broke!' })
})

const PORT = process.env.PORT || 3001
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
