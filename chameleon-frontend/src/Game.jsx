import React from 'react';
function Game({ chameleon, selecting, username, selectCategory, selectedCategory, startVoting, starting }) {
  const [category, setCategory] = React.useState(null);

  const handleOnKeyDown = (e) => {
    if(e.key === 'Enter'){
      selectCategory(category);
    }
  }

  return (
    <>
      {!selectedCategory && selecting !== username && (
        <>
          <h2>Waiting for the game master to choose a category</h2>
        </>
      )}
      {selectedCategory && chameleon === username && (
        <>
          <p><strong>{starting}</strong> starts! Go clockwise round the group</p>
          <h2>You are the chameleon!</h2>
          <p>Try to come up with an answer that fits with what the others are saying</p>
        </>
      )}
      {selectedCategory && selecting !== username && chameleon !== username && (
        <>
          <p><strong>{starting}</strong> starts! Go clockwise round the table</p>
          <h2>The category is: {selectedCategory}</h2>
        </>
      )}
      {selectedCategory && selecting === username && chameleon !== username && (
        <>
          <p><strong>{starting}</strong> starts! Go clockwise round the table</p>
          <h2>You have selected the category:<br />{category}</h2>
          <p>Once the round has finished, click the button below to commence voted</p>
          <button onClick={() => startVoting()}>Start voting</button>
        </>
      )}
      {!selectedCategory && selecting === username && chameleon !== username && (
        <>
          <h2>You are the game master!</h2>
          <p>Come up with a category</p>
          <input type="text" onKeyDown={handleOnKeyDown} onChange={(e) => setCategory(e.target.value)} />
          <button onClick={() => selectCategory(category)} disabled={!category}>Choose</button>
        </>
      )}
    </>
  );
}

export default Game;
