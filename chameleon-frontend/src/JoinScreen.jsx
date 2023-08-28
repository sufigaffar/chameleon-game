import React from 'react';

function JoinScreen(props) {
  const [username, setUsername] = React.useState('');

  const handleOnKeyDown = (e) => {
    if(e.key === 'Enter'){
      props.onJoin(username);
    }
  }

  return (
    <>
      <h1>Join</h1>
      <input type="text" onChange={(e) => setUsername(e.target.value)} onKeyDown={handleOnKeyDown} /><br /><br />
      <button onClick={() => props.onJoin(username)} disabled={!username}>Join</button>
    </>
  );
}

export default JoinScreen;
