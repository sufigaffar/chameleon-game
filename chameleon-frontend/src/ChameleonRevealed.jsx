import React from 'react';

function ChameleonRevealed({chameleon, wasWin, goToReadyScreen}) {
  React.useEffect(() => {
    setTimeout(() => {
      goToReadyScreen();
    }, 5000);
  }, []);

  return (
    <>
      {wasWin && (
        <h2>{chameleon} was identified correctly as the chameleon :)</h2>
      )}
      {!wasWin && (
        <h2>{chameleon} was not identified as the chameleon! :(</h2>
      )}
    </>
  )
}

export default ChameleonRevealed;
