import {Err, Ok, Result} from 'mharj-result';
import {resolveSrv, SrvRecord} from 'dns';

/**
 * Resolves the SRV records for the given service name.
 * @param {string} srv The service name to resolve.
 * @returns {Promise<Result<SrvRecord[]>>} A promise of Result that resolves to an array of SRV records.
 */
export function srvRecordsResult(srv: string): Promise<Result<SrvRecord[]>> {
	return new Promise((resolve) => {
		resolveSrv(srv, (error, result) => {
			if (error) {
				resolve(Err(error));
			} else {
				resolve(Ok(result));
			}
		});
	});
}

/**
 * Resolves the first SRV record for the given service name.
 * @param {string} srv The service name to resolve.
 * @returns {Promise<Result<SrvRecord>>} A promise or Result that resolves to the first SRV record, or undefined if no records were found.
 */
export async function srvRecordResult(srv: string): Promise<Result<SrvRecord>> {
	const res = await srvRecordsResult(srv);
	if (res.isErr()) {
		return Err(res.err());
	} else {
		return Ok(res.unwrap()[0]);
	}
}
