# Multiplayer Canvas Game

A real-time multiplayer game where 2-5 players can move circles on a shared canvas using WebSocket communication.

## Project Structure

```
game-project/
├── backend/
│   ├── server.js       # Node.js WebSocket server
│   └── package.json    # Dependencies
├── frontend/
│   ├── index.html      # Game UI
│   ├── styles.css      # Styling
│   └── game.js         # Game client logic
└── README.md
```

## Phase 1 & 2: Local Development

### Prerequisites
- Node.js (v14 or higher)
- npm

### Setup & Run Locally

1. **Install backend dependencies:**
```bash
cd backend
npm install
```

2. **Start the server:**
```bash
npm start
```
The server will run on `http://localhost:8080`

3. **Open the frontend:**
- Open `frontend/index.html` in a web browser (use a simple HTTP server)
- Or use VS Code's Live Server extension
- Or run: `python -m http.server 5000` in the frontend directory and visit `http://localhost:5000`

4. **Test with multiple players:**
- Open the game in multiple browser windows/tabs
- Use Arrow Keys or WASD to move circles
- Watch real-time synchronization

### Game Features Implemented

✅ Player connection/disconnection
✅ Real-time position synchronization
✅ Multi-player rendering (2-5 players per game)
✅ Keyboard controls (Arrow Keys / WASD)
✅ Boundary checking
✅ Player name and color assignment
✅ Live player list
✅ Connection status indicator

---

## Phase 3: AWS Deployment (Step-by-Step)

### Step 1: Prepare Your Code for AWS

1. Create a `.gitignore` file in the project root:
```
node_modules/
.DS_Store
```

2. Update the frontend WebSocket URL in `frontend/game.js`:
   - Line 32: The code already handles this automatically. It detects localhost for development and uses the hostname for production.

### Step 2: Create AWS Account & EC2 Instance

1. **Go to AWS Console:**
   - Visit https://aws.amazon.com
   - Sign in or create an account

2. **Navigate to EC2:**
   - Search for "EC2" in the search bar
   - Click "EC2" under "Services"

3. **Launch a new instance:**
   - Click "Instances" (left sidebar)
   - Click "Launch instances" button
   - Choose an AMI: Select **Ubuntu Server 22.04 LTS** (free tier eligible)
   - Instance type: **t2.micro** (free tier)
   - Click "Review and Launch"

4. **Configure security group:**
   - Before launching, click "Edit security groups"
   - Add these inbound rules:
     - Type: **SSH**, Port: **22**, Source: **Anywhere** (0.0.0.0/0)
     - Type: **Custom TCP**, Port: **8080**, Source: **Anywhere** (0.0.0.0/0)
     - Type: **HTTP**, Port: **80**, Source: **Anywhere**
     - Type: **HTTPS**, Port: **443**, Source: **Anywhere**

5. **Create or select a key pair:**
   - Create new: Enter a name like "game-server-key"
   - Download the `.pem` file (save it securely!)
   - Click "Launch instances"

6. **Get the instance details:**
   - Go to Instances page
   - Copy the **Public IPv4 address** (e.g., `54.123.45.67`)

### Step 3: Connect to Your EC2 Instance

**On Windows (using PowerShell or Command Prompt):**

1. Navigate to where you saved the `.pem` file:
```powershell
cd C:\Users\YourUsername\Downloads
```

2. Set permissions (Windows PowerShell as Admin):
```powershell
icacls "game-server-key.pem" /grant:r "$env:USERNAME":"(F)"
icacls "game-server-key.pem" /inheritance:r
```

3. SSH into the instance:
```powershell
ssh -i "game-server-key.pem" ubuntu@YOUR_EC2_PUBLIC_IP
```
Replace `YOUR_EC2_PUBLIC_IP` with your instance's public IP address

### Step 4: Install Node.js on EC2

Once connected via SSH:

```bash
# Update package manager
sudo apt update
sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node --version
npm --version
```

### Step 5: Upload Your Code to EC2

**From your local machine (in PowerShell/Command Prompt):**

```bash
# Create folder on EC2
ssh -i "game-server-key.pem" ubuntu@YOUR_EC2_PUBLIC_IP "mkdir -p /home/ubuntu/game"

# Upload backend
scp -i a01489105.pem -r "C:\Users\sijee\OneDrive\Desktop\ssd\Cloud\og\backend" ubuntu@34.219.157.125:/home/ubuntu/game/

# Upload frontend
scp -i a01489105.pem -r "C:\Users\sijee\OneDrive\Desktop\ssd\Cloud\og\frontend" ubuntu@34.219.157.125:/home/ubuntu/game/
```

### Step 6: Start the Server on EC2

1. SSH back into EC2:
```bash
ssh -i a01489105.pem ubuntu@34.219.157.125
```

2. Install dependencies and start server:
```bash
cd /home/ubuntu/game/backend
npm install
npm start
```

The server should show:
```
Game server running on port 8080
WebSocket endpoint: ws://localhost:8080
```

3. Keep this terminal open, or run in background:
```bash
nohup npm start > server.log 2>&1 &
```

### Step 7: Set Up a Simple HTTP Server for Frontend

1. In another SSH terminal:
```bash
cd /home/ubuntu/game/frontend
sudo npm install -g http-server
http-server -p 80
```

Or use Python (usually pre-installed):
```bash
cd /home/ubuntu/game/frontend
sudo python3 -m http.server 80
```

### Step 8: Update Frontend for AWS

Since the frontend loads from EC2, it needs to connect to the WebSocket on the same server.

No changes needed! The `game.js` automatically detects the hostname and uses it for WebSocket connections.

### Step 9: Access Your Game

Open in browser:
```
http://YOUR_EC2_PUBLIC_IP
```

Invite friends, share the URL, and play!

---

## Making Server Persistent

To keep your server running after SSH disconnect:

**Option 1: Using nohup (simple)**
```bash
cd /home/ubuntu/game/backend
nohup npm start > server.log 2>&1 &
```

**Option 2: Using PM2 (recommended)**
```bash
npm install -g pm2
pm2 start npm --name "game-server" -- start
pm2 startup
pm2 save
```

---

## Monitoring & Troubleshooting

**Check if server is running:**
```bash
curl http://localhost:8080
```

**View server logs:**
```bash
cat /home/ubuntu/game/backend/server.log
```

**Kill a port:**
```bash
sudo lsof -ti:8080 | xargs kill -9
```

---

## Cost Estimation

- **EC2 t2.micro**: ~$9.50/month or free (first 12 months for new AWS accounts)
- **Data transfer**: Minimal for this game
- **Total**: Essentially free in first year with AWS free tier

---

## Next Steps (Phase 4 - Optional)

- Add collision detection
- Add scoring system
- Use DynamoDB for storing high scores
- Use CloudFront for CDN distribution
- Add SSL certificate (AWS Certificate Manager)
