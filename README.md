# The City App

An AI-powered, GPS-enabled mobile-first Progressive Web App (PWA) serving the transportation, commerce, and emergency safety needs of **Redemption City**, Ogun State, Nigeria. 

The City App acts as the digital coordination layer for Redemption City—a privately owned city spanning **2,500 hectares** with an estimated **200,000 residents** (as of 2023), distributed across key estates including Haggai Estates 1–11, Goshen Estate, Tree of Life Estate, Covenant Estate, and Green Pastures Estate.

---

## 🏙 Key Problems Solved

1. **The Transportation Gap**: Replaces informal, unreliable tricycle (Keke NAPEP) summoning with real-time GPS dispatching to reduce average wait times to under 8 minutes.
2. **The Food Delivery Gap**: Onboards local food kitchens and restaurants (e.g., RCCG City Kitchen on Macedonia Road, Redemption Resort Dining) to a digital commerce catalog, leveraging the Keke network for last-mile delivery.
3. **The Emergency Response Gap**: Eliminates dependency on personal phone lists during safety/medical crises by implementing a 1-tap, GPS-linked Emergency dispatch system connecting residents to Redeemer's Health Village Hospital (24-hour) and camp security personnel.

---

## 🔑 Five-Role Architecture (RBAC)

The platform enforces strict role-based access control (RBAC) across five user roles:

1. **Commuter (Resident / Visitor)**
   - **Move**: Set pickup/dropoff pins on Google Maps, preview estimated fares, matching with the nearest available Keke/Okada/Car.
   - **Eat**: Browse restaurant menus, configure orders, and track deliveries in real time.
   - **Stay Safe**: A persistent, red **SOS** action button captures GPS coordinates immediately at the first tap, allowing residents to select *Health* or *Security* and confirm alert routing.

2. **Transport Provider (Keke / Okada / Car Driver)**
   - **Dashboard**: Toggle online/offline to broadcast live location to nearby commuters.
   - **Fulfillment**: Review incoming passenger or delivery requests, accept orders, and navigate using interactive map route polylines.
   - **Earnings & History**: Manage earnings, view completed logs, and submit payout requests (OPay-linked).

3. **Food Vendor (Shop / Restaurant)**
   - **Storefront**: Set business logo, backdrop, description, and operating hours.
   - **Catalogue**: Create, edit, and toggle availability of menu items.
   - **Order Fulfillment**: Track active orders from pending to prepared, then assign them to available Kekes for delivery.
   - **Ratings**: View average customer ratings and reply to feedback directly.

4. **Emergency Health Personnel (Redeemer's Health Village)**
   - **AAL2 Gated Credentials**: Admin-provisioned access (cannot sign up publicly).
   - **Incident Response**: Live feed showing health alerts, mapping route polylines to victim locations, calling residents, and accessing vital **Health Profiles** (Blood Type, Allergies, Medical Conditions, and Emergency Contacts).

5. **Emergency Security Personnel (Camp Security)**
   - **Incident Response**: Dedicated alerts feed showing active security alerts, with live GPS location tracking to dispatch officers.
   - **Broadcast**: Compose and send high-priority safety warnings or general advisories to all residents in selected areas.

---

## 🛠 Technology Stack

- **Frontend Core**: React 19 (compiled with Vite)
- **State & Caching**: TanStack Query (React Query)
- **Routing**: TanStack Router (configured via route-based file structure in `src/routes/`)
- **Map Services**: Google Maps API via `@vis.gl/react-google-maps` (supporting geofence boundary polygons and direction routing polylines)
- **Database & Auth**: Supabase (PostgreSQL with PostGIS for spatial coordinates, realtime subscriptions for location updates, and secure JWT-based auth guards)
- **SMS/OTP**: Africa's Talking / Twilio mock integration (sending 6-digit OTP codes)

---

## 💻 Local Development Setup

### Prerequisites
- Node.js v22+

### 1. Environment Configuration
Create a `.env` file in the root directory:
```env
VITE_SUPABASE_URL=your-supabase-project-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
VITE_GOOGLE_MAPS_API_KEY=your-google-maps-api-key
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Run Vite Development Server
```bash
npm run dev
```
The application will launch on [http://localhost:8080/](http://localhost:8080/).

### 4. Build Production Bundle & Type Checks
```bash
# Verify TypeScript compilation compiles cleanly
npx tsc --noEmit

# Compile the bundle
npm run build
```
