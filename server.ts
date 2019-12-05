import dotenv from 'dotenv';
import express from 'express';
import { createServer } from 'http';
import Bundler from 'parcel-bundler';
import request from 'request';
import IO from 'socket.io';
import { auth0Config } from './.auth0-config';
dotenv.config();

const bundler = new Bundler(__dirname + '/src/index.html', {});
const app = express();
const http = createServer(app);
const io = IO(http);

app.use(bundler.middleware());

let clients: { [key: string]: { name: string; id: string } } = {};

io.on('connection', socket => {
	request(
		`https://${auth0Config.domain}/userinfo`,
		{
			json: true,
			headers: {
				Authorization: `Bearer ${socket.handshake.query.token}`,
			},
		},
		(error, response, body) => {
			clients[socket.id] = { name: body.name, id: body.sub };

			io.emit('new-message', { message: `${clients[socket.id].name} se ha conectado` });

			socket.on('new-message', msg => {
				io.emit('new-message', { nick: clients[socket.id].name, message: msg.message });
			});

			socket.on('new-name', msg => {
				request(
					{
						method: 'patch',
						url: `https://${auth0Config.domain}/api/v2/users/${clients[socket.id].id}`,
						json: true,
						headers: {
							Authorization: `Bearer ${process.env.AUTH0_KEY}`,
						},
						body: { name: msg.name },
					},
					(error, response, body) => {
						if (body.error) {
							socket.emit('new-message', { message: `Ocurrió un error al cambiar el nombre, intenta mas tarde.` });
							return;
						}

						const oldName = clients[socket.id].name;
						clients[socket.id].name = msg.name;

						io.emit('new-message', { message: `${oldName} es ahora ${msg.name}` });
					}
				);
			});

			socket.on('disconnect', () => {
				const nick = clients[socket.id].name;
				const { [socket.id]: disconnected, ...connectedClients } = clients;
				clients = connectedClients;

				io.emit('new-message', { message: `${nick} se ha desconectado` });
			});
		}
	);
});

http.listen(3000, function() {
	console.log('server running');
});
