import React from 'react';

function ReadyScreen({users, username, onToggleCheck}) {
  const [isReady, setIsReady] = React.useState(false);

  React.useEffect(() => {
    onToggleCheck(isReady);
  }, [isReady]);

  return (
    <div className="ReadyScreen">
      <h1>Ready Screen</h1>
      Welcome, <strong>{username}</strong><br /><br />
      {!isReady && <button onClick={() => setIsReady(true)}>Ready</button>}
      {isReady && <button onClick={() => setIsReady(false)}>Cancel</button>}
    </div>
  );
}

export default ReadyScreen;
