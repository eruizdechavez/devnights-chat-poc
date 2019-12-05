import createAuth0Client from '@auth0/auth0-spa-js';
import Auth0Client from '@auth0/auth0-spa-js/dist/typings/Auth0Client';
import React, { Component } from 'react';
import { render } from 'react-dom';
import io from 'socket.io-client';
import { auth0Config } from '../.auth0-config';

interface Message {
	nick: string;
	message: string;
}

interface AppState {
	auth0: Auth0Client;
	nick: string;
	isAuthenticated: boolean;
	user: {};
}

class App extends Component<{}, AppState> {
	constructor(props) {
		super(props);

		this.state = {
			auth0: {} as Auth0Client,
			isAuthenticated: false,
			nick: '',
			user: {},
		};
	}

	componentDidMount = async () => {
		const auth0 = await createAuth0Client(auth0Config);
		this.setState({ auth0 });

		const isAuthenticated = await auth0.isAuthenticated();

		if (isAuthenticated) {
			this.userIsAuthenticated();
		} else {
			this.userIsNotAuthenticated();
		}
	};

	userIsAuthenticated = async () => {
		const user = await this.state.auth0.getUser();
		this.setState({ nick: user.nickname, isAuthenticated: true, user });
	};

	userIsNotAuthenticated = async () => {
		const query = window.location.search;
		if (query.includes('code=') && query.includes('state=')) {
			await this.state.auth0.handleRedirectCallback();
		} else {
			this.state.auth0.loginWithRedirect({
				redirect_uri: window.location.origin,
			});
		}
	};

	onLogout() {
		this.state.auth0.logout({
			returnTo: window.location.origin,
		});
	}

	render() {
		return this.state.isAuthenticated ? (
			<MessageLog nick={this.state.nick} auth0={this.state.auth0} logout={() => this.onLogout()} />
		) : (
			<LoadingScreen />
		);
	}
}

interface MessageLogProps {
	auth0: Auth0Client;
	nick: string;
	logout: () => void;
}

class MessageLog extends Component<MessageLogProps, { messages: Message[] }> {
	socket: SocketIOClient.Socket;

	constructor(props) {
		super(props);
		this.state = { messages: [] };
	}

	componentDidMount = async () => {
		const token = await this.props.auth0.getTokenSilently();

		this.socket = io.connect({
			query: `token=${token}`,
		});
		this.socket.on('new-message', (message: Message) => this.addMessage(message));
	};

	addMessage(message: Message) {
		this.setState({ messages: this.state.messages.concat(message) });

		const log = document.querySelector('.message-log');
		setTimeout(() => {
			log.scrollTo(0, log.scrollHeight);
		}, 100);
	}

	onNewMessage(event: React.KeyboardEvent) {
		if (event.key !== 'Enter') {
			return;
		}

		const input = event.target as HTMLInputElement;
		const value = input.value;

		const handled = this.handleSlashCommand(value);

		if (!handled) {
			const message: Message = {
				nick: this.props.nick,
				message: value,
			};

			this.socket.emit('new-message', message);
		}

		input.value = '';
	}

	handleSlashCommand(message: string): boolean {
		let handled = true;

		if (message[0] === '/') {
			const [command, ...params] = message.split(' ');

			switch (command) {
				case '/logout':
					this.props.logout();
					break;

				case '/name':
					this.socket.emit('new-name', { name: params.join(' ') });
					break;

				default:
					this.addMessage({ nick: null, message: `${command}: unknown command` });
					break;
			}
		} else {
			handled = false;
		}

		return handled;
	}

	render() {
		const serverMessage = {
			fontStyle: 'italic',
			color: 'grey',
		};

		return (
			<div className='app'>
				<div className='message-log'>
					{this.state.messages.map((message, idx) => (
						<div key={idx} className='message'>
							{message.nick && <span className='message__nick'>{message.nick}</span>}
							<span className='message__message' style={!message.nick ? serverMessage : {}}>
								{message.message}
							</span>
						</div>
					))}
				</div>
				<input
					type='text'
					className='message-input'
					placeholder='Escribe tu mensaje y presiona Enter'
					onKeyPress={event => this.onNewMessage(event)}
					autoFocus
				/>
			</div>
		);
	}
}

class LoadingScreen extends Component {
	render() {
		return (
			<div className='login'>
				<span className='login__span'>Cargando ... 🤔</span>
			</div>
		);
	}
}

render(<App />, document.querySelector('#root'));
