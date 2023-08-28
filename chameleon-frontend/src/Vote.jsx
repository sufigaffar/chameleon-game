import React from 'react';

function Vote({users, username, selecting, submitVote}) {
  const options = Object.values(users).filter(user => user.username !== username);

  return (
    <>
      <h2>Vote for who you think is the chameleon</h2>
      {options.map(user => (
        <div key={user.username} style={{marginBottom: '5px'}}>
          <button onClick={() => submitVote(user.username)}>{user.username}</button>
        </div>
      ))}
    </>
  )

}

export default Vote;
