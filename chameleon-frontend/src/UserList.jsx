import React from 'react';

function UserList({users, username}) {
  return (
    <div className="UserList">
      <h2>Users</h2>
      {Object.values(users).map((user) => (
        <div key={user.username}>
          {user.username} {user.username === username ? '(You) ' : ''}
          -&nbsp;
          {user.ready ? 'Ready' : 'Not ready'}&nbsp;
          -&nbsp;
          {user.points} pts
        </div>
      ))}
    </div>
  );
}

export default UserList;
