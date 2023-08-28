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

const GAME_STATE = {
  PLAYING: 'playing',
  SELECTING_CATEGORY: 'selecting_category',
  VOTING: 'voting'
}

// Function to generate number between two numbers

const startRound = (game) => {
  console.log('starting round')
  // Pick a person to choose the category
  const users = Object.values(getNonNewUsers(game));
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

  game.state = GAME_STATE.SELECTING_CATEGORY;
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

  io.to(game.id).emit('user-list', getNonNewUsers(game));
}

const getNonNewUsers = (game) => {
  // return game.activeUsers;
  const usersWithoutNew = {};
  Object.entries(game.activeUsers).forEach(([socket, user]) => {
    if (!user.isNew) {
      usersWithoutNew[socket] = user;
    }
  });
  return usersWithoutNew;
}

const getNewUsers = (game) => {
  // return game.activeUsers;
  const newUsers = {};
  Object.entries(game.activeUsers).forEach(([socket, user]) => {
    if (user.isNew) {
      newUsers[socket] = user;
    }
  });
  return newUsers;
}

const totalVotes = (game) => {
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
    if (chameleonUser) {
      chameleonUser.points += 3;
    }
    // Also give anybody who guessed correctly a point
    if (game.votes[game.chameleon.username]) {
      game.votes[game.chameleon.username].forEach((voter) => {
        const user = getUserItemForUsername(game, voter);
        if (user) {
          user.points += 1;
        }
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
        if (user) {
          user.points += 1;
        }
      });
      win = true;
    } else {
      // Give the chameleon three points as they evaded
      const chameleonUser = getUserItemForUsername(game, game.chameleon.username);
      if (chameleonUser) {
        chameleonUser.points += 3;
      }
      // Also give anybody who guessed correctly a point
      if (game.votes[game.chameleon.username]) {
        game.votes[game.chameleon.username].forEach((voter) => {
          const user = getUserItemForUsername(game, voter);
          if (user) {
            user.points += 1;
          }
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

  // Mark any 'new' users as not-new
  Object.entries(getNewUsers(game)).forEach(([socket,]) => {
    game.activeUsers[socket].isNew = false;
  });

  // Clean up votes
  game.votes = {};
  game.totalVotes = 0;
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
        state: 'waiting'
      };
    }

    game = games[gameId];
    let user;
    // Inherit a cached user if it exists
    if (game.cachedUsers[username]) {
      user = {...game.cachedUsers[username], isNew: false};
      delete game.cachedUsers[username];
    } else {
      user = {username: username, ready: false, points: 0, isNew: !!game.inProgress};
    }

    // Delete any users with the same username
    Object.entries(game.activeUsers).forEach((socket, user) => {
      if (user.username === username) {
        io.sockets.sockets[socket].disconnect();
      }
    });

    game.activeUsers[socket.id] = user;

    socket.join(gameId);
    updateUsers(game);
  });

  socket.on('user-ready', (checked) => {
    if (!game) {
      return;
    }
    const user = game.activeUsers[socket.id];
    if (!user) {
      return;
    }

    user.ready = !!checked;
    updateUsers(game);

    if (game.inProgress && !user.isNew) {
      console.log('in progress', game.state);
      switch (game.state) {
        case GAME_STATE.SELECTING_CATEGORY:
          socket.emit('start-game', {
            selecting: game.selecting,
            chameleon: game.chameleon,
            starting: game.starting
          });
          break;
        case GAME_STATE.VOTING:
          socket.emit('voting-started');
          break;
        case GAME_STATE.PLAYING:
          console.log('dispatching cat selected event', game.category)
          socket.emit('category-selected', {
            category: game.category,
            chameleon: game.chameleon,
            starting: game.starting,
            selecting: game.selecting
          })
          break;
      }
      return;
    }

    const allUsersReady = Object.values(game.activeUsers).every(user => user.ready);
    if (allUsersReady && Object.values(game.activeUsers).length > 3) {
      console.log('all users are ready lets gooo');
      startRound(game)
    }
  });

  socket.on('start-voting', () => {
    console.log('voting started')
    game.state = GAME_STATE.VOTING;
    io.to(game.id).emit('voting-started');
  })

  socket.on('select-category', (category) => {
    console.log('category chosen', category)
    game.category = category;
    game.state = GAME_STATE.PLAYING;

    io.to(game.id).emit('category-selected', {
      category: game.category,
      chameleon: game.chameleon,
      starting: game.starting,
      selecting: game.selecting
    })
  });

  socket.on('vote-submitted', ({username, vote}) => {
    console.log(`voted submitted by ${username} for ${vote}`);
    if (!game) {
      return;
    }
    if (!game.votes[vote]) {
      game.votes[vote] = [];
    }

    game.totalVotes += 1;
    game.votes[vote].push(username);

    if (game.totalVotes >= Object.values(getNonNewUsers(game)).length) {
      totalVotes(game);
    }
  });

  socket.on('disconnect', () => {
    // Remove the user from the game
    if (!game || !game.activeUsers[socket.id]) {
      return;
    }

    console.log('the user disconnected :(', game.activeUsers[socket.id].username)
    socket.leave(game.id)

    const user = game.activeUsers[socket.id];
    game.cachedUsers[user.username] = game.activeUsers[socket.id];
    delete game.activeUsers[socket.id];
    updateUsers(game);

    if (Object.values(game.activeUsers).length === 0) {
      // Remove the game if there are no users left
      delete games[game.id];
    } else {
      if (!game.inProgress) {
        // Check if everyone remaining is ready, if they are, start the game
        const allUsersReady = Object.values(game.activeUsers).every(user => user.ready);
        if (allUsersReady && Object.values(game.activeUsers).length > 2) {
          console.log('all users are ready lets gooo');
          startRound(game)
        }
      }
      // Check if everyone remaining has voted, if they have, total up the votes
      const remainingUsers = Object.values(getNonNewUsers(game)).filter(user => !user.isNew).map(user => user.username);
      Object.values(game.votes).forEach((voters) => {
        voters.forEach(voter => {
          if (remainingUsers.includes(voter)) {
            const index = remainingUsers.indexOf(voter);
            remainingUsers.splice(index, 1);
          }
        })
      });
      if (remainingUsers.length === 0) {
        console.log('everyone left has voted, totaling up votes')
        totalVotes(game);
      }
    }
  });
});

