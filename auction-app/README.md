# Live Auction Application

A complete role-based live auction application built with Ionic (Angular), Node.js, Express.js, MongoDB, and Socket.IO.

## Tech Stack

- **Frontend**: Ionic (Angular)
- **Backend**: Node.js, Express.js
- **Database**: MongoDB (Mongoose)
- **Realtime**: Socket.IO
- **Authentication**: JWT

## Roles & Permissions

### SUPER_ADMIN
- Create / edit / delete tournament
- Create captain admin accounts
- Assign teams to captains
- Start / stop auction
- Add / edit / delete players even during live auction
- View all sold players with team & captain name

### CAPTAIN_ADMIN
- Can only see assigned tournaments
- Can enter tournament
- Starts with fixed purse amount (configurable, e.g. 10000)
- Can bid in live auction
- Can view list of players bought by them

### PLAYER
- Everyone can register
- Default role is PLAYER
- Can only see tournament list
- Can only view live auction (NO bidding)

## Project Structure

```
auction-app/
├── backend/
│   ├── src/
│   │   ├── controllers/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── middleware/
│   │   ├── services/
│   │   ├── socket/
│   │   └── app.js
│   ├── package.json
│   └── .env
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── pages/
│   │   │   ├── services/
│   │   │   ├── guards/
│   │   │   └── components/
│   │   └── environments/
│   ├── package.json
│   └── ionic.config.json
└── README.md
```

## Setup Instructions

### Backend Setup
1. Navigate to backend directory
2. Install dependencies: `npm install`
3. Create `.env` file with MongoDB connection string and JWT secret
4. Start server: `npm start`

### Frontend Setup
1. Navigate to frontend directory
2. Install dependencies: `npm install`
3. Start Ionic app: `ionic serve`

## Features

- Fully automated auction system
- Real-time bidding with Socket.IO
- Role-based access control
- Player registration with profile images
- Tournament management
- Team assignment
- Live auction timer (20 seconds per player)
- No unsold players concept
- Automatic player progression

## Database Models

- User (role-based authentication)
- Team
- Tournament
- TournamentTeam (tournament + team + captain + purse)
- AuctionPlayer (auction player data)
- AuctionState (current player, timer, bid, status)
- BidHistory

## Socket.IO Events

- `auction:start` - Start the auction
- `auction:next-player` - Move to next player
- `auction:bid` - Place a bid
- `auction:timer-update` - Timer updates
- `auction:end` - Auction ended
