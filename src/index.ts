import {resolveSrv, SrvRecord} from 'dns';
import {createConnection, isIP, Socket} from 'net';
import {encode, encodingLength} from 'varint';
import {IAddress, IHandshakeData, IMinecraftData} from './interfaces';
import {PacketDecoder} from './PacketDecoder';

function resolveSrvPromise(srv: string): Promise<SrvRecord[]> {
	return new Promise((resolve) => {
		resolveSrv(srv, (error, result) => {
			if (error) {
				// always error if not found
				resolve([]);
			} else {
				resolve(result);
			}
		});
	});
}

const PROTOCOL_VERSION = 736; // Minecraft 1.16.1

interface Options {
	/** timeout in milliseconds */
	timeout?: number;
}

/**
 * ping with URI
 * @param {string} uri minecraft://server[:port]
 * @return {Promise<IMinecraftData>}
 */
export async function pingUri(uri: string | URL | Promise<string | URL>, options: Options = {}): Promise<IMinecraftData> {
	const {protocol, hostname, port} = new URL(await uri);
	if (!hostname || !protocol || protocol !== 'minecraft:') {
		throw new TypeError('not correct minecraft URI');
	}
	return ping(hostname, port ? parseInt(port, 10) : undefined, options);
}

/**
 * ping with hostname and port
 * @param {string=} hostname hostname
 * @param {number=} port port number (defaults 25565)
 * @returns {Promise<IMinecraftData>}
 */
export async function ping(
	hostname: string | Promise<string> = 'localhost',
	port: number | Promise<number> = 25565,
	options: Options = {},
): Promise<IMinecraftData> {
	let address = await checkSrvRecord(await hostname);
	if (!address) {
		address = {hostname: await hostname, port: await port};
	}
	return openConnection(address, options);
}

async function checkSrvRecord(hostname: string): Promise<IAddress | undefined> {
	if (isIP(hostname) !== 0) {
		return undefined;
	}
	const srvRecords = await resolveSrvPromise(`_minecraft._tcp.${hostname}`);
	if (srvRecords.length === 0) {
		return undefined;
	}
	return {
		hostname: srvRecords[0].name,
		port: srvRecords[0].port,
	};
}

function openConnection(address: IAddress, options: Options): Promise<IMinecraftData> {
	let timeout: ReturnType<typeof setTimeout> | undefined;
	return new Promise((resolve, reject) => {
		const handleError = (error: Error, thisSocket: Socket) => {
			thisSocket.destroy();
			if (timeout) {
				clearTimeout(timeout);
			}
			reject(error);
		};
		const socket = createConnection(address.port, address.hostname, async () => {
			const packetDecoder = new PacketDecoder();
			socket.pipe(packetDecoder);
			packetDecoder.once('error', (error) => handleError(error, socket));
			// handshake
			socket.write(createHandshakePacket(address));
			const handshakeData = await packetDecoder.oncePromise<IHandshakeData>('handshake');
			// ping
			socket.write(createPingPacket(BigInt(Date.now())));
			const pingData = await packetDecoder.oncePromise<number>('pong');
			if (timeout) {
				clearTimeout(timeout);
			}
			socket.end();

			resolve({
				...handshakeData,
				ping: pingData,
			});
		});
		// Destroy on error
		socket.once('error', (error) => handleError(error, socket));
		// Destroy on timeout
		socket.once('timeout', () => {
			socket.destroy();
			if (timeout) {
				clearTimeout(timeout);
			}
			reject(new Error('Timed out'));
		});
		// Packet timeout
		const timeoutValue = options?.timeout || 10000;
		timeout = setTimeout(() => {
			socket.end();
			reject(new Error(`Timed out (${timeoutValue} ms)`));
		}, timeoutValue);
	});
}

function createHandshakePacket(address: IAddress): Buffer {
	const portBuffer = Buffer.allocUnsafe(2);
	portBuffer.writeUInt16BE(address.port, 0);
	// Return hansdhake packet with request packet
	return Buffer.concat([
		createPacket(
			0,
			Buffer.concat([
				Buffer.from(encode(PROTOCOL_VERSION)),
				Buffer.from(encode(address.hostname.length)),
				Buffer.from(address.hostname, 'utf8'),
				portBuffer,
				Buffer.from(encode(1)),
			]),
		),
		createPacket(0, Buffer.alloc(0)),
	]);
}

function createPingPacket(timestamp: bigint) {
	const pingBuffer = Buffer.allocUnsafe(8);
	pingBuffer.writeBigUInt64BE(timestamp);
	return createPacket(1, pingBuffer);
}

function createPacket(packetId: number, data: Buffer): Buffer {
	return Buffer.concat([Buffer.from(encode(encodingLength(packetId) + data.length)), Buffer.from(encode(packetId)), data]);
}
