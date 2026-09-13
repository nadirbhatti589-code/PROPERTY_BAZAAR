# PropertyBazaar Backend (MongoDB + Express)

Ye backend ka Phase 1 hai: **database models** (Mongoose schemas) aur ek basic
server jo MongoDB se connect ho sakta hai. Abhi API routes (create/read/update/delete)
add nahi kiye — wo agla step hoga.

## Models banaye gaye hain:

- **User** — buyer, seller, agent, admin. Email/password ya Google signup. Optional CNIC verification.
- **Agent** — User se linked, license number/document, verification status, rating.
- **Property** — house/apartment/plot, buy/rent, location (city/area + geo coordinates for map), images, amenities.
- **Inquiry** — buyer se seller/agent ko messages (chat feature ka base).
- **Favorite** — user ki wishlist.

## Setup karne ke steps:

1. **Node.js installed hona chahiye** (v18+ recommended). Check karo: `node -v`

2. **Dependencies install karo:**
   ```
   npm install
   ```

3. **MongoDB connection setup karo:**
   - `.env.example` file ko copy karke `.env` banao
   - `MONGO_URI` mein apna MongoDB connection string dalo:
     - **Local MongoDB** (agar apne PC pe install kiya hai): `mongodb://localhost:27017/propertybazaar`
     - **MongoDB Atlas (cloud, free tier)** — recommend karta hoon ye use karo kyunki Vercel pe deploy karoge, to database bhi cloud mein hona chahiye:
       1. [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas) pe free account banao
       2. Free cluster (M0) create karo
       3. Database user banao (username/password)
       4. Network Access mein "Allow access from anywhere" (0.0.0.0/0) add karo — Vercel se connect karne ke liye zaroori hai
       5. "Connect" > "Drivers" se connection string copy karo aur `.env` mein paste karo

4. **Server run karo:**
   ```
   npm run dev
   ```
   Agar sab sahi hai to terminal mein dikhega:
   ```
   MongoDB Connected: cluster0-xxxxx.mongodb.net
   Server running on port 5000
   ```

5. Browser mein `http://localhost:5000` khol kar check karo — `{"message": "PropertyBazaar API is running"}` dikhna chahiye.

## Image Upload (Cloudinary) Setup

1. [cloudinary.com](https://cloudinary.com) pe free account banao
2. Dashboard pe login karne ke baad, top pe teen cheezein dikhengi: **Cloud Name**, **API Key**, **API Secret**
3. In teeno ko `.env` file mein daalo:
   ```
   CLOUDINARY_CLOUD_NAME=your_cloud_name
   CLOUDINARY_API_KEY=your_api_key
   CLOUDINARY_API_SECRET=your_api_secret
   ```
4. `npm install` dobara chalao (nayi packages — cloudinary, multer — install karne ke liye)

### Upload endpoint test karna

Server chalane ke baad, Postman (ya koi bhi API testing tool) mein:
- **POST** `http://localhost:5000/api/upload`
- Body: `form-data` type select karo
- Key: `images` (type: File), aur ek ya zyada images select kar sakte ho (max 10)
- Response mein Cloudinary URLs milengi, jo aap Property banate waqt `images` array mein save karoge

## API Routes (Phase 2 — Auth, Properties, Agents, Favorites, Inquiries, Admin)

### Auth — `/api/auth`
| Method | Route | Description | Auth required |
|---|---|---|---|
| POST | `/register` | Signup with name, email, password, phone, role (buyer/seller/agent) | No |
| POST | `/login` | Login with email, password | No |
| POST | `/google` | Google sign-in (body: `{ idToken }` from frontend Google Sign-In) | No |
| GET | `/me` | Get currently logged-in user | Yes |

### Properties — `/api/properties`
| Method | Route | Description | Auth required |
|---|---|---|---|
| GET | `/` | Search/browse properties. Query params: `listingType, category, city, area, minPrice, maxPrice, bedrooms, bathrooms, search, page, limit` | No |
| GET | `/mine` | Listings posted by the logged-in user | Yes |
| GET | `/:id` | Get one property (increments view count) | No |
| POST | `/` | Create a listing (starts as `pending_approval`) | Yes (seller/agent) |
| PUT | `/:id` | Update a listing (owner or admin only) | Yes |
| DELETE | `/:id` | Delete a listing (owner or admin only) | Yes |

### Agents — `/api/agents`
| Method | Route | Description | Auth required |
|---|---|---|---|
| POST | `/apply` | Submit license info to become a verified agent | Yes |
| GET | `/me` | Get your own agent profile | Yes |
| GET | `/:id` | Public agent profile | No |

### Favorites — `/api/favorites`
| Method | Route | Description | Auth required |
|---|---|---|---|
| GET | `/` | Your favorited properties | Yes |
| POST | `/:propertyId` | Add a property to favorites | Yes |
| DELETE | `/:propertyId` | Remove from favorites | Yes |

### Inquiries — `/api/inquiries`
| Method | Route | Description | Auth required |
|---|---|---|---|
| POST | `/` | Send an inquiry (body: `{ propertyId, message }`) | Yes |
| GET | `/sent` | Inquiries you've sent | Yes |
| GET | `/received` | Inquiries about your listings | Yes |
| PATCH | `/:id/read` | Mark an inquiry as read | Yes |

### Admin — `/api/admin` (all routes require `role: admin`)
| Method | Route | Description |
|---|---|---|
| GET | `/stats` | Dashboard overview numbers |
| GET | `/properties/pending` | Listings awaiting approval |
| PATCH | `/properties/:id/approve` | Approve a listing |
| PATCH | `/properties/:id/reject` | Reject a listing |
| GET | `/agents/pending` | Agents awaiting verification |
| PATCH | `/agents/:id/verify` | Verify an agent |
| PATCH | `/agents/:id/reject` | Reject an agent (body: `{ reason }`) |
| GET | `/users` | List all users |
| PATCH | `/users/:id/block` | Toggle block/unblock a user |

## How authentication works

1. Call `/api/auth/register` or `/api/auth/login` — you get back a `token`
2. For every protected route, send that token in the request header:
   ```
   Authorization: Bearer <token>
   ```
3. There is no public "become admin" route on purpose — to create your first admin
   user, register normally, then manually change that user's `role` to `"admin"`
   directly in MongoDB Atlas (Database > Browse Collections > users > edit the document).

## Testing the API

Use [Postman](https://www.postman.com/downloads/) or the "Thunder Client" VS Code extension:

1. **Register:** POST `http://localhost:5000/api/auth/register` with JSON body:
   ```json
   { "name": "Test Seller", "email": "seller@test.com", "password": "test1234", "role": "seller" }
   ```
2. Copy the `token` from the response.
3. **Create a property:** POST `http://localhost:5000/api/properties` with header
   `Authorization: Bearer <token>` and a JSON body matching the Property model fields.
4. **Browse properties:** GET `http://localhost:5000/api/properties` (no auth needed) — but note it won't show up until an admin approves it (status becomes `available`).

## Agla step

Backend core (models + auth + properties + agents + favorites + inquiries + admin) is ready.
Agla phase mein React frontend banayenge jo in APIs ko consume karega.
