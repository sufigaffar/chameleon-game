import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import React from 'react';

import { io } from 'socket.io-client';
import ChameleonRevealed from "./ChameleonRevealed.jsx";
import Game from "./Game.jsx";
import JoinScreen from "./JoinScreen.jsx";
import ReadyScreen from "./ReadyScreen.jsx";
import UserList from "./UserList.jsx";
import Vote from "./Vote.jsx";
import Voted from "./Voted.jsx";

// "undefined" means the URL will be computed from the `window.location` object
const URL = process.env.NODE_ENV === 'production' ? undefined : 'http://localhost:3000';

// export const socket = io(URL);

const SCREENS = {
  JOIN: 'join',
  READY: 'ready',
  GAME: 'game',
  VOTE: 'vote',
  VOTED: 'voted',
  CHAMELEON_REVEALED: 'chameleon-revealed'
}

function App() {
  const gameId = window.location.pathname.split('/')[1];
  const socket = React.useRef(null);

  const [screen, setScreen] = React.useState(SCREENS.JOIN);
  const [username, setUsername] = React.useState(null);
  const [chameleon, setChameleon] = React.useState(null);
  const [selecting, setSelecting] = React.useState(null);
  const [users, setUsers] = React.useState([]);
  const [selectedCategory, setSelectedCategory] = React.useState(null);
  const [starting, setStarting] = React.useState(null);
  const [wasWin, setWasWin] = React.useState(null);

  if (!gameId) {
    throw Error('Please specify a game ID');
  }

  React.useEffect(() => {
    console.log('connecting')
    socket.current = io(URL);

    return () => {
      console.log('disconnecting')
      socket.current.disconnect()
    };
  }, []);

  const onJoin = (username) => {
    socket.current.emit('new-user', {username, gameId});
    setUsername(username);
    setScreen(SCREENS.READY);
  }

  const onToggleCheck = (checked) => {
    socket.current.emit('user-ready', checked);
  }

  const selectCategory = (category) => {
    socket.current.emit('select-category', category);
  }

  const startVoting = () => {
    socket.current.emit('start-voting');
  }

  const submitVote = (vote) => {
    socket.current.emit('vote-submitted', {username, vote});
    setScreen(SCREENS.VOTED);
  };

  const newRound = () => {
    setChameleon(null);
    setSelecting(null);
    setSelectedCategory(null);
    setStarting(null);
    setWasWin(null);

    setScreen(SCREENS.READY);
  }

  React.useEffect(() => {
    socket.current.on('user-list', (users) => setUsers(users));
    socket.current.on('start-game', ({selecting, chameleon, starting}) => {
      setScreen(SCREENS.GAME);
      setSelecting(selecting.username);
      setChameleon(chameleon.username);
      setStarting(starting.username);
    });
    socket.current.on('category-selected', (category) => {
      setSelectedCategory(category);
    });
    socket.current.on('voting-started', () => {
      setScreen(SCREENS.VOTE);
    });
    socket.current.on('chameleon-revealed', ({chameleon, win}) => {
      setScreen(SCREENS.CHAMELEON_REVEALED);
      setWasWin(win);
    });
  }, []);

  return (
    <>
      {screen === SCREENS.JOIN && <JoinScreen onJoin={onJoin} />}
      {screen === SCREENS.READY &&
        <>
          <ReadyScreen
            onToggleCheck={onToggleCheck}
            username={username}
            users={users}
          />
          <UserList
            users={users}
            username={username}
          />
        </>
      }
      {screen === SCREENS.GAME &&
        <>
          <Game
            username={username}
            chameleon={chameleon}
            selecting={selecting}
            selectCategory={selectCategory}
            selectedCategory={selectedCategory}
            startVoting={startVoting}
            starting={starting}
          />
        </>
      }
      {screen === SCREENS.VOTE && (
        <Vote
          users={users}
          username={username}
          selecting={selecting}
          submitVote={submitVote}
        />
      )}
      {screen === SCREENS.VOTED && (
        <Voted />
      )}
      {screen === SCREENS.CHAMELEON_REVEALED && (
        <ChameleonRevealed
          chameleon={chameleon}
          wasWin={wasWin}
          goToReadyScreen={() => newRound()}
        />
      )}
    </>
  )
}

export default App
