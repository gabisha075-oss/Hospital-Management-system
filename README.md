# Enterprise Hospital Management System

A production-ready Hospital Management System built with React, Node.js, and MySQL.

## Features
- Role-Based Access Control (Admin, Doctor, Patient, etc.)
- Appointment Booking & Management
- Billing System with PDF Invoice Generation
- Pharmacy Inventory Management
- Lab Report Uploads (PDF)
- Interactive Dashboard Analytics (Chart.js)
- Responsive Design (Tailwind CSS)

## Setup Instructions

### 1. Database Setup
1. Open your MySQL client (e.g., MySQL Workbench or XAMPP).
2. Execute the `schema.sql` file to create the database and tables.

### 2. Backend Setup
1. Navigate to the `server` folder: `cd server`
2. Install dependencies: `npm install`
3. Create a `.env` file based on `.env.example` and update your MySQL credentials.
4. Start the server: `npm start` (or `node server.js`)

### 3. Frontend Setup
1. Navigate to the `client` folder: `cd client`
2. Install dependencies: `npm install`
3. Start the development server: `npm run dev`
4. Access the app at `http://localhost:5173`

## Default Credentials (Suggested)
- Create an admin user via the registration or manual SQL insert to get started.
- Registered patients can login immediately.
- Admin can manage staff and departments.
