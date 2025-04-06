<p align="center">
  <img src="./frontend/public/chess.svg" width="200" height="200" alt="ChessApp Logo"/>
</p>

<h1 align="center">ChessApp</h1>

<p align="center">
  A real-time multiplayer chess application built with React, Node.js, and Socket.IO.
</p>

![ChessApp Screenshot](./frontend/public/chess.png)

---

## Features

- **Real-Time Gameplay**: Play chess with friends or random opponents in real-time.
- **Timer Support**: Configurable timers for competitive matches.
- **Role Assignment**: Automatic assignment of white and black roles.
- **Responsive Design**: Optimized for both desktop and mobile devices.
- **User Authentication**: Secure login and user management.
- **Game Persistence**: Save and load games using a backend database.

---

## Tech Stack

### Frontend
- **React**: For building the user interface.
- **Socket.IO Client**: For real-time communication.
- **Tailwind CSS**: For styling.
- **Vite**: For fast development and build tooling.

### Backend
- **Node.js**: For server-side logic.
- **Express**: For handling API routes.
- **Socket.IO**: For WebSocket-based real-time communication.
- **Redis**: For session management and game state storage.

### Deployment
- **Docker**: For containerized deployment.
- **Nginx**: For reverse proxy and static file serving.

---

## Getting Started

### Prerequisites
- **Node.js** (v18 or higher)
- **Docker** (optional, for containerized deployment)
- **Redis** (for game state storage)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/chessApp.git
   cd chessApp
   ```

2. Install dependencies for both frontend and backend:
   ```bash
   cd frontend
   npm install
   cd ../backend
   npm install
   ```

3. Run the application:
   ```bash
   docker-compose up --build
   ```

4. Access the application at `http://localhost`.
5. If running without the docker you will need to install the redis-server, acess to postgres database and also adjust the env variables. This process could be highly time consuming so not recommended.

### Environment Configuration

Before running the application, ensure you configure the `.env` file with the appropriate values. Below is an example of the required environment variables:

```properties
PORT=3000

# Google OAuth2 credentials for authentication
GOOGLE_CLIENT_ID=your-google-client-id # Replace with your Google OAuth2 Client ID
GOOGLE_CLIENT_SECRET=your-google-client-secret # Replace with your Google OAuth2 Client Secret

# JWT secret key
SECRET_KEY_JWT=your-secret-key # Replace with a strong secret key

# CORS origin
CORS_ORIGIN=http://localhost # Change to your deployed URL if applicable

# Database configuration
DB_USER=your-database-username # Replace with your database username
DB_HOST=your-database-host # Replace with your database host (e.g., localhost or postgres)
DB_DATABASE=your-database-name # Replace with your database name
DB_PASSWORD=your-database-password # Replace with a strong database password
DB_PORT=5432 # Default database port, change if necessary

# Application URL
URL=http://localhost # Change to your deployed URL if applicable

# Redis configuration
REDIS_HOST=redis # Keep as it is unless Redis is hosted elsewhere
REDIS_PORT=6379 # Default Redis port, keep as it is
```

Ensure all values are correctly set before starting the application. If you are unsure about any value, refer to the documentation or contact the project maintainer.


### Hosting on DigitalOcean

The application is hosted on a DigitalOcean droplet. The following services are used for hosting and security:

- **Cloudflare**: Manages DNS and provides additional security features like DDoS protection.
- **Let's Encrypt**: Provides a free SSL certificate for secure HTTPS connections.

To replicate the hosting setup:

1. Deploy the application on a DigitalOcean droplet using Docker or a manual setup.
2. Point your domain's DNS to the droplet's IP address using Cloudflare.
3. Use Certbot to obtain and renew an SSL certificate from Let's Encrypt:
   ```bash
   sudo certbot --nginx
   ```

4. Ensure Nginx is configured to serve the application over HTTPS.

---

## Contributing

Contributions are welcome! To contribute:

1. Fork the repository.
2. Create a new branch for your feature or bugfix:
   ```bash
   git checkout -b feature-name
   ```
3. Commit your changes:
   ```bash
   git commit -m "Add feature-name"
   ```
4. Push to your branch:
   ```bash
   git push origin feature-name
   ```
5. Open a pull request.

---

## License

This project is licensed under the MIT License. See the [LICENSE](./LICENSE) file for details.
