# Super MERN Bros. - AI-Powered Retro Arcade Game

Super MERN Bros is a modern web-based recreation of the classic Mario platformer built using the MERN stack (MongoDB, Express, React, Node.js) and an HTML5 Canvas physics engine. It stands out by integrating an OpenAI-powered level designer that builds playable custom maps from natural language descriptions.

## 🌟 Key Features

1. **HTML5 Canvas Platformer Engine**:
   - High-performance, frame-rate independent physics (run, jump, stomp Goombas, collect gold coins, slide flagpole, castle walk).
   - Pixel-art procedural rendering engine.
2. **🤖 AI-Powered Level Generator**:
   - Describe a stage (e.g. `"hard level with lots of gaps and enemies"`) to generate a unique, playable level instantly.
   - Leverages OpenAI's GPT-3.5 model (returning structured JSON tile maps).
   - Includes a smart **local procedural fallback** if your OpenAI key runs out of quota.
3. **📂 Database Level Saving & Sharing**:
   - Levels are persisted in MongoDB (with automatic local cache fallback for offline testing).
   - Generates a unique, copyable link to share custom AI levels so others can play them.
4. **📱 Mobile Touch Controls**:
   - Clean, neon-styled virtual arcade controller (D-pad Left/Right directions, circular JUMP button) for playability on phones and tablets.
5. **🔐 Authentication & Leaderboard**:
   - Secure login/signup using JWT.
   - Global retro arcade scoreboard tracking high scores.

---

## 🛠️ Technology Stack

- **Frontend**: React (Vite), CSS Grid/Flexbox, Lucide React (Icons), HTML5 Canvas.
- **Backend**: Node.js, Express.
- **Database**: MongoDB (Mongoose).
- **AI Agent**: OpenAI API.

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) installed locally.
- [MongoDB](https://www.mongodb.com/) running locally (or an Atlas URI).

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/Shreya-1302/Mario-Game.git
   cd Mario-Game
   ```

2. Install dependencies for the server:
   ```bash
   cd server
   npm install
   ```

3. Install dependencies for the client:
   ```bash
   cd ../client
   npm install
   ```

### Configuration

Create a `.env` file in the `server` directory (or use the configured `server/.env` template):
```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/mario
JWT_SECRET=your_jwt_secret_key
OPENAI_API_KEY=your_openai_api_key
```

### Running the App

1. Start the backend server (from `/server`):
   ```bash
   npm run dev
   ```

2. Start the Vite client dev server (from `/client`):
   ```bash
   npm run dev
   ```

3. Open your browser and navigate to `http://localhost:5173/`.

---

## 🎮 Game Controls
- **Move Left**: `A` / `←` (Left Arrow) / Virtual `◀` button.
- **Move Right**: `D` / `→` (Right Arrow) / Virtual `▶` button.
- **Jump**: `Space` / `W` / `↑` (Up Arrow) / Virtual `A` button.
- **Restart**: `R` key / Reset button.
- **Exit to Menu**: `ESC` key / Menu button.
