import {createConnection, isIP, Socket} from 'net';
import {createHandshakePacket, createPingPacket} from './minecraftPackets';
import {Err, IResult, Ok} from 'mharj-result';
import {IAddress, IHandshakeData, IMinecraftData} from './interfaces';
import {PacketDecoder} from './PacketDecoder';
import {srvRecord} from './dnsSrv';

/**
 * Options for ping
 * @interface Options
 * @property {number=} timeout timeout in milliseconds
 */
interface Options {
	/** timeout in milliseconds */
	timeout?: number;
}

/**
 * Check SRV record and return hostname and port (IAddress)
 * @param {string} hostname
 * @returns {Promise<IAddress | undefined>} Promise that resolves to IAddress or undefined
 */
async function checkSrvRecord(hostname: string): Promise<IAddress | undefined> {
	if (isIP(hostname) !== 0) {
		return undefined;
	}
	const dnsSrvEntry = await srvRecord(`_minecraft._tcp.${hostname}`);
	if (!dnsSrvEntry) {
		return undefined;
	}
	return {
		hostname: dnsSrvEntry.name,
		port: dnsSrvEntry.port,
	};
}

/**
 * ping with URI
 * @param {string | URL | Promise<string | URL>} uri minecraft://server[:port]
 * @param {Options=} options options
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
 * ping with URI, return result object
 * @param {string | URL | Promise<string | URL>} uri minecraft://server[:port]
 * @param {Options=} options options
 * @return {Promise<IResult<IMinecraftData>>}
 */
export async function pingUriResult(uri: string | URL | Promise<string | URL>, options: Options = {}): Promise<IResult<IMinecraftData>> {
	try {
		return new Ok(await pingUri(uri, options));
	} catch (err) {
		return new Err(err);
	}
}

/**
 * ping with hostname and port
 * @param {string=} hostname hostname (defaults 'localhost')
 * @param {number=} port port number (defaults 25565)
 * @param {Options=} options options
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

/**
 * ping with hostname and port, return result object
 * @param {string=} hostname hostname (defaults 'localhost')
 * @param {number=} port port number (defaults 25565)
 * @param {Options=} options options
 * @returns {Promise<IResult<IMinecraftData>>}
 */
export async function pingResult(
	hostname: string | Promise<string> = 'localhost',
	port: number | Promise<number> = 25565,
	options: Options = {},
): Promise<IResult<IMinecraftData>> {
	try {
		return new Ok(await ping(hostname, port, options));
	} catch (err) {
		return new Err(err);
	}
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
			socket.pipe(packetDecoder); // attach decoder
			packetDecoder.once('error', (error) => handleError(error, socket));
			// send handshake
			socket.write(createHandshakePacket(address));
			// wait for handshake data
			const handshakeData = await packetDecoder.oncePromise<IHandshakeData>('handshake');
			// send ping
			socket.write(createPingPacket(BigInt(Date.now())));
			// wait for pong
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
