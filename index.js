const express = require('express');
const app = express();
const { Server } = require("socket.io");

app.get('/:gameId', (req, res) => {
  res.sendFile(__dirname + '/chameleon-frontend/dist/index.html');
});

app.use(express.static('chameleon-frontend/dist'));

const server = app.listen(3000, () => {
  console.log('listening on *:3000');
});

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

let games = {
  // the key is the game ID
}

const socketsToGames = {
  // key is the socket ID, value is the game ID
}

function getRandomInt(min, max) { // min and max included
  return Math.floor(Math.random() * (max - min + 1) + min)
}

// Function to generate number between two numbers

const startRound = (game) => {
  console.log('starting round')
  // Pick a person to choose the category
  const users = Object.values(game.activeUsers);
  const selectingUser = getRandomInt(0, users.length - 1);
  let chameleonUser;
  let startingUser;

  do {
    chameleonUser = getRandomInt(0, users.length - 1);
  } while (chameleonUser === selectingUser);

  do {
    startingUser = getRandomInt(0, users.length - 1);
  } while (startingUser === chameleonUser);

  game.chameleon = users[chameleonUser];
  game.selecting = users[selectingUser];
  game.starting = users[startingUser];

  game.inProgress = true;

  io.to(game.id).emit('start-game', {
    selecting: game.selecting,
    chameleon: game.chameleon,
    starting: game.starting
  });
}

const getUserItemForUsername = (game, username) => {
  return Object.values(game.activeUsers).find((activeUser) => activeUser.username === username);
}

const updateUsers = (game) => {
  if (!game) {
    return;
  }

  io.to(game.id).emit('user-list', game.activeUsers);
}

io.on('connection', (socket) => {
  let game;

  socket.on('new-user', ({username, gameId}) => {
    if (!games[gameId]) {
      console.log('the game does not exist already', gameId)
      games[gameId] = {
        activeUsers: {},
        cachedUsers: {},
        votes: {},
        running: false,
        id: gameId,
        totalVotes: 0,
      };
    }

    game = games[gameId];
    // Inherit a cached user if it exists
    if (game.cachedUsers[username]) {
      game.activeUsers[socket.id] = game.cachedUsers[username];
      delete game.cachedUsers[username];
    } else {
      game.activeUsers[socket.id] = {username: username, ready: false, points: 0};
    }

    socket.join(gameId);
    updateUsers(game);
  });

  socket.on('user-ready', (checked) => {
    if (game.inProgress) {
      return;
    }

    game.activeUsers[socket.id].ready = !!checked;

    const allUsersReady = Object.values(game.activeUsers).every(user => user.ready);
    updateUsers(game);
    if (allUsersReady && Object.values(game.activeUsers).length > 2) {
      console.log('all users are ready lets gooo');
      startRound(game)
    }
  });

  socket.on('start-voting', () => {
    console.log('voting started')
    io.to(game.id).emit('voting-started');
  })

  socket.on('select-category', (category) => {
    console.log('category chosen', category)
    game.category = category;
    io.to(game.id).emit('category-selected', category);
  });

  socket.on('vote-submitted', ({username, vote}) => {
    console.log(`voted submitted by ${username} for ${vote}`);

    if (!game.votes[vote]) {
      game.votes[vote] = [];
    }

    game.totalVotes += 1;
    game.votes[vote].push(username);

    if (game.totalVotes === Object.values(game.activeUsers).length) {
      // Voting has finished, total up
      // Get the maximum number of votes for any one
      // If it's the only one, that's the winner, otherwise nobody was voted
      let maxVotes = 0;
      Object.values(game.votes).forEach(votes => {
        if (votes.length > maxVotes) {
          maxVotes = votes.length;
        }
      });
      // So the highest number is maxVotes. Now identify which this applies to
      const numberMatchingMaxVotes = Object.values(game.votes).filter(votes => votes.length === maxVotes);
      let win = false;
      if (numberMatchingMaxVotes.length > 1) {
        // No one was agreed upon, give the chameleon three points as they evaded
        // Give the chameleon three points as they evaded
        const chameleonUser = getUserItemForUsername(game, game.chameleon.username);
        chameleonUser.points += 3;
        // Also give anybody who guessed correctly a point
        if (game.votes[game.chameleon.username]) {
          game.votes[game.chameleon.username].forEach((voter) => {
            const user = getUserItemForUsername(game, voter);
            user.points += 1;
          })
        }
      } else {
        // One chameleon was 'voted for', who was it?
        const username = Object.keys(game.votes).find(votedName => game.votes[votedName].length === maxVotes);
        // Was it correct?
        if (game.chameleon.username === username) {
          // Give all of those people a point
          game.votes[username].forEach((voter) => {
            const user = getUserItemForUsername(game, voter);
            user.points += 1;
          });
          win = true;
        } else {
          // Give the chameleon three points as they evaded
          const chameleonUser = getUserItemForUsername(game, game.chameleon.username);
          chameleonUser.points += 3;
          // Also give anybody who guessed correctly a point
          if (game.votes[game.chameleon.username]) {
            game.votes[game.chameleon.username].forEach((voter) => {
              const user = getUserItemForUsername(game, voter);
              user.points += 1;
            });
          }
        }
      }

      game.inProgress = false;
      io.to(game.id).emit('chameleon-revealed', {chameleon: game.chameleon.username, win});
      Object.values(game.activeUsers).forEach((user) => {
        user.ready = false;
      })
      updateUsers(game);

      // Clean up votes
      game.votes = {};
      game.totalVotes = 0;
    }
  });

  socket.on('disconnect', () => {
    console.log('the user disconnected :(', game)

    // Remove the user from the game
    if (!game) {
      return;
    }

    socket.leave(game.id)

    const user = game.activeUsers[socket.id];
    game.cachedUsers[user.username] = game.activeUsers[socket.id];
    delete game.activeUsers[socket.id];
    updateUsers(game);

    if (Object.values(game.activeUsers).length === 0) {
      // Remove the game if there are no users left
      delete games[game.id];
    }
  });
});

