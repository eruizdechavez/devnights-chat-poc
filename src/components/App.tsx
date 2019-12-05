import createAuth0Client from '@auth0/auth0-spa-js';
import Auth0Client from '@auth0/auth0-spa-js/dist/typings/Auth0Client';
import React, { Component } from 'react';
import io from 'socket.io-client';
import { auth0Config } from '../../.auth0-config';
import { LoadingScreen } from './LoadingScreen';
import { Message, MessageLog } from './MessageLog';

interface AppState {
	nick: string;
	isAuthenticated: boolean;
	user: {};
	messages: Message[];
}

export class App extends Component<{}, AppState> {
	private auth0: Auth0Client;
	private socket: SocketIOClient.Socket;

	constructor(props) {
		super(props);

		this.state = {
			isAuthenticated: false,
			nick: '',
			user: {},
			messages: [],
		};
	}

	componentDidMount = async () => {
		this.auth0 = await createAuth0Client(auth0Config);

		const isAuthenticated = await this.auth0.isAuthenticated();

		if (isAuthenticated) {
			this.userIsAuthenticated();
		} else {
			this.userIsNotAuthenticated();
		}
	};

	userIsAuthenticated = async () => {
		const user = await this.auth0.getUser();
		const token = await this.auth0.getTokenSilently();

		this.socket = io.connect({ query: `token=${token}` });
		this.socket.on('new-message', this.addMessage.bind(this));
		this.setState({ nick: user.nickname, isAuthenticated: true, user });
	};

	userIsNotAuthenticated = async () => {
		const query = window.location.search;

		if (query.includes('code=') && query.includes('state=')) {
			await this.auth0.handleRedirectCallback();
			this.userIsAuthenticated();
		} else {
			this.auth0.loginWithRedirect({
				redirect_uri: window.location.origin,
			});
		}
	};

	addMessage(message: Message) {
		this.setState({ messages: this.state.messages.concat(message) });
	}

	sendMessage(text: string) {
		const message: Message = {
			nick: this.state.nick,
			message: text,
		};

		this.socket.emit('new-message', message);
	}

	changeName(name: string) {
		this.socket.emit('new-name', { name });
	}

	logout() {
		this.auth0.logout({
			returnTo: window.location.origin,
		});
	}

	render() {
		return this.state.isAuthenticated ? (
			<MessageLog
				logout={this.logout.bind(this)}
				addMessage={this.addMessage.bind(this)}
				sendMessage={this.sendMessage.bind(this)}
				changeName={this.changeName.bind(this)}
				messages={this.state.messages}
			/>
		) : (
			<LoadingScreen />
		);
	}
}
