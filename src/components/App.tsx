import createAuth0Client from '@auth0/auth0-spa-js';
import Auth0Client from '@auth0/auth0-spa-js/dist/typings/Auth0Client';
import React, { Component } from 'react';
import io from 'socket.io-client';
import { client_id, domain } from '../../.auth0-client';
import { LoadingScreen } from './LoadingScreen';
import { Message, MessageLog } from './MessageLog';

interface AppState {
	nick: string;
	isAuthenticated: boolean;
	user: {};
	messages: Message[];
	clients?: {};
	pip: '';
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
			clients: {},
			pip: '',
		};
	}

	componentDidMount = async () => {
		this.auth0 = await createAuth0Client({ domain, client_id });

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
		this.socket.on('message', this.addMessage.bind(this));
		this.socket.on('clients', this.updateClients.bind(this));
		this.socket.on('pip', this.showPiP.bind(this));
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
		this.setState({
			messages: this.state.messages.concat(message),
		});

		if (message.clients) {
			this.updateClients(message);
		}
	}

	updateClients(message: Message) {
		this.setState({
			clients: message.clients,
		});
	}

	sendMessage(text: string) {
		const message: Message = {
			nick: this.state.nick,
			message: text,
		};

		this.socket.emit('message', message);
	}

	changeName(name: string) {
		this.socket.emit('name', { name });
	}

	logout() {
		this.auth0.logout({
			returnTo: window.location.origin,
		});
	}

	sendPiP(file: File) {
		const reader = new FileReader();

		reader.readAsDataURL(file);

		reader.onload = () => {
			this.socket.emit('pip', { pip: reader.result });
		};

		reader.onerror = error => {
			console.log('Error: ', error);
		};
	}

	showPiP({ pip }: any) {
		this.setState({ pip });
		setTimeout(() => {
			this.setState({ pip: '' });
		}, 5000);
	}

	render() {
		return this.state.isAuthenticated ? (
			<>
				<MessageLog
					logout={this.logout.bind(this)}
					addMessage={this.addMessage.bind(this)}
					sendMessage={this.sendMessage.bind(this)}
					changeName={this.changeName.bind(this)}
					sendPiP={this.sendPiP.bind(this)}
					messages={this.state.messages}
					users={this.state.clients}
				/>
				{this.state.pip && <img className='pip' src={this.state.pip} />}
			</>
		) : (
			<LoadingScreen />
		);
	}
}
