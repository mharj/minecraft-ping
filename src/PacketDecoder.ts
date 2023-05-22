import internal, {Writable} from 'stream';
import {decode, encodingLength} from 'varint';
import {MinecraftPackageType} from './minecraftPackets';

interface IHeader {
	id: MinecraftPackageType;
	length: number;
	offset: number;
}

export class PacketDecoder extends Writable {
	private packetInfo: IHeader | undefined;
	private buffer: Buffer;

	constructor(options?: internal.WritableOptions | undefined) {
		super(options);
		this.buffer = Buffer.alloc(0);
	}

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

		if (this.packetInfo) {
			if (this.buffer.length < this.packetInfo.length) {
				// do we still need to read more?
				return callback();
			}
			if (this.buffer.length > this.packetInfo.length) {
				return callback(new Error('we did overrun expected data size!'));
			}
		}
		try {
			if (this.packetInfo) {
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
						this.emit('error', new Error('Unknown packet id: ' + this.packetInfo.id));
				}
			}
			this.buffer = Buffer.alloc(0);
			this.packetInfo = undefined;
		} catch (err) {
			this.emit('error', err);
		}
		callback();
	}

	private decodeHeader(buffer: Buffer): IHeader {
		const length = decode(buffer);
		return {
			id: buffer.readUInt8(encodingLength(length)),
			length: length + encodingLength(length),
			offset: encodingLength(length) + 1,
		};
	}

	private getPayload(header: IHeader, data: Buffer) {
		return data.slice(header.offset, data.length);
	}

	private decodeHandshake(buffer: Buffer): Record<string, unknown> {
		const length = decode(buffer);
		const data = buffer.slice(encodingLength(length), encodingLength(length) + length);
		return JSON.parse(data.toString());
	}

	private decodePong(data: Buffer): number {
		const pongData = data.readBigUInt64BE(0);
		return Number(BigInt(Date.now()) - pongData);
	}
}
