import React, { Component } from 'react';
import { render } from 'react-dom';
import io from 'socket.io-client';

interface Message {
	nick: string;
	message: string;
}

class App extends Component<{}, { nick: string; isLoggedIn: boolean }> {
	constructor(props) {
		super(props);

		this.state = {
			nick: '',
			isLoggedIn: false,
		};
	}

	onLogin(nick: string, event: React.FormEvent) {
		event.preventDefault();
		this.setState({ nick, isLoggedIn: true });
	}

	render() {
		return this.state.isLoggedIn ? (
			<MessageLog nick={this.state.nick} />
		) : (
			<LoginScreen onLogin={this.onLogin.bind(this)} />
		);
	}
}

class MessageLog extends Component<{ nick: string }, { messages: Message[] }> {
	socket: SocketIOClient.Socket;

	constructor(props) {
		super(props);

		this.state = { messages: [] };
		this.socket = io();
		this.socket.on('new-message', (message: Message) => this.addMessage(message));
	}

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
		const message: Message = {
			nick: this.props.nick,
			message: input.value,
		};

		this.socket.emit('new-message', message);
		input.value = '';
	}

	render() {
		return (
			<div className='app'>
				<div className='message-log'>
					{this.state.messages.map((message, idx) => (
						<div key={idx} className='message'>
							<span className='message__nick'>{message.nick}</span>
							<span className='message__message'>{message.message}</span>
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

class LoginScreen extends Component<
	{
		onLogin: (nick: string, event: React.FormEvent) => void;
	},
	{ nick: string }
> {
	constructor(props) {
		super(props);
		this.state = { nick: '' };
	}

	setNick(event: React.ChangeEvent) {
		this.setState({ nick: (event.target as HTMLInputElement).value });
	}

	render() {
		return (
			<div className='login'>
				<form className='login__form' onSubmit={event => this.props.onLogin(this.state.nick, event)}>
					<span className='login__span'>Hola</span>
					<input
						type='text'
						name='nick'
						className='login__input'
						value={this.state.nick}
						onChange={event => this.setNick(event)}
						autoFocus
					/>
					<span className='login__span'>👋🏻!</span>
				</form>
			</div>
		);
	}
}

render(<App />, document.querySelector('#root'));
