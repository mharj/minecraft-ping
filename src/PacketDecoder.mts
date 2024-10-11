import {Writable, type WritableOptions} from 'stream';
import {MinecraftPackageType} from './minecraftPackets.mjs';
import varInt from 'varint';

export interface IPacketHeader {
	id: MinecraftPackageType;
	length: number;
	offset: number;
}

export class PacketDecoder extends Writable {
	private packetInfo: IPacketHeader | undefined;
	private buffer: Buffer;

	constructor(options?: WritableOptions) {
		super(options);
		this.buffer = Buffer.alloc(0);
	}

	/**
	 * Promise to wait specific packet to be received
	 */
	public oncePromise<T>(event: string): Promise<T> {
		return new Promise((resolve) => {
			this.once(event, resolve);
		});
	}

	public _write(chunk: Buffer, _encoding: BufferEncoding, callback: (error?: Error | null) => void): void {
		if (!this.packetInfo) {
			this.packetInfo = this.decodeHeader(chunk);
		}
		this.buffer = Buffer.concat([this.buffer, chunk]);

		if (this.buffer.length < this.packetInfo.length) {
			// do we still need to read more?
			return callback();
		}
		if (this.buffer.length > this.packetInfo.length) {
			return callback(new Error('we did overrun expected data size!'));
		}

		try {
			switch (this.packetInfo.id) {
				case MinecraftPackageType.HANDSHAKE: {
					this.emit('handshake', this.decodeHandshake(this.getPayload(this.packetInfo, this.buffer)));
					break;
				}
				case MinecraftPackageType.PING: {
					this.emit('pong', this.decodePong(this.getPayload(this.packetInfo, this.buffer)));
					break;
				}
				default:
					// eslint-disable-next-line @typescript-eslint/restrict-template-expressions
					this.emit('error', new Error(`Unknown packet id: ${this.packetInfo.id}`));
			}

			this.buffer = Buffer.alloc(0);
			this.packetInfo = undefined;
		} catch (err) {
			this.emit('error', err);
		}
		callback();
	}

	private decodeHeader(buffer: Buffer): IPacketHeader {
		const length = varInt.decode(buffer);
		return {
			id: buffer.readUInt8(varInt.encodingLength(length)),
			length: length + varInt.encodingLength(length),
			offset: varInt.encodingLength(length) + 1,
		};
	}

	private getPayload(header: IPacketHeader, data: Buffer) {
		return data.subarray(header.offset, data.length);
	}

	/**
	 * Decodes the handshake JSON data
	 */
	private decodeHandshake(buffer: Buffer): Record<string, unknown> {
		const length = varInt.decode(buffer);
		const data = buffer.subarray(varInt.encodingLength(length), varInt.encodingLength(length) + length);
		return JSON.parse(data.toString());
	}

	/**
	 * Decodes the pong data
	 */
	private decodePong(data: Buffer): number {
		const pongData = data.readBigUInt64BE(0);
		return Number(BigInt(Date.now()) - pongData);
	}
}
