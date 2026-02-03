## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`

3. Run the app:
   `npm run dev`

Notes:

   *byaun naka local storage pa katan data (wayruun database)

1. connect na lang pa firebase + cloudinary para ha images and pdfs (mga connect-an):
   - Login (mag-set superadmin + officers account)
   - About (edit page *SUPERADMIN + Officers)
   - AdminDashboard (para mahinang editable in content sin landing page nila *SUPERADMIN only)
   - Budget (real data CRUD)
   - Home (connect in VIEW pa mga dugaing pages na awn na database)
   - LegislativeHub (real data CRUD)
   - Officers (real data CRUD)
   * ipacheck mo narin in mga ha /src

2. remove-un na in mock data:
   - /constants.tsx

3. butang in mga KEY ha env.

4. deploy na pagtuy

Tech stack nagamit:
-TypeScript (Programming Language)
-Node.js (Runtime Server)
-React (Library)
-Vite (Framework)