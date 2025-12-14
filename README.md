# web_tech_project_backend_acity_eats

# ACITY EATS - Backend API

## Project Name
**ACITY EATS - Campus Food Ordering System (Backend)**

## Project Overview

ACITY EATS Backend is a RESTful API server built with Node.js and Express.js that powers the Campus Food Ordering System for Academic City University. The backend provides secure authentication, comprehensive menu management, order processing, and administrative functionality. It uses PostgreSQL for data persistence and JWT (JSON Web Tokens) for secure authentication, ensuring a robust and scalable solution for managing food orders.

### Key Functionality

- **User Authentication**: Secure registration and login system with JWT tokens and bcrypt password hashing
- **Menu Management**: Complete CRUD operations for menu items with categories, pricing, and availability control
- **Order Processing**: Create, retrieve, and manage orders with support for Inhouse and Delivery order types
- **Admin Dashboard**: Administrative endpoints for managing orders, menu items, viewing statistics, and revenue analytics
- **Database Management**: PostgreSQL database with proper relationships, transactions, and data integrity
- **Security**: JWT authentication, password hashing, CORS configuration, and input validation

---

## Deployment Links

### Frontend (GitHub Pages)
🔗 **Live URL**: [https://benittaafriyie-svg.github.io/web_tech_project_frontend_acity_eats/]

### Backend (Render)
🔗 **API URL**: [https://web-tech-project-backend-acity-eats.onrender.com]

---

## Login Details

### Regular User Account
Create Student Account

### Admin Account
- **Email**: `benitta.afriyie@acity.edu.gh`
- **Password**: `123456`

---

## Feature Checklist

### Authentication Features
- ✅ User Registration with validation
- ✅ User Login with JWT token generation
- ✅ Password Hashing using bcryptjs
- ✅ JWT Token Generation and Verification
- ✅ Token-based Authentication Middleware
- ✅ User Profile Retrieval
- ✅ Admin Role Verification Middleware
- ✅ Secure Password Storage

### Menu Management Features
- ✅ Get All Menu Items
- ✅ Get Menu Item by ID
- ✅ Get Items by Category
- ✅ Filter by Availability
- ✅ Search Menu Items by Name/Description
- ✅ Get Popular/Featured Items
- ✅ Get All Categories List
- ✅ Optional Authentication for Menu Access

### Order Management Features
- ✅ Create New Order with Items
- ✅ Get User's Order History
- ✅ Get Order Details by ID
- ✅ Cancel Order (Pending status only)
- ✅ Order Status Tracking (Pending, Preparing, Ready, Completed, Cancelled)
- ✅ Order Type Support (Inhouse/Delivery)
- ✅ Order Items Management
- ✅ Order Total Calculation
- ✅ Order Statistics for Users

### Admin Features
- ✅ Get All Orders with Filters
- ✅ Get Order Details (Admin View)
- ✅ Update Order Status
- ✅ Filter Orders by Status/Date
- ✅ Delete Orders
- ✅ Add New Menu Item
- ✅ Update Existing Menu Item
- ✅ Delete Menu Item
- ✅ Get Dashboard Statistics
- ✅ Revenue Analytics
- ✅ Top Selling Items Report
- ✅ Order Count Statistics

### Technical Features
- ✅ RESTful API Design
- ✅ PostgreSQL Database Integration
- ✅ Database Transactions for Data Integrity
- ✅ Comprehensive Error Handling
- ✅ Input Validation and Sanitization
- ✅ CORS Configuration
- ✅ Environment Variables Management
- ✅ Database Migration Scripts
- ✅ Connection Pooling

---

## Installation Instructions

### Prerequisites
- **Node.js** (v14 or higher) - [Download](https://nodejs.org/)
- **PostgreSQL** (v12 or higher) - [Download](https://www.postgresql.org/download/)
- **npm** or **yarn** package manager (comes with Node.js)

### Step-by-Step Setup

#### 1. Clone the Repository
```bash
git clone [your-backend-repo-url]
cd campus-food-ordering-backend
```

#### 2. Install Dependencies
```bash
npm install
```

This will install all required packages including:
- express
- pg (PostgreSQL client)
- jsonwebtoken
- bcryptjs
- cors
- dotenv

#### 3. Set Up Environment Variables

Create a `.env` file in the `backend` directory:

```env
PORT=5000
NODE_ENV=development
DB_HOST=localhost
DB_PORT=5432
DB_NAME=your_database_name
DB_USER=your_database_user
DB_PASSWORD=your_database_password
JWT_SECRET=your_super_secret_jwt_key_here_make_it_long_and_random
```

> **Important**: 
> - Replace all placeholder values with your actual database credentials
> - Generate a strong, random JWT_SECRET (at least 32 characters)
> - Never commit the `.env` file to version control

#### 4. Set Up PostgreSQL Database

**Option A: Using Command Line (psql)**
```bash
# Create database
createdb your_database_name

# Connect to database
psql -U your_username -d your_database_name
```

**Option B: Using pgAdmin or Database GUI**
- Open pgAdmin or your preferred PostgreSQL GUI tool
- Create a new database
- Note down the connection details

#### 5. Create Database Tables

Run the following SQL commands in your PostgreSQL database:

```sql
-- Users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    room_number VARCHAR(50),
    is_admin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Menu items table
CREATE TABLE menu_items (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    original_price DECIMAL(10, 2),
    category VARCHAR(50) NOT NULL,
    image_url TEXT,
    available BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Orders table
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    total_amount DECIMAL(10, 2) NOT NULL,
    status VARCHAR(50) DEFAULT 'Pending',
    order_type VARCHAR(20) DEFAULT 'Inhouse',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Order items table
CREATE TABLE order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
    menu_item_id INTEGER REFERENCES menu_items(id),
    quantity INTEGER NOT NULL,
    price DECIMAL(10, 2) NOT NULL
);

-- Create indexes for better performance
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_menu_items_category ON menu_items(category);
CREATE INDEX idx_menu_items_available ON menu_items(available);
```

#### 6. Run Database Migrations (Optional)

If you have existing data or need to update the schema:

```bash
# Update category from Momo to Meals (if needed)
psql -U your_username -d your_database_name -f migrations/update_momo_to_meals.sql

# Add order_type column (if needed)
psql -U your_username -d your_database_name -f migrations/add_order_type.sql
```

#### 7. Create Test Data (Optional)

You can insert test data to get started:

```sql
-- Insert a test user (password: password123)
INSERT INTO users (name, email, password, is_admin) 
VALUES ('Test User', 'student@example.com', '$2a$10$YourHashedPasswordHere', FALSE);

-- Insert an admin user (password: admin123)
INSERT INTO users (name, email, password, is_admin) 
VALUES ('Admin User', 'admin@example.com', '$2a$10$YourHashedPasswordHere', TRUE);

-- Insert sample menu items
INSERT INTO menu_items (name, description, price, category, available) VALUES
('Cheese Burger', 'Delicious burger with cheese', 25.00, 'Burger', TRUE),
('Chicken Momo', 'Steamed chicken dumplings', 30.00, 'Meals', TRUE),
('Coca Cola', 'Refreshing soft drink', 5.00, 'Drinks', TRUE);
```

> **Note**: For actual passwords, use the registration endpoint or hash them using bcrypt.

#### 8. Start the Server

**Development Mode:**
```bash
npm start
```

**Production Mode:**
```bash
NODE_ENV=production npm start
```

The server will start on `http://localhost:5000`

#### 9. Verify Installation

Test the API by making a request:

```bash
# Using curl
curl http://localhost:5000/api/menu

# Or open in browser
http://localhost:5000/api/menu
```

You should receive a JSON response (empty array `[]` if no menu items exist).

### Project Structure

```
backend/
├── routes/
│   ├── auth.js          # Authentication routes (register, login, profile)
│   ├── menu.js          # Menu item routes (get, search, categories)
│   ├── orders.js        # Order routes (create, get, cancel)
│   └── admin.js         # Admin routes (manage orders, menu, stats)
├── middleware/
│   └── auth.js          # Authentication middleware (JWT verification, admin check)
├── db/
│   └── index.js         # Database connection and query helpers
├── migrations/           # Database migration scripts
│   ├── add_order_type.sql
│   └── update_momo_to_meals.sql
├── server.js            # Main server file (Express setup, routes, middleware)
├── package.json         # Dependencies and npm scripts
├── .env                 # Environment variables (create this, not in git)
└── .gitignore           # Git ignore file
```

### API Endpoints

#### Authentication Endpoints
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login and receive JWT token
- `GET /api/auth/profile` - Get current user profile (requires authentication)

#### Menu Endpoints
- `GET /api/menu` - Get all available menu items
- `GET /api/menu/:id` - Get a specific menu item by ID
- `GET /api/menu/category/:category` - Get items by category
- `GET /api/menu/meta/categories` - Get all available categories
- `GET /api/menu/meta/popular` - Get popular/featured items

#### Order Endpoints (Requires Authentication)
- `POST /api/orders` - Create a new order
- `GET /api/orders` - Get current user's orders
- `GET /api/orders/:id` - Get order details
- `DELETE /api/orders/:id` - Cancel an order (Pending only)

#### Admin Endpoints (Requires Admin Authentication)
- `GET /api/admin/orders` - Get all orders
- `GET /api/admin/orders/:id` - Get order details
- `PUT /api/admin/orders/:id/status` - Update order status
- `DELETE /api/admin/orders/:id` - Delete an order
- `GET /api/admin/menu` - Get all menu items (including unavailable)
- `POST /api/admin/menu` - Add a new menu item
- `PUT /api/admin/menu/:id` - Update a menu item
- `DELETE /api/admin/menu/:id` - Delete a menu item
- `GET /api/admin/stats` - Get dashboard statistics
- `GET /api/admin/stats/revenue` - Get revenue statistics
- `GET /api/admin/stats/top-items` - Get top selling items

### Environment Variables Reference

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `PORT` | Server port number | Yes | `5000` |
| `NODE_ENV` | Environment mode | Yes | `development` or `production` |
| `DB_HOST` | PostgreSQL host | Yes | `localhost` |
| `DB_PORT` | PostgreSQL port | Yes | `5432` |
| `DB_NAME` | Database name | Yes | `campus_food_db` |
| `DB_USER` | Database username | Yes | `postgres` |
| `DB_PASSWORD` | Database password | Yes | `your_password` |
| `JWT_SECRET` | Secret key for JWT tokens | Yes | `your_secret_key_here` |

### Troubleshooting

**Database Connection Errors**
- Verify PostgreSQL is running: `pg_isready` or check service status
- Confirm database credentials in `.env` file
- Ensure database exists: `psql -l` to list databases
- Check firewall settings if using remote database

**JWT Authentication Errors**
- Verify `JWT_SECRET` is set in environment variables
- Ensure token is sent in Authorization header: `Bearer <token>`
- Check token expiration (default: 24 hours)

**CORS Errors**
- Update CORS configuration in `server.js`
- Add your frontend URL to allowed origins
- For development: `origin: 'http://localhost:8000'`
- For production: `origin: 'https://your-frontend-url.github.io'`

**Port Already in Use**
- Change `PORT` in `.env` file to a different port
- Or kill the process: `lsof -ti:5000 | xargs kill` (Mac/Linux)

**Module Not Found Errors**
- Run `npm install` to install dependencies
- Check `package.json` for required packages
- Verify Node.js version: `node --version` (should be v14+)

### Deployment to Render

1. **Push code to GitHub**
   ```bash
   git add .
   git commit -m "Ready for deployment"
   git push origin main
   ```

2. **Create Render Web Service**
   - Go to [Render Dashboard](https://dashboard.render.com)
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Select the repository and branch

3. **Configure Build Settings**
   - **Name**: `campus-food-ordering-backend`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: Free or Paid (as needed)

4. **Set Environment Variables**
   Add all variables from your `.env` file:
   - `PORT` (Render sets this automatically, but you can override)
   - `NODE_ENV=production`
   - `DB_HOST` (from Render PostgreSQL)
   - `DB_PORT` (from Render PostgreSQL)
   - `DB_NAME` (from Render PostgreSQL)
   - `DB_USER` (from Render PostgreSQL)
   - `DB_PASSWORD` (from Render PostgreSQL)
   - `JWT_SECRET` (generate a new strong secret)

5. **Create PostgreSQL Database**
   - In Render Dashboard, create a new PostgreSQL database
   - Copy the connection details
   - Update environment variables with database credentials

6. **Deploy**
   - Click "Create Web Service"
   - Render will automatically build and deploy
   - Monitor the logs for any errors
   - Your API will be available at `https://your-service.onrender.com`

7. **Run Migrations on Render**
   - Use Render's PostgreSQL web console or connect via psql
   - Run the database schema creation SQL
   - Run any migration scripts if needed

---

## Technologies Used

- **Node.js**: JavaScript runtime environment
- **Express.js**: Web application framework
- **PostgreSQL**: Relational database management system
- **pg**: PostgreSQL client for Node.js
- **jsonwebtoken**: JWT token generation and verification
- **bcryptjs**: Password hashing library
- **cors**: Cross-origin resource sharing middleware
- **dotenv**: Environment variable management

---

## Database Schema

### Tables Overview

**users**
- Stores user account information
- Fields: id, name, email, password (hashed), room_number, is_admin, created_at

**menu_items**
- Stores food menu items
- Fields: id, name, description, price, original_price, category, image_url, available, created_at

**orders**
- Stores order records
- Fields: id, user_id (FK), total_amount, status, order_type, created_at, updated_at

**order_items**
- Stores individual items within orders
- Fields: id, order_id (FK), menu_item_id (FK), quantity, price

---

## Security Features

- ✅ Password hashing with bcrypt (salt rounds: 10)
- ✅ JWT token-based authentication
- ✅ SQL injection prevention (parameterized queries)
- ✅ CORS configuration for cross-origin requests
- ✅ Input validation and sanitization
- ✅ Error handling without exposing sensitive information
- ✅ Environment variables for sensitive data
- ✅ Admin role verification middleware

---

## License

This project is licensed under the ISC License.

---

## Contact

For questions, issues, or support, please open an issue in the GitHub repository.

---

## Acknowledgments

- Academic City University
- All contributors and testers
