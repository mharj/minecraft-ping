export interface IAddress {
	hostname: string;
	port: number;
}

/**
 * Server handshake JSON payload
 */
export interface IHandshakeData {
	description: {
		text: string;
		extra?: {
			color?: string;
			text: string;
			bold?: boolean;
			strikethrough?: boolean;
		}[];
	};
	players: {
		online: number;
		max: number;
		sample?: {name: string; id: string}[];
	};
	version: {name: string; protocol: number};
	ping: number;
	modinfo?: {type: string; modList: string[]};
	favicon?: string;
}

export interface IMinecraftData extends IHandshakeData {
	ping: number;
}
