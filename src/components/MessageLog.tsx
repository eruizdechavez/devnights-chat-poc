import React, { Component } from 'react';
import { UsersList } from './UsersList';

export interface Message {
	message: string;
	nick?: string;
	clients?: {};
}

interface MessageLogProps {
	logout: () => void;
	addMessage: (message: Message) => void;
	sendMessage: (text: string) => void;
	changeName: (name: string) => void;
	sendPiP: (file: File) => void;
	messages: Message[];
	users: {};
}

export class MessageLog extends Component<MessageLogProps, { history: string[] }> {
	constructor(props) {
		super(props);
		this.state = { history: [] };
	}

	componentDidUpdate() {
		const messageLog = document.querySelector('.message-log');
		messageLog.scrollTo(0, messageLog.scrollHeight);
	}

	newMessage(event: React.KeyboardEvent) {
		if (event.key !== 'Enter') {
			return;
		}
		const input = event.target as HTMLInputElement;
		const value = input.value;

		if (value === '') {
			return;
		}

		const handled = this.handleSlashCommand(value);

		this.setState({ history: this.state.history.concat(value) });

		if (!handled) {
			this.props.sendMessage(value);
		}

		input.value = '';
	}

	viewMessageHistory(event: React.KeyboardEvent) {
		if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') {
			return;
		}

		const input = event.target as HTMLInputElement;
		const text = input.value;
		const delta = event.key === 'ArrowUp' ? -1 : 1;
		let idx = this.state.history.indexOf(text);

		if (idx === -1) {
			idx = delta === -1 ? this.state.history.length - 1 : 0;
		} else if (idx + delta < 0) {
			idx = this.state.history.length - 1;
		} else if (idx + delta >= this.state.history.length) {
			idx = 0;
		} else {
			idx += delta;
		}

		input.value = this.state.history[idx];
	}

	startPiP() {
		document.querySelector('#pip').dispatchEvent(new MouseEvent('click'));
	}

	sendPiP(event: React.ChangeEvent) {
		const input = event.target as HTMLInputElement;
		const files: FileList = input.files;

		if (files.length === 0) {
			return;
		}

		this.props.sendPiP(files.item(0));
		input.value = '';
	}

	handleSlashCommand(message: string): boolean {
		let handled = message[0] === '/';

		if (handled) {
			const [command, ...params] = message.split(' ');

			switch (command) {
				case '/logout':
					this.props.logout();
					break;

				case '/name':
					this.props.changeName(params.join(' '));
					break;

				case '/pip':
					this.startPiP();
					break;

				default:
					this.props.addMessage({ nick: null, message: `${command}: unknown command` });
					break;
			}
		}

		return handled;
	}

	render() {
		const serverMessage = {
			fontStyle: 'italic',
		};

		return (
			<>
				<div className='message-wrapper'>
					<div className='message-log'>
						{this.props.messages.map((message, idx) => (
							<div key={idx} className='message'>
								{message.nick && <span className='message__nick'>{message.nick}</span>}
								<span className='message__message' style={!message.nick ? serverMessage : {}}>
									{message.message}
								</span>
							</div>
						))}
					</div>
					<UsersList users={this.props.users} />
				</div>
				<input
					type='text'
					className='message-input'
					placeholder='Escribe tu mensaje y presiona Enter'
					onKeyPress={event => this.newMessage(event)}
					onKeyDown={event => this.viewMessageHistory(event)}
					autoFocus
					autoCapitalize='sentences'
					autoCorrect='on'
					spellCheck={true}
				/>
				<input
					type='file'
					name='pip'
					id='pip'
					style={{ display: 'none' }}
					onChange={event => this.sendPiP(event)}
					multiple={false}
					accept='image/*'
				/>
			</>
		);
	}
}
