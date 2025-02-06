import {resolveSrv, type SrvRecord} from 'dns';
import {Err, type IResult, Ok} from '@luolapeikko/result-option';

function assertAtLeastOne<T>(data: T[]): asserts data is [T, ...T[]] {
	if (data.length === 0) {
		throw new Error('Expected at least one element, got none');
	}
}

/**
 * Resolves the SRV records for the given service name.
 * @param {string} srv The service name to resolve.
 * @returns {Promise<Result<SrvRecord[]>>} A promise of Result that resolves to an array of SRV records.
 * @example
 * const res = await srvRecordsResult('_minecraft._tcp.example.com');
 * if (res.isOk) {
 *   console.log(res.ok()); // [ { name: 'example.com', port: 25565, priority: 0, weight: 5 } ]
 * } else {
 *   console.error(res.err());
 * }
 */
export function srvRecordsResult(srv: string): Promise<IResult<[SrvRecord, ...SrvRecord[]], NodeJS.ErrnoException>> {
	return new Promise((resolve) => {
		resolveSrv(srv, (error, result) => {
			if (error) {
				resolve(Err(error));
			} else {
				assertAtLeastOne(result); // This is safe because resolveSrv will always return at least one element
				resolve(Ok(result));
			}
		});
	});
}

/**
 * Resolves the first SRV record for the given service name.
 * @param {string} srv The service name to resolve.
 * @returns {Promise<Result<SrvRecord>>} A promise of Result that resolves to the first SRV record, or Err if no records were found.
 * @example
 * const res = await srvRecordResult('_minecraft._tcp.example.com');
 * if (res.isOk) {
 *   console.log(res.ok()); // { name: 'example.com', port: 25565, priority: 0, weight: 5 }
 * } else {
 *   console.error(res.err());
 * }
 */
export async function srvRecordResult(srv: string): Promise<IResult<SrvRecord, NodeJS.ErrnoException>> {
	const res = await srvRecordsResult(srv);
	if (res.isOk) {
		return Ok(res.ok()[0]);
	} else {
		return Err(res.err());
	}
}
