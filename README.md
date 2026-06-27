# Waha-Smart-Rural-Services-Platform

[![Open in Bolt](https://bolt.new/static/open-in-bolt.svg)](https://bolt.new/~/sb1-b9yetl99)




<div align="center"><img src="./public/waha-logo.png" alt="Waha Logo" width="180"/>واحة | Waha

Smart Rural Services Platform

منصة الخدمات الريفية الذكية

"Build" (https://img.shields.io/badge/build-passing-brightgreen)
"React" (https://img.shields.io/badge/React-18-blue)
"TypeScript" (https://img.shields.io/badge/TypeScript-ready-blue)
"Supabase" (https://img.shields.io/badge/Supabase-connected-3ECF8E)
"Gemini" (https://img.shields.io/badge/Gemini-AI-gold)
"RTL" (https://img.shields.io/badge/Arabic-RTL-green)
"Hackathon" (https://img.shields.io/badge/Tatweer-Hackathon%202026-orange)

واحة is a smart rural services platform designed for Al Qua’a and Al Ain communities.
It connects residents with essential services, local market opportunities, events, reports, transport, health, agriculture, emergency support, and an Arabic AI assistant.

واحة منصة ذكية تخدم المجتمعات الريفية في القوع والعين، وتربط السكان بالخدمات الأساسية، السوق المحلي، المزادات، الفعاليات، البلاغات، النقل، الصحة، الزراعة، والطوارئ، مع مساعد ذكي يدعم اللغة العربية.

</div>---

Live Demo

Website:
https://arabic-rtl-app-ai-as-29nb.bolt.host/

---

Repository

GitHub:
https://github.com/202510085/Waha-Smart-Rural-Services-Platform

---

Problem

Rural communities often face challenges in accessing services quickly and clearly. Residents may need to find health services, report community issues, sell local products, discover events, request transport, or get agriculture support, but these services are usually scattered across different channels.

المجتمعات الريفية تحتاج طريقة سهلة للوصول إلى الخدمات، رفع البلاغات، متابعة الفعاليات، بيع المنتجات المحلية، طلب النقل، والحصول على دعم صحي وزراعي دون تشتت أو تعقيد.

---

Solution

Waha brings these services into one smart platform. It provides a simple Arabic interface, real data storage with Supabase, AI-powered assistance through Gemini, and direct user flows for common community needs.

The platform is built to be practical, fast, and suitable for rural residents, service providers, farmers, sellers, volunteers, and local organizers.

---

Key Features

Smart Homepage

- Clean Arabic RTL interface
- Quick access buttons
- Real platform statistics
- Latest updates from the platform
- Dark mode support
- Mobile responsive design

Local Market

- Add and browse local products
- Product images
- Categories such as dates, livestock, honey, vegetables, and more
- Search and filtering
- Auction support
- Bidding system

Community Reports

- Submit reports for lighting, roads, water, cleanliness, safety, and other issues
- Add report location
- Add optional image
- Track report status
- Admin can manage and delete reports

Events

- Add and browse community events
- Event registration
- Event categories
- Search and filtering
- Real registration tracking

Announcements

- Publish local announcements
- Add category, image, location, and period
- Browse latest announcements

Health Services

- View health services
- Health consultation request
- GPS/location support
- Open/closed status where available

Agriculture Support

- Crop scan with Gemini AI
- Upload crop image for initial analysis
- Agriculture advice requests
- Support for farmers and palm-related problems

Transport Requests

- Request rides or transport assistance
- Add destination and details
- Useful for rural mobility and service access

Emergency / SOS

- Emergency access button
- Quick emergency flow
- Designed for urgent cases

Arabic AI Assistant

- Understands Arabic and Gulf-style requests
- Opens the correct section automatically
- Opens forms directly
- Pre-fills forms based on the user’s message
- Answers from Supabase data where possible
- Fallback mode if Gemini is unavailable
- Voice input support in Arabic

Admin Dashboard

- Secure admin role system
- Admin can delete user-generated content
- Admin dashboard appears only for admin users
- RLS-protected permissions through Supabase
- Normal users cannot promote themselves to admin

---

AI Features

Waha uses Gemini AI to support:

- Arabic smart assistant
- Request understanding
- Intent detection
- Form prefill
- Crop image analysis
- Smart navigation
- Fallback assistant when AI is unavailable

Example:

User says:

«أريد أبيع تمر خلاص فاخر»

The assistant opens the local market product form and pre-fills the product title and category.

User says:

«الشارع مظلم»

The assistant opens the community report form and pre-fills lighting report details.

---

Supabase Features

The platform uses Supabase for:

- Authentication
- User profiles
- Products
- Product images
- Auctions
- Bids
- Announcements
- Events
- Event registrations
- Community reports
- Health requests
- Agriculture requests
- Transport requests
- Admin role management
- Row Level Security policies

---

Tech Stack

- React
- TypeScript
- Vite
- Tailwind CSS
- Supabase
- Gemini API
- Lucide React Icons
- Bolt.new
- Arabic RTL UI

---

Main User Flows

Resident

1. Sign up or log in
2. Browse services
3. Submit report
4. Register for events
5. Request transport
6. Ask the AI assistant

Seller / Farmer

1. Add local product
2. Upload product images
3. Start auction if needed
4. Manage products from account page

Community Organizer

1. Add event
2. Add announcement
3. Track registrations

Admin

1. Log in with admin account
2. Open admin dashboard
3. Review platform content
4. Delete inappropriate or test content

---

Environment Variables

Create a ".env" file locally:

VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_GEMINI_API_KEY=your_gemini_api_key_optional

For Bolt secrets, add:

GEMINI_API_KEY=your_gemini_api_key

Never commit real API keys to GitHub.

---

How to Run Locally

Install dependencies:

npm install

Start development server:

npm run dev

Build for production:

npm run build

---

Admin Account Setup

Admin accounts must be promoted from Supabase SQL Editor only.

UPDATE public.profiles
SET role = 'admin'
WHERE id = (
  SELECT id
  FROM auth.users
  WHERE lower(email) = lower('admin@example.com')
);

Replace:

admin@example.com

with the real admin email.

Normal users must not be able to choose admin role from the app.

---

Security Notes

- Supabase Row Level Security is enabled
- Admin actions are protected by database policies
- Service role keys are not exposed in the frontend
- API keys are stored in environment variables or Bolt secrets
- Normal users can only manage their own content
- Admin users can moderate platform content

---

Hackathon Notes

This project was built for Tatweer Hackathon 2026.

Challenge focus:

«Connecting residents to services, opportunities, and events.»

Waha addresses this challenge by giving rural communities a unified platform for daily services, local economic activity, community updates, and AI-powered assistance.

---

Current Limitations

- Some services depend on available Supabase data
- Phone verification is implemented as a demo flow for hackathon purposes
- AI crop scan provides initial guidance, not a professional diagnosis
- Gemini API availability depends on configured API key
- Real deployment would require stronger production monitoring and service provider integration

---

Future Improvements

- Official integration with local service providers
- Real SMS OTP verification
- Push notifications
- Advanced admin analytics
- Real-time report tracking
- Government/service provider dashboard
- More detailed AI agriculture recommendations
- Multilingual support

---

Team / Author

Developed by:

Mohammed Ali Almahboobi Alshehhi
United Arab Emirates University
Tatweer Hackathon 2026

---

<div align="center">واحة

منصة الخدمات الريفية الذكية

Built for smarter, more connected rural communities.

</div>
