import {resolveSrv, SrvRecord} from 'dns';

/**
 * Resolves the SRV records for the given service name.
 * @param {string} srv The service name to resolve.
 * @returns {Promise<SrvRecord[]>} A promise that resolves to an array of SRV records.
 */
export function srvRecords(srv: string): Promise<SrvRecord[]> {
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

/**
 * Resolves the first SRV record for the given service name.
 * @param {string} srv The service name to resolve.
 * @returns {Promise<SrvRecord | undefined>} A promise that resolves to the first SRV record, or undefined if no records were found.
 */
export async function srvRecord(srv: string): Promise<SrvRecord | undefined> {
	return (await srvRecords(srv))[0];
}
