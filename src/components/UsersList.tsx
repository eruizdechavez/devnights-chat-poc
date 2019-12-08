import React, { Component } from 'react';

interface Users {
	[key: string]: {
		name: string;
		id: string;
	};
}

export class UsersList extends Component<{ users: Users }> {
	render() {
		return (
			<ul className='users-list'>
				{Object.values(this.props.users).map(user => (
					<li key={user.id}>{user.name}</li>
				))}
			</ul>
		);
	}
}
