# 🌐 Agent Universe

A massive-scale AI agent management ecosystem and autonomous application builder. Manage 1 Crore AI agents across 6 specialized industries and 22+ factories, with instant goal synthesis, live interactive sandbox app generation, auto/manual swarm scaling, and universal convergence mode.

---

## 🚀 Deploying to Render

### Option 1: Render Web Service (Recommended)
1. Push this repository to **GitHub** or **GitLab**.
2. Log in to [Render Dashboard](https://dashboard.render.com/).
3. Click **New +** → **Web Service**.
4. Connect your GitHub/GitLab repository.
5. Set the following settings:
   - **Name**: `agent-universe`
   - **Runtime**: `Node`
   - **Build Command**: *(leave empty)*
   - **Start Command**: `node server.js`
   - **Instance Type**: `Free`
6. Click **Deploy Web Service**!

### Option 2: Render Static Site (100% Free CDN)
1. In Render Dashboard, click **New +** → **Static Site**.
2. Connect your repository.
3. Set the following settings:
   - **Name**: `agent-universe`
   - **Build Command**: *(leave empty)*
   - **Publish Directory**: `.`
4. Click **Create Static Site**!

### Option 3: Render Blueprint (1-Click)
Because this repository contains [`render.yaml`](render.yaml), you can also click **New +** → **Blueprint** and connect the repository for automatic provisioning!

---

## 💻 Running Locally

```bash
# Using Node.js
node server.js

# Or using Python 3
python3 -m http.server 8080
```

Open [http://localhost:8080](http://localhost:8080) in your browser.
